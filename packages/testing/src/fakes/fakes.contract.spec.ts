/**
 * Runs every conformance suite against the in-memory adapters.
 *
 * Two jobs at once. It proves the fakes are honest implementations rather than
 * convenient stubs - they are also the `memory` drivers the API runs on - and
 * it proves the suites themselves are runnable, so an adapter author who wires
 * one up is debugging their adapter and not the contract.
 */

import { describe, expect, it } from 'vitest';

import {
	describeBillingProviderContract,
	describeCacheStoreContract,
	describeEmailSenderContract,
	describeIdentityProviderContract,
	describeObjectStorageContract,
	describePasswordHasherContract,
	describeSmsSenderContract,
} from '../contracts/index.js';
import { FakePasswordHasher } from './FakePasswordHasher.js';
import { FixedClock } from './FixedClock.js';
import { MemoryBillingProvider } from './MemoryBillingProvider.js';
import { MemoryCacheStore, flattenCacheKey } from './MemoryCacheStore.js';
import { MemoryEmailSender } from './MemoryEmailSender.js';
import { MemoryIdentityProvider } from './MemoryIdentityProvider.js';
import { MemoryObjectStorage } from './MemoryObjectStorage.js';
import { MemorySmsSender } from './MemorySmsSender.js';

describeCacheStoreContract('MemoryCacheStore', () => {
	const clock = new FixedClock();
	return { store: new MemoryCacheStore(clock), advance: (seconds) => clock.advance(seconds) };
});

describeIdentityProviderContract('MemoryIdentityProvider', () => {
	const clock = new FixedClock();
	return {
		provider: new MemoryIdentityProvider(new FakePasswordHasher(), clock),
		advance: (seconds) => clock.advance(seconds),
	};
});

describePasswordHasherContract('FakePasswordHasher', () => new FakePasswordHasher());

describeEmailSenderContract('MemoryEmailSender', () => {
	const sender = new MemoryEmailSender();
	return { sender, inspect: () => sender.sent };
});

describeSmsSenderContract('MemorySmsSender', () => {
	const sender = new MemorySmsSender();
	return { sender, inspect: () => sender.sent };
});

describeObjectStorageContract('MemoryObjectStorage', () => new MemoryObjectStorage());

describeBillingProviderContract('MemoryBillingProvider', () => {
	const provider = new MemoryBillingProvider(new FixedClock());
	return {
		provider,
		activationWebhook: (accountId) =>
			provider.emit('subscription_activated', accountId, {
				subscription: provider.seedSubscription(`sub_${accountId}`, accountId),
			}),
		unknownEventWebhook: () => provider.emit('invoice.upcoming', 'account-1'),
	};
});

// Behaviour specific to these implementations, which the shared contracts have
// no business asserting.
describe('flattenCacheKey', () => {
	it('renders a null owner as an explicit segment', () => {
		expect(flattenCacheKey({ owner: null, namespace: 'n', id: 'i' })).toBe('global:n:i');
	});

	it('does not let an empty-string owner collide with a global key', () => {
		expect(flattenCacheKey({ owner: '', namespace: 'n', id: 'i' })).not.toBe(
			flattenCacheKey({ owner: null, namespace: 'n', id: 'i' }),
		);
	});
});

describe('FixedClock', () => {
	it('hands out a copy, so a caller cannot move time by mutating it', () => {
		const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
		clock.now().setFullYear(1999);
		expect(clock.now().getUTCFullYear()).toBe(2026);
	});

	it('advances', () => {
		const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
		clock.advance(90);
		expect(clock.now().toISOString()).toBe('2026-01-01T00:01:30.000Z');
	});
});

describe('MemoryEmailSender', () => {
	it('finds the most recent message for a recipient', async () => {
		const sender = new MemoryEmailSender();
		const base = {
			template: 'verify_email',
			locale: 'pt-BR',
			variables: {},
		} as const;
		await sender.send({ ...base, to: 'ada@example.com', idempotencyKey: '1' });
		await sender.send({ ...base, to: 'grace@example.com', idempotencyKey: '2' });
		await sender.send({ ...base, to: 'ada@example.com', idempotencyKey: '3' });

		expect(sender.lastTo('ada@example.com')?.idempotencyKey).toBe('3');
		expect(sender.lastTo('nobody@example.com')).toBeUndefined();
	});
});

describe('MemoryBillingProvider', () => {
	it('cancels at period end without ending the subscription', async () => {
		const provider = new MemoryBillingProvider(new FixedClock());
		provider.seedSubscription('sub_1', 'account-1');

		const updated = await provider.cancelSubscription('sub_1', 'period_end');
		expect(updated.status).toBe('active');
		expect(updated.cancelAtPeriodEnd).toBe(true);
	});

	it('cancels immediately when asked to', async () => {
		const provider = new MemoryBillingProvider(new FixedClock());
		provider.seedSubscription('sub_1', 'account-1');

		expect((await provider.cancelSubscription('sub_1', 'now')).status).toBe('canceled');
	});

	it('throws for an unknown subscription', async () => {
		const provider = new MemoryBillingProvider(new FixedClock());
		await expect(provider.cancelSubscription('sub_absent', 'now')).rejects.toThrow();
	});

	it('reports a payment failure with the customer it belongs to', () => {
		const provider = new MemoryBillingProvider(new FixedClock());
		const hook = provider.emit('payment_failed', 'account-1', { externalCustomerId: 'cus_9' });

		const event = provider.parseWebhookEvent(hook.rawBody);
		expect(event).toMatchObject({ kind: 'payment_failed', externalCustomerId: 'cus_9' });
	});
});
