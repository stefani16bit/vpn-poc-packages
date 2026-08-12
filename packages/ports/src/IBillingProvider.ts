export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';

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

export type InvoiceStatus = 'paid' | 'failed';

export interface Invoice {
	readonly externalId: string;
	readonly number: string | null;
	readonly status: InvoiceStatus;
	readonly amountCents: number;
	readonly currency: string;
	readonly issuedAt: Date;
}

export type NormalizedBillingEvent =
	| {
			readonly kind: 'subscription_activated';
			readonly externalEventId: string;
			readonly occurredAt: Date;
			readonly accountId: string;
			readonly subscription: Subscription;
	  }
	| {
			readonly kind: 'subscription_updated';
			readonly externalEventId: string;
			readonly occurredAt: Date;
			readonly accountId: string;
			readonly subscription: Subscription;
	  }
	| {
			readonly kind: 'subscription_canceled';
			readonly externalEventId: string;
			readonly occurredAt: Date;
			readonly accountId: string;
			readonly subscription: Subscription;
	  }
	| {
			readonly kind: 'payment_failed';
			readonly externalEventId: string;
			readonly occurredAt: Date;
			readonly accountId: string;
			readonly externalCustomerId: string;
			readonly invoice: Invoice;
	  }
	| {
			readonly kind: 'invoice_paid';
			readonly externalEventId: string;
			readonly occurredAt: Date;
			readonly accountId: string;
			readonly externalCustomerId: string;
			readonly invoice: Invoice;
	  };

export interface IBillingProvider {
	createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
	getSubscription(externalId: string): Promise<Subscription | null>;
	cancelSubscription(externalId: string, when: 'now' | 'period_end'): Promise<Subscription>;
	resumeSubscription(externalId: string): Promise<Subscription>;

	fetchInvoicePdf(externalInvoiceId: string): Promise<Uint8Array | null>;

	verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;
	parseWebhookEvent(rawBody: string): NormalizedBillingEvent | null;
}

export const BILLING_PROVIDER: unique symbol = Symbol.for('vpn.billing-provider');
