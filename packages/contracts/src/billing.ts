import { z } from 'zod';

export const TIER_IDS = ['pro'] as const;
export const tierIdSchema = z.enum(TIER_IDS);
export type TierId = z.infer<typeof tierIdSchema>;

export const CADENCES = ['monthly', 'yearly'] as const;
export const cadenceSchema = z.enum(CADENCES);
export type Cadence = z.infer<typeof cadenceSchema>;

export const createCheckoutRequestSchema = z.object({
	tier: tierIdSchema,
	cadence: cadenceSchema,
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
