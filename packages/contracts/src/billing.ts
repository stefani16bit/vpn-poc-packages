/**
 * Billing request/response schemas.
 *
 * Contract:
 *   - the client never names a price it invents; it picks a plan and the server
 *     resolves the price id. A client-supplied price is a client-supplied
 *     amount, one refactor later.
 *   - the subscription view is the projection of our own table, not a passthrough
 *     of the provider's object
 */

import { z } from 'zod';

export const PLAN_IDS = ['monthly', 'yearly'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const createCheckoutRequestSchema = z.object({
	plan: z.enum(PLAN_IDS),
});
export type CreateCheckoutRequest = z.infer<typeof createCheckoutRequestSchema>;

export const createCheckoutResponseSchema = z.object({
	checkoutUrl: z.string().url(),
});
export type CreateCheckoutResponse = z.infer<typeof createCheckoutResponseSchema>;

export const subscriptionStatusSchema = z.enum([
	'none',
	'active',
	'trialing',
	'past_due',
	'canceled',
	'incomplete',
]);
export type SubscriptionStatusView = z.infer<typeof subscriptionStatusSchema>;

export const subscriptionResponseSchema = z.object({
	status: subscriptionStatusSchema,
	currentPeriodEnd: z.string().datetime().nullable(),
	cancelAtPeriodEnd: z.boolean(),
});
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;
