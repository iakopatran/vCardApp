import { type User, type Contact } from 'wasp/entities';
import { HttpError } from 'wasp/server';
import type { GetAdminUserDetails } from 'wasp/server/operations';
import * as z from 'zod';
import { stripe } from '../payment/stripe/stripeClient';
import { ensureArgsSchemaOrThrowHttpError } from '../server/validation';

const getAdminUserDetailsSchema = z.object({
  userId: z.string().min(1),
});

type GetAdminUserDetailsInput = z.infer<typeof getAdminUserDetailsSchema>;

export type StripeInvoice = {
  id: string;
  amountPaid: number;
  currency: string;
  status: string | null;
  created: number;
  invoicePdf: string | null;
  description: string | null;
};

export type StripeCharge = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  description: string | null;
  receiptUrl: string | null;
};

export type StripeSubscription = {
  id: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  planId: string | null;
  planAmount: number | null;
  planInterval: string | null;
};

export type AdminUserDetailsOutput = {
  user: User;
  contactsCount: number;
  lastActivity: Date | null;
  stripeData: {
    customer: {
      id: string;
      email: string | null;
      name: string | null;
      created: number;
    } | null;
    invoices: StripeInvoice[];
    charges: StripeCharge[];
    subscriptions: StripeSubscription[];
  } | null;
};

export const getAdminUserDetails: GetAdminUserDetails<
  GetAdminUserDetailsInput,
  AdminUserDetailsOutput
> = async (rawArgs, context) => {
  // Auth checks
  if (!context.user) {
    throw new HttpError(401, 'Only authenticated users are allowed to perform this operation');
  }
  if (!context.user.isAdmin) {
    throw new HttpError(403, 'Only admins are allowed to perform this operation');
  }

  const { userId } = ensureArgsSchemaOrThrowHttpError(getAdminUserDetailsSchema, rawArgs);

  // Fetch user with all fields
  const user = await context.entities.User.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  // Get contacts count and last activity
  const contactsCount = await context.entities.Contact.count({
    where: { userId },
  });

  const lastContact = await context.entities.Contact.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true },
  });

  // Fetch Stripe data if user has a payment processor ID
  let stripeData: AdminUserDetailsOutput['stripeData'] = null;

  if (user.paymentProcessorUserId) {
    try {
      // Fetch customer details
      const customer = await stripe.customers.retrieve(user.paymentProcessorUserId);

      if (customer.deleted) {
        // Customer was deleted in Stripe
        stripeData = null;
      } else {
        // Fetch invoices
        const invoicesResponse = await stripe.invoices.list({
          customer: user.paymentProcessorUserId,
          limit: 10,
        });

        const invoices: StripeInvoice[] = invoicesResponse.data.map((inv) => {
          const invAny = inv as any;
          return {
            id: inv.id ?? '',
            amountPaid: invAny.amount_paid ?? invAny.amountPaid ?? 0,
            currency: inv.currency,
            status: inv.status ?? null,
            created: inv.created,
            invoicePdf: invAny.invoice_pdf ?? invAny.invoicePdf ?? null,
            description: inv.description ?? null,
          };
        });

        // Fetch charges
        const chargesResponse = await stripe.charges.list({
          customer: user.paymentProcessorUserId,
          limit: 10,
        });

        const charges: StripeCharge[] = chargesResponse.data.map((ch) => {
          const chAny = ch as any;
          return {
            id: ch.id,
            amount: ch.amount,
            currency: ch.currency,
            status: ch.status,
            created: ch.created,
            description: ch.description ?? null,
            receiptUrl: chAny.receipt_url ?? chAny.receiptUrl ?? null,
          };
        });

        // Fetch subscriptions
        const subscriptionsResponse = await stripe.subscriptions.list({
          customer: user.paymentProcessorUserId,
          limit: 5,
        });

        const subscriptions: StripeSubscription[] = subscriptionsResponse.data.map((sub) => {
          // Cast to any to handle Stripe SDK type inconsistencies
          const subAny = sub as any;
          return {
            id: sub.id,
            status: sub.status,
            currentPeriodStart: subAny.current_period_start ?? subAny.currentPeriodStart ?? 0,
            currentPeriodEnd: subAny.current_period_end ?? subAny.currentPeriodEnd ?? 0,
            cancelAtPeriodEnd: subAny.cancel_at_period_end ?? subAny.cancelAtPeriodEnd ?? false,
            planId: sub.items.data[0]?.price?.id ?? null,
            planAmount: (sub.items.data[0]?.price as any)?.unit_amount ?? (sub.items.data[0]?.price as any)?.unitAmount ?? null,
            planInterval: sub.items.data[0]?.price?.recurring?.interval ?? null,
          };
        });

        stripeData = {
          customer: {
            id: customer.id,
            email: customer.email ?? null,
            name: customer.name ?? null,
            created: customer.created,
          },
          invoices,
          charges,
          subscriptions,
        };
      }
    } catch (error) {
      console.error('Error fetching Stripe data:', error);
      // Don't throw - just return null for Stripe data
      stripeData = null;
    }
  }

  return {
    user,
    contactsCount,
    lastActivity: lastContact?.updatedAt ?? null,
    stripeData,
  };
};
