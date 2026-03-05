import { type MiddlewareConfigFn, HttpError } from 'wasp/server';
import { type PaymentsWebhook } from 'wasp/server/api';
import { type PrismaClient } from '@prisma/client';
import express from 'express';
import type { Stripe } from 'stripe';
import { stripe } from './stripeClient';
import { paymentPlans, PaymentPlanId, type PaymentPlanEffect } from '../plans';
import { updateUserStripePaymentDetails } from './paymentDetails';
import { assertUnreachable } from '../../shared/utils';
import { requireNodeEnvVar } from '../../server/utils';
import {
  parseWebhookPayload,
  type SessionCompletedData,
} from './webhookPayload';
import { UnhandledWebhookEventError } from '../errors';

export const stripeWebhook: PaymentsWebhook = async (request, response, context) => {
  try {
    const rawStripeEvent = constructStripeEvent(request);
    const { eventName, data } = await parseWebhookPayload(rawStripeEvent);
    const prismaUserDelegate = context.entities.User;
    switch (eventName) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(data, prismaUserDelegate);
        break;
      default:
        // If you'd like to handle more events, you can add more cases above.
        // When deploying your app, you configure your webhook in the Stripe dashboard to only send the events that you're
        // handling above and that are necessary for the functioning of your app. See: https://docs.opensaas.sh/guides/deploying/#setting-up-your-stripe-webhook
        // In development, it is likely that you will receive other events that you are not handling, and that's fine. These can be ignored without any issues.
        assertUnreachable(eventName);
    }
    return response.json({ received: true }); // Stripe expects a 200 response to acknowledge receipt of the webhook
  } catch (err) {
    if (err instanceof UnhandledWebhookEventError) {
      console.error(err.message);
      return response.status(422).json({ error: err.message });
    }

    console.error('Webhook error:', err);
    if (err instanceof HttpError) {
      return response.status(err.statusCode).json({ error: err.message });
    } else {
      return response.status(400).json({ error: 'Error processing Stripe webhook event' });
    }
  }
};

function constructStripeEvent(request: express.Request): Stripe.Event {
  try {
    const secret = requireNodeEnvVar('STRIPE_WEBHOOK_SECRET');
    const sig = request.headers['stripe-signature'];
    if (!sig) {
      throw new HttpError(400, 'Stripe webhook signature not provided');
    }
    return stripe.webhooks.constructEvent(request.body, sig, secret);
  } catch (err) {
    throw new HttpError(500, 'Error constructing Stripe webhook event');
  }
}

export const stripeMiddlewareConfigFn: MiddlewareConfigFn = (middlewareConfig) => {
  // We need to delete the default 'express.json' middleware and replace it with 'express.raw' middleware
  // because webhook data in the body of the request as raw JSON, not as JSON in the body of the request.
  middlewareConfig.delete('express.json');
  middlewareConfig.set('express.raw', express.raw({ type: 'application/json' }));
  return middlewareConfig;
};

// Here we only update the user's payment details, and confirm credits because Stripe does not send invoices for one-time payments.
// NOTE: If you're accepting async payment methods like bank transfers or SEPA and not just card payments
// which are synchronous, checkout session completed could potentially result in a pending payment.
// If so, use the checkout.session.async_payment_succeeded event to confirm the payment.
async function handleCheckoutSessionCompleted(
  session: SessionCompletedData,
  prismaUserDelegate: PrismaClient['user']
) {
  const isSuccessfulOneTimePayment = session.mode === 'payment' && session.payment_status === 'paid';
  if (isSuccessfulOneTimePayment) {
    await saveSuccessfulOneTimePayment(session, prismaUserDelegate);
  }
}

async function saveSuccessfulOneTimePayment(
  session: SessionCompletedData,
  prismaUserDelegate: PrismaClient['user']
) {
  const userStripeId = session.customer;
  const lineItems = await getCheckoutLineItemsBySessionId(session.id);
  const lineItemPriceId = extractPriceId(lineItems);
  const planId = getPlanIdByPriceId(lineItemPriceId);
  const plan = paymentPlans[planId];
  const numOfCreditsPurchased = getCreditsFromPlanEffect(plan.effect);
  // Convert from cents to dollars
  const amountPaid = session.amount_total ? session.amount_total / 100 : undefined;
  return updateUserStripePaymentDetails(
    { userStripeId, numOfCreditsPurchased, datePaid: new Date(), amountPaid },
    prismaUserDelegate
  );
}

async function getCheckoutLineItemsBySessionId(sessionId: string) {
  const { line_items } = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items'],
  });
  if (!line_items) {
    throw new HttpError(400, 'No line items found in checkout session');
  }
  return line_items;
}

// We only expect one line item, but if you set up a product with multiple prices, you should change this function to handle them.
function extractPriceId(items: Stripe.ApiList<Stripe.LineItem>): string {
  if (items.data.length === 0) {
    throw new HttpError(400, 'No items in stripe event object');
  }
  if (items.data.length > 1) {
    throw new HttpError(400, 'More than one item in stripe event object');
  }
  const item = items.data[0];

  if ('price' in item && item.price?.id) {
    return item.price.id;
  }
  throw new HttpError(400, 'Unable to extract price id from item');
}

function getPlanIdByPriceId(priceId: string): PaymentPlanId {
  const planId = Object.values(PaymentPlanId).find(
    (planId) => paymentPlans[planId].getPaymentProcessorPlanId() === priceId
  );
  if (!planId) {
    throw new Error(`No plan with Stripe price id ${priceId}`);
  }
  return planId;
}

function getCreditsFromPlanEffect(planEffect: PaymentPlanEffect): number {
  return planEffect.amount;
}
