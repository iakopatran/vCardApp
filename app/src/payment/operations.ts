import * as z from 'zod';
import type { GenerateCheckoutSession, GetCustomerPortalUrl, VerifyPayment } from 'wasp/server/operations';
import { PaymentPlanId, paymentPlans } from '../payment/plans';
import { paymentProcessor } from './paymentProcessor';
import { HttpError } from 'wasp/server';
import { ensureArgsSchemaOrThrowHttpError } from '../server/validation';
import { stripe } from './stripe/stripeClient';

export type CheckoutSession = {
  sessionUrl: string | null;
  sessionId: string;
};

const generateCheckoutSessionSchema = z.nativeEnum(PaymentPlanId);

type GenerateCheckoutSessionInput = z.infer<typeof generateCheckoutSessionSchema>;

export const generateCheckoutSession: GenerateCheckoutSession<
  GenerateCheckoutSessionInput,
  CheckoutSession
> = async (rawPaymentPlanId, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Only authenticated users are allowed to perform this operation');
  }

  const paymentPlanId = ensureArgsSchemaOrThrowHttpError(generateCheckoutSessionSchema, rawPaymentPlanId);
  const userId = context.user.id;
  const userEmail = context.user.email;
  if (!userEmail) {
    throw new HttpError(403, 'User needs an email to make a payment.');
  }

  const paymentPlan = paymentPlans[paymentPlanId];
  const { session } = await paymentProcessor.createCheckoutSession({
    userId,
    userEmail,
    paymentPlan,
    prismaUserDelegate: context.entities.User,
  });

  return {
    sessionUrl: session.url,
    sessionId: session.id,
  };
};

export const getCustomerPortalUrl: GetCustomerPortalUrl<void, string | null> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Only authenticated users are allowed to perform this operation');
  }

  return paymentProcessor.fetchCustomerPortalUrl({
    userId: context.user.id,
    prismaUserDelegate: context.entities.User,
  });
};

// --- Verify Payment & Award Credits ---

const verifyPaymentSchema = z.object({
  sessionId: z.string().min(1),
});

type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;

export type VerifyPaymentResult = {
  creditsAwarded: number;
  newBalance: number;
};

export const verifyPayment: VerifyPayment<VerifyPaymentInput, VerifyPaymentResult> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Only authenticated users are allowed to perform this operation');
  }

  const { sessionId } = ensureArgsSchemaOrThrowHttpError(verifyPaymentSchema, rawArgs);

  // Idempotency: check if this session was already processed
  const existingPayment = await context.entities.Payment.findUnique({
    where: { stripeSessionId: sessionId },
  });

  if (existingPayment) {
    // Already processed - return the existing result without double-awarding
    const user = await context.entities.User.findUnique({
      where: { id: context.user.id },
      select: { credits: true },
    });
    return {
      creditsAwarded: existingPayment.credits,
      newBalance: user?.credits ?? 0,
    };
  }

  // Retrieve the checkout session from Stripe
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });
  } catch (error) {
    console.error('Error retrieving Stripe session:', error);
    throw new HttpError(400, 'Invalid or expired payment session');
  }

  // Verify payment was successful
  if (session.payment_status !== 'paid') {
    throw new HttpError(400, 'Payment has not been completed');
  }

  // Determine credits from the plan
  const lineItems = session.line_items;
  if (!lineItems || lineItems.data.length === 0) {
    throw new HttpError(400, 'No items found in checkout session');
  }

  const priceId = lineItems.data[0]?.price?.id;
  if (!priceId) {
    throw new HttpError(400, 'Unable to determine price from checkout session');
  }

  // Find the matching plan and get credit amount
  const matchingPlanId = Object.values(PaymentPlanId).find(
    (planId) => paymentPlans[planId].getPaymentProcessorPlanId() === priceId
  );

  if (!matchingPlanId) {
    throw new HttpError(400, `No plan found matching price ${priceId}`);
  }

  const plan = paymentPlans[matchingPlanId];
  const creditsToAward = plan.effect.amount;
  const amountPaid = session.amount_total ? session.amount_total / 100 : 0; // Convert cents to dollars

  // Record the payment and award credits atomically
  const [payment, updatedUser] = await Promise.all([
    context.entities.Payment.create({
      data: {
        userId: context.user.id,
        stripeSessionId: sessionId,
        amount: amountPaid,
        credits: creditsToAward,
        status: 'completed',
      },
    }),
    context.entities.User.update({
      where: { id: context.user.id },
      data: {
        credits: { increment: creditsToAward },
        datePaid: new Date(),
        totalSpent: { increment: amountPaid },
      },
    }),
  ]);

  return {
    creditsAwarded: creditsToAward,
    newBalance: updatedUser.credits,
  };
};
