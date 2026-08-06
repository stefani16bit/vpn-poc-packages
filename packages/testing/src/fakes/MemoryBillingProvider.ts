/**
 * In-memory IBillingProvider. Doubles as the `memory` billing driver, and is
 * what the API's own tests run against so they never need localstripe up.
 *
 * emit* build the webhook payloads a real provider would post, in this
 * adapter's own envelope format. They are the test's way of saying "now the
 * payment succeeded" without a network.
 */

import { randomUUID } from 'node:crypto';

import type {
	CheckoutRequest,
	CheckoutSession,
	IBillingProvider,
	IClock,
	NormalizedBillingEvent,
	Subscription,
	SubscriptionStatus,
} from '@vpn/ports';

interface Envelope {
	readonly id: string;
	readonly type: string;
	readonly accountId: string;
	/** As it survives JSON: currentPeriodEnd has become a string. */
	readonly subscription?: Omit<Subscription, 'currentPeriodEnd'> & {
		readonly currentPeriodEnd: string | null;
	};
	readonly externalCustomerId?: string;
}

/**
 * A webhook body is JSON, and JSON has no Date. Returning the parsed object as
 * it stands would hand the caller a string where the port promises a Date -
 * which type-checks, because the assertion is on the way in, and then fails at
 * the first `.toISOString()` several layers away from here. Every real provider
 * adapter has the same obligation; this one is where it is easiest to forget,
 * precisely because the object went out as a Date.
 */
function reviveSubscription(raw: NonNullable<Envelope['subscription']>): Subscription {
	return {
		...raw,
		currentPeriodEnd: raw.currentPeriodEnd ? new Date(raw.currentPeriodEnd) : null,
	};
}

export class MemoryBillingProvider implements IBillingProvider {
	readonly #subscriptions = new Map<string, Subscription>();
	readonly #checkoutsByKey = new Map<string, CheckoutSession>();
	readonly #accountByCheckout = new Map<string, string>();
	readonly #clock: IClock;
	readonly #signingSecret: string;

	constructor(clock: IClock, signingSecret = 'whsec_memory') {
		this.#clock = clock;
		this.#signingSecret = signingSecret;
	}

	async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
		// Idempotency in the adapter, not the caller: a double-clicked subscribe
		// button reaches here twice and must produce one session.
		const cached = this.#checkoutsByKey.get(request.idempotencyKey);
		if (cached) return cached;

		const session: CheckoutSession = {
			externalId: `cs_${randomUUID()}`,
			url: `memory://checkout/${request.priceId}`,
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

	verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
		return signatureHeader === this.#signature(rawBody);
	}

	parseWebhookEvent(rawBody: string): NormalizedBillingEvent | null {
		let envelope: Envelope;
		try {
			envelope = JSON.parse(rawBody) as Envelope;
		} catch {
			// A body we cannot parse is not an event we do not model. Callers are
			// entitled to treat null as "ignore", so malformed input must throw.
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
					accountId: envelope.accountId,
					subscription: reviveSubscription(envelope.subscription),
				};
			}
			case 'payment_failed':
				return {
					kind: 'payment_failed',
					externalEventId: envelope.id,
					accountId: envelope.accountId,
					externalCustomerId: envelope.externalCustomerId ?? 'cus_memory',
				};
			default:
				// Unknown types are normal: providers add them without asking.
				return null;
		}
	}

	// --- test affordances -------------------------------------------------

	/** Builds a signed webhook the way the provider would post it. */
	emit(
		type: string,
		accountId: string,
		extras: { subscription?: Subscription; externalCustomerId?: string } = {},
	): { rawBody: string; signature: string; eventId: string } {
		const eventId = `evt_${randomUUID()}`;
		const rawBody = JSON.stringify({ id: eventId, type, accountId, ...extras });
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

	accountForCheckout(checkoutId: string): string | undefined {
		return this.#accountByCheckout.get(checkoutId);
	}

	// Not a real MAC. The contract only requires that a tampered body fails
	// verification, and inventing crypto here would assert a property no caller
	// may depend on from this adapter.
	#signature(rawBody: string): string {
		let hash = 0;
		const material = `${this.#signingSecret}.${rawBody}`;
		for (let i = 0; i < material.length; i += 1) {
			hash = (hash * 31 + material.charCodeAt(i)) | 0;
		}
		return `sig_${(hash >>> 0).toString(16)}`;
	}
}
