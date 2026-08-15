import { describe, expect, it } from 'vitest';

import {
	describeBillingCheckoutContract,
	describeBillingInvoiceArchiveContract,
	describeBillingLifecycleContract,
	describeBillingWebhookContract,
	describeCacheStoreContract,
	describeEmailSenderContract,
	describeExitNodeContract,
	describeObjectStorageContract,
	describeSecretStoreContract,
	describePasswordHasherContract,
	describeJobQueueContract,
	describeSmsSenderContract,
} from '../contracts/index.js';
import { FakePasswordHasher } from './FakePasswordHasher.js';
import { FixedClock } from './FixedClock.js';
import { MemoryBillingProvider } from './MemoryBillingProvider.js';
import { MemoryCacheStore, flattenCacheKey } from './MemoryCacheStore.js';
import { MemoryEmailSender } from './MemoryEmailSender.js';
import { MemoryExitNode } from './MemoryExitNode.js';
import { MemoryObjectStorage } from './MemoryObjectStorage.js';
import { MemorySecretStore } from './MemorySecretStore.js';
import { MemoryJobQueue } from './MemoryJobQueue.js';
import { MemorySmsSender } from './MemorySmsSender.js';

describeCacheStoreContract('MemoryCacheStore', () => {
	const clock = new FixedClock();
	return { store: new MemoryCacheStore(clock), advance: (seconds) => clock.advance(seconds) };
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

// All four, because the fake is the implementation with nothing it cannot
// answer. Which of them a real adapter faces is the interesting question, and
// splitting the suite is what makes it askable one block at a time.
function memoryBilling(): MemoryBillingProvider {
	return new MemoryBillingProvider(new FixedClock());
}

describeBillingCheckoutContract('MemoryBillingProvider', () => ({ provider: memoryBilling() }));

describeBillingLifecycleContract('MemoryBillingProvider', () => {
	const provider = memoryBilling();
	return {
		provider,
		activeSubscription: (accountId) =>
			provider.seedSubscription(`sub_${accountId}`, accountId).externalId,
	};
});

describeBillingWebhookContract('MemoryBillingProvider', () => {
	const provider = memoryBilling();
	return {
		provider,
		activationWebhook: (accountId) =>
			provider.emit('subscription_activated', accountId, {
				subscription: provider.seedSubscription(`sub_${accountId}`, accountId),
			}),
		unknownEventWebhook: () => provider.emit('invoice.upcoming', 'account-1'),
		paidInvoiceWebhook: (accountId) =>
			provider.emit('invoice_paid', accountId, {
				invoice: provider.seedInvoice(`in_${accountId}_paid`, accountId, 'paid'),
			}),
		failedInvoiceWebhook: (accountId) =>
			provider.emit('payment_failed', accountId, {
				invoice: provider.seedInvoice(`in_${accountId}_failed`, accountId, 'failed'),
			}),
	};
});

describeBillingInvoiceArchiveContract('MemoryBillingProvider', () => {
	const provider = memoryBilling();
	return {
		provider,
		invoicedExternalId: (accountId) =>
			provider.seedInvoice(`in_${accountId}_paid`, accountId).externalId,
	};
});

describeJobQueueContract('MemoryJobQueue', () => {
	const queue = new MemoryJobQueue(new FixedClock());
	return { queue, expire: () => queue.makeEverythingVisible() };
});

describeExitNodeContract('MemoryExitNode', () => ({ node: new MemoryExitNode() }));

describeSecretStoreContract('MemorySecretStore', () => {
	const store = new MemorySecretStore();

	return {
		store,
		seed: (ref, value) => store.seed(ref, value),
		forget: (ref) => store.forget(ref),
	};
});

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

	it('keeps the period end and the customer when a schedule is undone', async () => {
		const provider = new MemoryBillingProvider(new FixedClock());
		const seeded = provider.seedSubscription('sub_1', 'account-1');
		await provider.cancelSubscription('sub_1', 'period_end');

		const resumed = await provider.resumeSubscription('sub_1');

		expect(resumed).toEqual({ ...seeded, cancelAtPeriodEnd: false });
	});

	it('leaves a hard cancellation cancelled when it is resumed', async () => {
		const provider = new MemoryBillingProvider(new FixedClock());
		provider.seedSubscription('sub_1', 'account-1');
		await provider.cancelSubscription('sub_1', 'now');

		expect((await provider.resumeSubscription('sub_1')).status).toBe('canceled');
	});

	it('reports a payment failure with the customer it belongs to', () => {
		const provider = new MemoryBillingProvider(new FixedClock());
		const hook = provider.emit('payment_failed', 'account-1', {
			externalCustomerId: 'cus_9',
			invoice: provider.seedInvoice('in_1', 'account-1', 'failed'),
		});

		const event = provider.parseWebhookEvent(hook.rawBody);
		expect(event).toMatchObject({ kind: 'payment_failed', externalCustomerId: 'cus_9' });
	});

	// The driver that runs in development, not only in tests: a screen that
	// cannot show a single invoice locally is a screen nobody reviews.
	it('revives the issue date, which crossed the wire as a string', () => {
		const provider = new MemoryBillingProvider(new FixedClock());
		const hook = provider.emit('invoice_paid', 'account-1', {
			invoice: provider.seedInvoice('in_2', 'account-1'),
		});

		const event = provider.parseWebhookEvent(hook.rawBody);
		if (event?.kind !== 'invoice_paid') throw new Error('expected a paid invoice');
		expect(event.invoice.issuedAt).toBeInstanceOf(Date);
	});
});
