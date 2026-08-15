import { z } from 'zod';

export const TIER_IDS = ['pro'] as const;
export const tierIdSchema = z.enum(TIER_IDS);
export type TierId = z.infer<typeof tierIdSchema>;

export const CADENCES = ['monthly', 'yearly'] as const;
export const cadenceSchema = z.enum(CADENCES);
export type Cadence = z.infer<typeof cadenceSchema>;

export const planPriceSchema = z.object({
	amountCents: z.number().int().positive(),
	// Lowercase ISO 4217, the form the provider stores and returns.
	currency: z.string().regex(/^[a-z]{3}$/),
});
export type PlanPrice = z.infer<typeof planPriceSchema>;

export const PLAN_PRICES: Record<TierId, Record<Cadence, PlanPrice>> = {
	pro: {
		monthly: { amountCents: 2990, currency: 'brl' },
		yearly: { amountCents: 29900, currency: 'brl' },
	},
};

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

export const INVOICE_STATUSES = ['paid', 'failed'] as const;
export const invoiceStatusSchema = z.enum(INVOICE_STATUSES);
export type InvoiceStatusView = z.infer<typeof invoiceStatusSchema>;

// The smallest unit of the currency, never a fraction: a statement that
// disagrees with the card charge is worse than no statement.
export const invoiceSchema = z.object({
	id: z.string().uuid(),
	number: z.string().nullable(),
	status: invoiceStatusSchema,
	amountCents: z.number().int(),
	currency: z.string(),
	issuedAt: z.string().datetime(),
	archived: z.boolean(),
});
export type Invoice = z.infer<typeof invoiceSchema>;

export const invoiceListResponseSchema = z.object({
	invoices: z.array(invoiceSchema),
});
export type InvoiceListResponse = z.infer<typeof invoiceListResponseSchema>;
