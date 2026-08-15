import { beforeEach, describe, expect, it } from 'vitest';

import type { CheckoutRequest, IBillingProvider } from '@vpn/ports';

// Four suites rather than one, split along what a provider can actually be asked
// to answer. The harness types are narrow on purpose: a registration cannot
// satisfy a suite whose fixtures it has no way to build, so "which of these does
// this adapter face" is a compile error rather than a paragraph somewhere.
//
// It is the same reason DEC-009 refused a suite with a third of its cases
// skipped: a partial pass is not a pass. Splitting turns "Stripe does not run the
// contract" into "Stripe runs three of the four, and here is the fourth and why".

export interface SignedWebhook {
	readonly rawBody: string;
	readonly signature: string;
	readonly eventId: string;
}

export interface BillingCheckoutHarness {
	readonly provider: IBillingProvider;
}

export interface BillingLifecycleHarness {
	readonly provider: IBillingProvider;
	activeSubscription(accountId: string): Promise<string> | string;
}

export interface BillingWebhookHarness {
	readonly provider: IBillingProvider;
	activationWebhook(accountId: string): Promise<SignedWebhook> | SignedWebhook;
	unknownEventWebhook(): Promise<SignedWebhook> | SignedWebhook;
	paidInvoiceWebhook(accountId: string): Promise<SignedWebhook> | SignedWebhook;
	failedInvoiceWebhook(accountId: string): Promise<SignedWebhook> | SignedWebhook;
}

export interface BillingInvoiceArchiveHarness {
	readonly provider: IBillingProvider;
	invoicedExternalId(accountId: string): Promise<string> | string;
}

function checkout(overrides: Partial<CheckoutRequest> = {}): CheckoutRequest {
	return {
		accountId: 'account-1',
		email: 'ada@example.com',
		priceId: 'price_monthly',
		successUrl: 'https://app.localhost/billing/success',
		cancelUrl: 'https://app.localhost/billing/cancel',
		idempotencyKey: 'checkout-1',
		...overrides,
	};
}

function suite<H extends { readonly provider: IBillingProvider }>(
	title: string,
	createHarness: () => Promise<H> | H,
	body: (get: () => H) => void,
): void {
	describe(title, () => {
		let harness: H;

		beforeEach(async () => {
			harness = await createHarness();
		});

		body(() => harness);
	});
}

export function describeBillingCheckoutContract(
	name: string,
	createHarness: () => Promise<BillingCheckoutHarness> | BillingCheckoutHarness,
): void {
	suite(`${name} (IBillingProvider checkout contract)`, createHarness, (get) => {
		it('returns a session with a URL to send the user to', async () => {
			const session = await get().provider.createCheckout(checkout());
			expect(session.externalId).toBeTruthy();
			expect(session.url).toBeTruthy();
		});

		it('returns the same session for a repeated idempotency key', async () => {
			const first = await get().provider.createCheckout(checkout());
			const second = await get().provider.createCheckout(checkout());
			expect(second.externalId).toBe(first.externalId);
		});

		it('creates a distinct session for a different idempotency key', async () => {
			const first = await get().provider.createCheckout(checkout({ idempotencyKey: 'a' }));
			const second = await get().provider.createCheckout(checkout({ idempotencyKey: 'b' }));
			expect(second.externalId).not.toBe(first.externalId);
		});
	});
}

export function describeBillingLifecycleContract(
	name: string,
	createHarness: () => Promise<BillingLifecycleHarness> | BillingLifecycleHarness,
): void {
	suite(`${name} (IBillingProvider lifecycle contract)`, createHarness, (get) => {
		it('schedules the end without ending access now', async () => {
			const externalId = await get().activeSubscription('account-1');

			const updated = await get().provider.cancelSubscription(externalId, 'period_end');

			expect(updated.cancelAtPeriodEnd).toBe(true);
			expect(updated.status).not.toBe('canceled');
		});

		it('clears the schedule when the subscription is resumed', async () => {
			const externalId = await get().activeSubscription('account-1');
			await get().provider.cancelSubscription(externalId, 'period_end');

			const updated = await get().provider.resumeSubscription(externalId);

			expect(updated.cancelAtPeriodEnd).toBe(false);
			expect(updated.status).not.toBe('canceled');
		});

		it('resumes a subscription that was never scheduled to end, without complaining', async () => {
			const externalId = await get().activeSubscription('account-1');

			const updated = await get().provider.resumeSubscription(externalId);

			expect(updated.cancelAtPeriodEnd).toBe(false);
		});

		it('reports the same state a read-back reports', async () => {
			const externalId = await get().activeSubscription('account-1');
			const updated = await get().provider.cancelSubscription(externalId, 'period_end');

			expect(await get().provider.getSubscription(externalId)).toMatchObject({
				cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
				status: updated.status,
			});
		});

		it('rejects resuming a subscription it does not know', async () => {
			await expect(get().provider.resumeSubscription('sub_absent')).rejects.toThrow();
		});
	});
}

export function describeBillingWebhookContract(
	name: string,
	createHarness: () => Promise<BillingWebhookHarness> | BillingWebhookHarness,
): void {
	suite(`${name} (IBillingProvider webhook contract)`, createHarness, (get) => {
		describe('verification', () => {
			it('accepts a body with its own signature', async () => {
				const hook = await get().activationWebhook('account-1');
				expect(get().provider.verifyWebhookSignature(hook.rawBody, hook.signature)).toBe(true);
			});

			it('rejects a tampered body', async () => {
				const hook = await get().activationWebhook('account-1');
				const tampered = hook.rawBody.replace('account-1', 'account-2');
				expect(get().provider.verifyWebhookSignature(tampered, hook.signature)).toBe(false);
			});

			it('rejects an absent signature', async () => {
				const hook = await get().activationWebhook('account-1');
				expect(get().provider.verifyWebhookSignature(hook.rawBody, '')).toBe(false);
			});

			it('is pure: verifying twice gives the same answer', async () => {
				const hook = await get().activationWebhook('account-1');
				const first = get().provider.verifyWebhookSignature(hook.rawBody, hook.signature);
				expect(get().provider.verifyWebhookSignature(hook.rawBody, hook.signature)).toBe(first);
			});
		});

		describe('parsing a subscription event', () => {
			it('normalises an activation', async () => {
				const hook = await get().activationWebhook('account-1');
				const event = get().provider.parseWebhookEvent(hook.rawBody);

				expect(event).not.toBeNull();
				expect(event?.kind).toBe('subscription_activated');
				expect(event?.accountId).toBe('account-1');
			});

			it('carries a stable external event id', async () => {
				const hook = await get().activationWebhook('account-1');
				expect(get().provider.parseWebhookEvent(hook.rawBody)?.externalEventId).toBe(hook.eventId);
				expect(get().provider.parseWebhookEvent(hook.rawBody)?.externalEventId).toBe(hook.eventId);
			});

			it('returns currentPeriodEnd as a Date rather than as the wire format', async () => {
				const hook = await get().activationWebhook('account-1');
				const event = get().provider.parseWebhookEvent(hook.rawBody);

				if (!event || event.kind === 'payment_failed' || event.kind === 'invoice_paid')
					throw new Error('expected a subscription event');
				expect(
					event.subscription.currentPeriodEnd === null ||
						event.subscription.currentPeriodEnd instanceof Date,
				).toBe(true);
			});

			it('returns occurredAt as a Date rather than as the wire format', async () => {
				const hook = await get().activationWebhook('account-1');
				const event = get().provider.parseWebhookEvent(hook.rawBody);

				expect(event?.occurredAt).toBeInstanceOf(Date);
				expect(Number.isNaN(event?.occurredAt.getTime())).toBe(false);
			});

			it('orders two events by occurredAt in the order the provider emitted them', async () => {
				const first = await get().activationWebhook('account-1');
				const second = await get().activationWebhook('account-1');

				const earlier = get().provider.parseWebhookEvent(first.rawBody);
				const later = get().provider.parseWebhookEvent(second.rawBody);

				expect(later?.occurredAt.getTime()).toBeGreaterThanOrEqual(
					earlier?.occurredAt.getTime() ?? 0,
				);
			});

			it('returns null for an event type this system does not model', async () => {
				const hook = await get().unknownEventWebhook();
				expect(get().provider.parseWebhookEvent(hook.rawBody)).toBeNull();
			});

			it('throws rather than returning null for an unparseable body', async () => {
				expect(() => get().provider.parseWebhookEvent('<html>gateway timeout</html>')).toThrow();
			});
		});

		// Normalising an invoice event is parsing, so it belongs here rather than
		// with the archive: it needs a signed body and nothing else, which is what
		// lets a provider with no document endpoint still face all of it.
		describe('parsing an invoice event', () => {
			it('normalises a paid invoice', async () => {
				const hook = await get().paidInvoiceWebhook('account-1');
				const event = get().provider.parseWebhookEvent(hook.rawBody);

				expect(event?.kind).toBe('invoice_paid');
				expect(event?.accountId).toBe('account-1');
			});

			it('carries what a statement line needs, and nothing the wire cannot hold', async () => {
				const hook = await get().paidInvoiceWebhook('account-1');
				const event = get().provider.parseWebhookEvent(hook.rawBody);

				if (event?.kind !== 'invoice_paid') throw new Error('expected a paid invoice');
				expect(event.invoice.externalId).toBeTruthy();
				expect(event.invoice.status).toBe('paid');
				expect(Number.isInteger(event.invoice.amountCents)).toBe(true);
				expect(event.invoice.currency).toBeTruthy();
			});

			// Money in the smallest unit, never a float: 19.99 in binary is not 19.99,
			// and a statement that disagrees with the card charge is worse than none.
			it('reports the amount in cents rather than in a fractional unit', async () => {
				const hook = await get().paidInvoiceWebhook('account-1');
				const event = get().provider.parseWebhookEvent(hook.rawBody);

				if (event?.kind !== 'invoice_paid') throw new Error('expected a paid invoice');
				expect(event.invoice.amountCents % 1).toBe(0);
			});

			it('returns issuedAt as a Date rather than as the wire format', async () => {
				const hook = await get().paidInvoiceWebhook('account-1');
				const event = get().provider.parseWebhookEvent(hook.rawBody);

				if (event?.kind !== 'invoice_paid') throw new Error('expected a paid invoice');
				expect(event.invoice.issuedAt).toBeInstanceOf(Date);
				expect(Number.isNaN(event.invoice.issuedAt.getTime())).toBe(false);
			});

			// One provider event is one normalised event. Splitting a failed payment
			// into a dunning event and an invoice event would send the same
			// external_event_id through the ledger twice, and the unique index that
			// makes redelivery safe would drop whichever arrived second.
			it('carries the invoice on a failed payment instead of emitting a second event', async () => {
				const hook = await get().failedInvoiceWebhook('account-1');
				const event = get().provider.parseWebhookEvent(hook.rawBody);

				expect(event?.kind).toBe('payment_failed');
				if (event?.kind !== 'payment_failed') throw new Error('expected a failed payment');
				expect(event.invoice.status).toBe('failed');
				expect(event.invoice.externalId).toBeTruthy();
			});
		});
	});
}

// The only block that needs the provider to hold a document and hand it back, so
// the only one a mock without an invoice_pdf cannot face.
export function describeBillingInvoiceArchiveContract(
	name: string,
	createHarness: () => Promise<BillingInvoiceArchiveHarness> | BillingInvoiceArchiveHarness,
): void {
	suite(`${name} (IBillingProvider invoice archive contract)`, createHarness, (get) => {
		it('hands back the document bytes for an invoice it issued', async () => {
			const externalId = await get().invoicedExternalId('account-1');
			const pdf = await get().provider.fetchInvoicePdf(externalId);

			expect(pdf).toBeInstanceOf(Uint8Array);
			expect(pdf?.length ?? 0).toBeGreaterThan(0);
		});

		it('answers null for an invoice it never issued, rather than throwing', async () => {
			expect(await get().provider.fetchInvoicePdf('in_nothing_like_this')).toBeNull();
		});
	});
}
