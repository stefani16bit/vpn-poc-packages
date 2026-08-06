/**
 * The behaviour every IBillingProvider adapter must exhibit.
 *
 * The harness supplies a signed webhook rather than a fixture string, because
 * the signature is provider-specific and the assertions about it - tampering
 * fails, an unsigned body fails - are not.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import type { CheckoutRequest, IBillingProvider } from '@vpn/ports';

export interface SignedWebhook {
	readonly rawBody: string;
	readonly signature: string;
	readonly eventId: string;
}

export interface BillingProviderHarness {
	readonly provider: IBillingProvider;
	/** A signed `subscription_activated` for this account. */
	activationWebhook(accountId: string): Promise<SignedWebhook> | SignedWebhook;
	/** A signed body whose `type` this system does not model. */
	unknownEventWebhook(): Promise<SignedWebhook> | SignedWebhook;
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

			// A double-clicked subscribe button, or our own timeout retry. Two
			// sessions here means two subscriptions and a refund conversation.
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

			// The value the caller deduplicates on. Without it, a redelivery is
			// indistinguishable from a second real event.
			it('carries a stable external event id', async () => {
				const hook = await harness.activationWebhook('account-1');
				expect(provider.parseWebhookEvent(hook.rawBody)?.externalEventId).toBe(hook.eventId);
				expect(provider.parseWebhookEvent(hook.rawBody)?.externalEventId).toBe(hook.eventId);
			});

			// A webhook body is JSON and JSON has no Date. An adapter that passes
			// the parsed object straight through returns a string where the port
			// promises a Date - it type-checks, and then fails at the first
			// .toISOString() several layers away, in whatever handler happens to
			// touch it first.
			it('returns currentPeriodEnd as a Date rather than as the wire format', async () => {
				const hook = await harness.activationWebhook('account-1');
				const event = provider.parseWebhookEvent(hook.rawBody);

				if (event?.kind === 'payment_failed' || !event) throw new Error('expected a subscription event');
				expect(
					event.subscription.currentPeriodEnd === null ||
						event.subscription.currentPeriodEnd instanceof Date,
				).toBe(true);
			});

			it('returns null for an event type this system does not model', async () => {
				const hook = await harness.unknownEventWebhook();
				expect(provider.parseWebhookEvent(hook.rawBody)).toBeNull();
			});

			// null means "ignore this". A body we could not parse at all is a
			// different situation and must not be silently ignored.
			it('throws rather than returning null for an unparseable body', async () => {
				expect(() => provider.parseWebhookEvent('<html>gateway timeout</html>')).toThrow();
			});
		});
	});
}
