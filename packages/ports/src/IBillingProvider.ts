/**
 * Subscription billing.
 *
 * Why the normalised event: a webhook payload is the single most
 * vendor-specific object a payment integration touches, and letting it reach a
 * service means the vendor's field names end up in our database. parseWebhook
 * is the one function in the system allowed to know what a Stripe event looks
 * like; everything downstream sees NormalizedBillingEvent.
 *
 * Contract:
 *   - createCheckout takes an idempotencyKey. A user double-clicking "subscribe"
 *     must not create two subscriptions, and the retry that happens when our
 *     own request times out must not either.
 *   - verifyWebhookSignature is PURE and must be called on the RAW body, before
 *     any JSON parsing. A framework that re-serialises the body invalidates the
 *     signature, and the failure mode is "works locally, rejects in production".
 *   - parseWebhookEvent returns null for events we do not model. An unknown
 *     event type is not an error - the vendor adds them without asking.
 *   - externalEventId is what the caller deduplicates on. Every provider
 *     redelivers, and a redelivered `payment_failed` must not re-mail the user.
 *   - cancelSubscription('period_end') is the default a UI should offer;
 *     'now' exists for support and for account deletion.
 */

export type SubscriptionStatus =
	| 'active'
	| 'trialing'
	| 'past_due'
	| 'canceled'
	| 'incomplete';

export interface Subscription {
	readonly externalId: string;
	readonly externalCustomerId: string;
	readonly status: SubscriptionStatus;
	readonly currentPeriodEnd: Date | null;
	readonly cancelAtPeriodEnd: boolean;
}

export interface CheckoutRequest {
	readonly accountId: string;
	readonly email: string;
	readonly priceId: string;
	readonly successUrl: string;
	readonly cancelUrl: string;
	readonly idempotencyKey: string;
}

export interface CheckoutSession {
	readonly externalId: string;
	readonly url: string;
}

export type NormalizedBillingEvent =
	| {
			readonly kind: 'subscription_activated';
			readonly externalEventId: string;
			readonly accountId: string;
			readonly subscription: Subscription;
	  }
	| {
			readonly kind: 'subscription_updated';
			readonly externalEventId: string;
			readonly accountId: string;
			readonly subscription: Subscription;
	  }
	| {
			readonly kind: 'subscription_canceled';
			readonly externalEventId: string;
			readonly accountId: string;
			readonly subscription: Subscription;
	  }
	| {
			readonly kind: 'payment_failed';
			readonly externalEventId: string;
			readonly accountId: string;
			readonly externalCustomerId: string;
	  };

export interface IBillingProvider {
	createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
	getSubscription(externalId: string): Promise<Subscription | null>;
	cancelSubscription(externalId: string, when: 'now' | 'period_end'): Promise<Subscription>;

	/** Pure. Called on the raw request body, before parsing. */
	verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;
	/** null for event types this system does not model. */
	parseWebhookEvent(rawBody: string): NormalizedBillingEvent | null;
}

export const BILLING_PROVIDER = 'BILLING_PROVIDER';
