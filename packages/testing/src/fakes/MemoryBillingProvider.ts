import { randomUUID } from 'node:crypto';

import type {
	CheckoutRequest,
	CheckoutSession,
	IBillingProvider,
	IClock,
	Invoice,
	NormalizedBillingEvent,
	Subscription,
	SubscriptionStatus,
} from '@vpn/ports';

type WireInvoice = Omit<Invoice, 'issuedAt'> & { readonly issuedAt: string };

interface Envelope {
	readonly id: string;
	readonly type: string;
	readonly created: string;
	readonly accountId: string;
	readonly subscription?: Omit<Subscription, 'currentPeriodEnd'> & {
		readonly currentPeriodEnd: string | null;
	};
	readonly invoice?: WireInvoice;
	readonly externalCustomerId?: string;
}

function reviveSubscription(raw: NonNullable<Envelope['subscription']>): Subscription {
	return {
		...raw,
		currentPeriodEnd: raw.currentPeriodEnd ? new Date(raw.currentPeriodEnd) : null,
	};
}

function reviveInvoice(raw: WireInvoice): Invoice {
	return { ...raw, issuedAt: new Date(raw.issuedAt) };
}

export class MemoryBillingProvider implements IBillingProvider {
	readonly #subscriptions = new Map<string, Subscription>();
	readonly #invoices = new Map<string, Invoice>();
	readonly #checkoutsByKey = new Map<string, CheckoutSession>();
	readonly #accountByCheckout = new Map<string, string>();
	readonly #clock: IClock;
	readonly #signingSecret: string;

	constructor(clock: IClock, signingSecret = 'whsec_memory') {
		this.#clock = clock;
		this.#signingSecret = signingSecret;
	}

	async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
		const cached = this.#checkoutsByKey.get(request.idempotencyKey);
		if (cached) return cached;

		const externalId = `cs_${randomUUID()}`;
		const session: CheckoutSession = {
			externalId,
			url: `${request.successUrl}?checkout=${externalId}&price=${request.priceId}`,
		};
		this.#checkoutsByKey.set(request.idempotencyKey, session);
		this.#accountByCheckout.set(session.externalId, request.accountId);
		return session;
	}

	async getSubscription(externalId: string): Promise<Subscription | null> {
		return this.#subscriptions.get(externalId) ?? null;
	}

	async cancelSubscription(externalId: string, when: 'now' | 'period_end'): Promise<Subscription> {
		const existing = this.#subscriptions.get(externalId);
		if (!existing) throw new Error(`unknown subscription: ${externalId}`);

		const updated: Subscription =
			when === 'now'
				? { ...existing, status: 'canceled', cancelAtPeriodEnd: false }
				: { ...existing, cancelAtPeriodEnd: true };
		this.#subscriptions.set(externalId, updated);
		return updated;
	}

	async resumeSubscription(externalId: string): Promise<Subscription> {
		const existing = this.#subscriptions.get(externalId);
		if (!existing) throw new Error(`unknown subscription: ${externalId}`);

		const updated: Subscription = { ...existing, cancelAtPeriodEnd: false };
		this.#subscriptions.set(externalId, updated);
		return updated;
	}

	verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
		return signatureHeader === this.#signature(rawBody);
	}

	parseWebhookEvent(rawBody: string): NormalizedBillingEvent | null {
		let envelope: Envelope;
		try {
			envelope = JSON.parse(rawBody) as Envelope;
		} catch {
			throw new Error('webhook body is not valid JSON');
		}

		switch (envelope.type) {
			case 'subscription_activated':
			case 'subscription_updated':
			case 'subscription_canceled': {
				if (!envelope.subscription) throw new Error(`${envelope.type} without a subscription`);
				return {
					kind: envelope.type,
					externalEventId: envelope.id,
					occurredAt: new Date(envelope.created),
					accountId: envelope.accountId,
					subscription: reviveSubscription(envelope.subscription),
				};
			}
			case 'payment_failed':
				if (!envelope.invoice) throw new Error('payment_failed without an invoice');
				return {
					kind: 'payment_failed',
					externalEventId: envelope.id,
					occurredAt: new Date(envelope.created),
					accountId: envelope.accountId,
					externalCustomerId: envelope.externalCustomerId ?? 'cus_memory',
					invoice: reviveInvoice(envelope.invoice),
				};
			case 'invoice_paid':
				if (!envelope.invoice) throw new Error('invoice_paid without an invoice');
				return {
					kind: 'invoice_paid',
					externalEventId: envelope.id,
					occurredAt: new Date(envelope.created),
					accountId: envelope.accountId,
					externalCustomerId: envelope.externalCustomerId ?? 'cus_memory',
					invoice: reviveInvoice(envelope.invoice),
				};
			default:
				return null;
		}
	}

	async fetchInvoicePdf(externalInvoiceId: string): Promise<Uint8Array | null> {
		const invoice = this.#invoices.get(externalInvoiceId);
		if (!invoice) return null;

		return new TextEncoder().encode(
			`%PDF-1.4\n% memory invoice ${invoice.externalId} ${invoice.amountCents} ${invoice.currency}\n%%EOF\n`,
		);
	}

	emit(
		type: string,
		accountId: string,
		extras: {
			subscription?: Subscription;
			invoice?: Invoice;
			externalCustomerId?: string;
			occurredAt?: Date;
		} = {},
	): { rawBody: string; signature: string; eventId: string } {
		const { occurredAt, ...rest } = extras;
		const eventId = `evt_${randomUUID()}`;
		const rawBody = JSON.stringify({
			id: eventId,
			type,
			created: (occurredAt ?? this.#clock.now()).toISOString(),
			accountId,
			...rest,
		});
		return { rawBody, signature: this.#signature(rawBody), eventId };
	}

	seedSubscription(
		externalId: string,
		accountId: string,
		status: SubscriptionStatus = 'active',
	): Subscription {
		const subscription: Subscription = {
			externalId,
			externalCustomerId: `cus_${accountId}`,
			status,
			currentPeriodEnd: new Date(this.#clock.now().getTime() + 30 * 24 * 60 * 60 * 1000),
			cancelAtPeriodEnd: false,
		};
		this.#subscriptions.set(externalId, subscription);
		return subscription;
	}

	seedInvoice(
		externalId: string,
		accountId: string,
		status: Invoice['status'] = 'paid',
		amountCents = 4900,
	): Invoice {
		const invoice: Invoice = {
			externalId,
			number: `${accountId}-0001`,
			status,
			amountCents,
			currency: 'brl',
			issuedAt: this.#clock.now(),
		};
		this.#invoices.set(externalId, invoice);
		return invoice;
	}

	accountForCheckout(checkoutId: string): string | undefined {
		return this.#accountByCheckout.get(checkoutId);
	}

	#signature(rawBody: string): string {
		let hash = 0;
		const material = `${this.#signingSecret}.${rawBody}`;
		for (let i = 0; i < material.length; i += 1) {
			hash = (hash * 31 + material.charCodeAt(i)) | 0;
		}
		return `sig_${(hash >>> 0).toString(16)}`;
	}
}
