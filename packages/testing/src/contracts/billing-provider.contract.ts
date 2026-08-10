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

				if (event?.kind === 'payment_failed' || !event)
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
	});
}
