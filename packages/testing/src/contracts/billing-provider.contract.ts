import { beforeEach, describe, expect, it } from 'vitest';

import type { CheckoutRequest, IBillingProvider } from '@vpn/ports';

export interface SignedWebhook {
	readonly rawBody: string;
	readonly signature: string;
	readonly eventId: string;
}

export interface BillingProviderHarness {
	readonly provider: IBillingProvider;
	activeSubscription(accountId: string): Promise<string> | string;
	activationWebhook(accountId: string): Promise<SignedWebhook> | SignedWebhook;
	unknownEventWebhook(): Promise<SignedWebhook> | SignedWebhook;
	paidInvoiceWebhook(accountId: string): Promise<SignedWebhook> | SignedWebhook;
	failedInvoiceWebhook(accountId: string): Promise<SignedWebhook> | SignedWebhook;
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

export function describeBillingProviderContract(
	name: string,
	createHarness: () => Promise<BillingProviderHarness> | BillingProviderHarness,
): void {
	describe(`${name} (IBillingProvider contract)`, () => {
		let harness: BillingProviderHarness;
		let provider: IBillingProvider;

		beforeEach(async () => {
			harness = await createHarness();
			provider = harness.provider;
		});

		describe('checkout', () => {
			it('returns a session with a URL to send the user to', async () => {
				const session = await provider.createCheckout(checkout());
				expect(session.externalId).toBeTruthy();
				expect(session.url).toBeTruthy();
			});

			it('returns the same session for a repeated idempotency key', async () => {
				const first = await provider.createCheckout(checkout());
				const second = await provider.createCheckout(checkout());
				expect(second.externalId).toBe(first.externalId);
			});

			it('creates a distinct session for a different idempotency key', async () => {
				const first = await provider.createCheckout(checkout({ idempotencyKey: 'a' }));
				const second = await provider.createCheckout(checkout({ idempotencyKey: 'b' }));
				expect(second.externalId).not.toBe(first.externalId);
			});
		});

		describe('cancellation and resume', () => {
			it('schedules the end without ending access now', async () => {
				const externalId = await harness.activeSubscription('account-1');

				const updated = await provider.cancelSubscription(externalId, 'period_end');

				expect(updated.cancelAtPeriodEnd).toBe(true);
				expect(updated.status).not.toBe('canceled');
			});

			it('clears the schedule when the subscription is resumed', async () => {
				const externalId = await harness.activeSubscription('account-1');
				await provider.cancelSubscription(externalId, 'period_end');

				const updated = await provider.resumeSubscription(externalId);

				expect(updated.cancelAtPeriodEnd).toBe(false);
				expect(updated.status).not.toBe('canceled');
			});

			it('resumes a subscription that was never scheduled to end, without complaining', async () => {
				const externalId = await harness.activeSubscription('account-1');

				const updated = await provider.resumeSubscription(externalId);

				expect(updated.cancelAtPeriodEnd).toBe(false);
			});

			it('reports the same state a read-back reports', async () => {
				const externalId = await harness.activeSubscription('account-1');
				const updated = await provider.cancelSubscription(externalId, 'period_end');

				expect(await provider.getSubscription(externalId)).toMatchObject({
					cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
					status: updated.status,
				});
			});

			it('rejects resuming a subscription it does not know', async () => {
				await expect(provider.resumeSubscription('sub_absent')).rejects.toThrow();
			});
		});

		describe('webhook verification', () => {
			it('accepts a body with its own signature', async () => {
				const hook = await harness.activationWebhook('account-1');
				expect(provider.verifyWebhookSignature(hook.rawBody, hook.signature)).toBe(true);
			});

			it('rejects a tampered body', async () => {
				const hook = await harness.activationWebhook('account-1');
				const tampered = hook.rawBody.replace('account-1', 'account-2');
				expect(provider.verifyWebhookSignature(tampered, hook.signature)).toBe(false);
			});

			it('rejects an absent signature', async () => {
				const hook = await harness.activationWebhook('account-1');
				expect(provider.verifyWebhookSignature(hook.rawBody, '')).toBe(false);
			});

			it('is pure: verifying twice gives the same answer', async () => {
				const hook = await harness.activationWebhook('account-1');
				const first = provider.verifyWebhookSignature(hook.rawBody, hook.signature);
				expect(provider.verifyWebhookSignature(hook.rawBody, hook.signature)).toBe(first);
			});
		});

		describe('webhook parsing', () => {
			it('normalises an activation', async () => {
				const hook = await harness.activationWebhook('account-1');
				const event = provider.parseWebhookEvent(hook.rawBody);

				expect(event).not.toBeNull();
				expect(event?.kind).toBe('subscription_activated');
				expect(event?.accountId).toBe('account-1');
			});

			it('carries a stable external event id', async () => {
				const hook = await harness.activationWebhook('account-1');
				expect(provider.parseWebhookEvent(hook.rawBody)?.externalEventId).toBe(hook.eventId);
				expect(provider.parseWebhookEvent(hook.rawBody)?.externalEventId).toBe(hook.eventId);
			});

			it('returns currentPeriodEnd as a Date rather than as the wire format', async () => {
				const hook = await harness.activationWebhook('account-1');
				const event = provider.parseWebhookEvent(hook.rawBody);

				if (!event || event.kind === 'payment_failed' || event.kind === 'invoice_paid')
					throw new Error('expected a subscription event');
				expect(
					event.subscription.currentPeriodEnd === null ||
						event.subscription.currentPeriodEnd instanceof Date,
				).toBe(true);
			});

			it('returns occurredAt as a Date rather than as the wire format', async () => {
				const hook = await harness.activationWebhook('account-1');
				const event = provider.parseWebhookEvent(hook.rawBody);

				expect(event?.occurredAt).toBeInstanceOf(Date);
				expect(Number.isNaN(event?.occurredAt.getTime())).toBe(false);
			});

			it('orders two events by occurredAt in the order the provider emitted them', async () => {
				const first = await harness.activationWebhook('account-1');
				const second = await harness.activationWebhook('account-1');

				const earlier = provider.parseWebhookEvent(first.rawBody);
				const later = provider.parseWebhookEvent(second.rawBody);

				expect(later?.occurredAt.getTime()).toBeGreaterThanOrEqual(
					earlier?.occurredAt.getTime() ?? 0,
				);
			});

			it('returns null for an event type this system does not model', async () => {
				const hook = await harness.unknownEventWebhook();
				expect(provider.parseWebhookEvent(hook.rawBody)).toBeNull();
			});

			it('throws rather than returning null for an unparseable body', async () => {
				expect(() => provider.parseWebhookEvent('<html>gateway timeout</html>')).toThrow();
			});
		});

		describe('invoices', () => {
			it('normalises a paid invoice', async () => {
				const hook = await harness.paidInvoiceWebhook('account-1');
				const event = provider.parseWebhookEvent(hook.rawBody);

				expect(event?.kind).toBe('invoice_paid');
				expect(event?.accountId).toBe('account-1');
			});

			it('carries what a statement line needs, and nothing the wire cannot hold', async () => {
				const hook = await harness.paidInvoiceWebhook('account-1');
				const event = provider.parseWebhookEvent(hook.rawBody);

				if (event?.kind !== 'invoice_paid') throw new Error('expected a paid invoice');
				expect(event.invoice.externalId).toBeTruthy();
				expect(event.invoice.status).toBe('paid');
				expect(Number.isInteger(event.invoice.amountCents)).toBe(true);
				expect(event.invoice.currency).toBeTruthy();
			});

			// Money in the smallest unit, never a float: 19.99 in binary is not 19.99,
			// and a statement that disagrees with the card charge is worse than none.
			it('reports the amount in cents rather than in a fractional unit', async () => {
				const hook = await harness.paidInvoiceWebhook('account-1');
				const event = provider.parseWebhookEvent(hook.rawBody);

				if (event?.kind !== 'invoice_paid') throw new Error('expected a paid invoice');
				expect(event.invoice.amountCents % 1).toBe(0);
			});

			it('returns issuedAt as a Date rather than as the wire format', async () => {
				const hook = await harness.paidInvoiceWebhook('account-1');
				const event = provider.parseWebhookEvent(hook.rawBody);

				if (event?.kind !== 'invoice_paid') throw new Error('expected a paid invoice');
				expect(event.invoice.issuedAt).toBeInstanceOf(Date);
				expect(Number.isNaN(event.invoice.issuedAt.getTime())).toBe(false);
			});

			// One provider event is one normalised event. Splitting a failed payment
			// into a dunning event and an invoice event would send the same
			// external_event_id through the ledger twice, and the unique index that
			// makes redelivery safe would drop whichever arrived second.
			it('carries the invoice on a failed payment instead of emitting a second event', async () => {
				const hook = await harness.failedInvoiceWebhook('account-1');
				const event = provider.parseWebhookEvent(hook.rawBody);

				expect(event?.kind).toBe('payment_failed');
				if (event?.kind !== 'payment_failed') throw new Error('expected a failed payment');
				expect(event.invoice.status).toBe('failed');
				expect(event.invoice.externalId).toBeTruthy();
			});

			it('hands back the document bytes for an invoice it issued', async () => {
				const externalId = await harness.invoicedExternalId('account-1');
				const pdf = await provider.fetchInvoicePdf(externalId);

				expect(pdf).toBeInstanceOf(Uint8Array);
				expect(pdf?.length ?? 0).toBeGreaterThan(0);
			});

			it('answers null for an invoice it never issued, rather than throwing', async () => {
				expect(await provider.fetchInvoicePdf('in_nothing_like_this')).toBeNull();
			});
		});
	});
}
