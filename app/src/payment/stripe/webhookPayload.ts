import * as z from 'zod';
import { Stripe } from 'stripe';
import { UnhandledWebhookEventError } from '../errors';
import { HttpError } from 'wasp/server';

export async function parseWebhookPayload(rawStripeEvent: Stripe.Event) {
  try {
    const event = await genericStripeEventSchema.parseAsync(rawStripeEvent);
    switch (event.type) {
      case 'checkout.session.completed':
        const session = await sessionCompletedDataSchema.parseAsync(event.data.object);
        return { eventName: event.type, data: session };
      default:
        // If you'd like to handle more events, you can add more cases above.
        throw new UnhandledWebhookEventError(event.type);
    }
  } catch (e: unknown) {
    if (e instanceof UnhandledWebhookEventError) {
      throw e;
    } else {
      console.error(e);
      throw new HttpError(400, 'Error parsing Stripe event object');
    }
  }
}

/**
 * This is a subtype of
 * @type import('stripe').Stripe.Event
 */
const genericStripeEventSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.unknown(),
  }),
});

/**
 * This is a subtype of
 * @type import('stripe').Stripe.Checkout.Session
 */
const sessionCompletedDataSchema = z.object({
  id: z.string(),
  customer: z.string(),
  payment_status: z.enum(['paid', 'unpaid', 'no_payment_required']),
  mode: z.enum(['payment', 'subscription']),
  amount_total: z.number().nullable(), // Total amount in cents
});

export type SessionCompletedData = z.infer<typeof sessionCompletedDataSchema>;
