import { beforeEach, describe, expect, it } from 'vitest';

import type { ICacheStore } from '@vpn/ports';

export interface CacheStoreHarness {
	readonly store: ICacheStore;
	advance(seconds: number): Promise<void> | void;
}

export function describeCacheStoreContract(
	name: string,
	createHarness: () => Promise<CacheStoreHarness> | CacheStoreHarness,
): void {
	describe(`${name} (ICacheStore contract)`, () => {
		let harness: CacheStoreHarness;
		let store: ICacheStore;

		const key = { owner: 'account-1', namespace: 'session', id: 'abc' } as const;

		beforeEach(async () => {
			harness = await createHarness();
			store = harness.store;
		});

		it('returns null for a key that was never set', async () => {
			await expect(store.get(key)).resolves.toBeNull();
		});

		it('round-trips a value', async () => {
			await store.set(key, { hello: 'world' }, 60);
			await expect(store.get(key)).resolves.toEqual({ hello: 'world' });
		});

		it('overwrites on a second set', async () => {
			await store.set(key, 'first', 60);
			await store.set(key, 'second', 60);
			await expect(store.get(key)).resolves.toBe('second');
		});

		it('keeps entries with the same namespace and id but different owners apart', async () => {
			await store.set({ owner: 'account-1', namespace: 'n', id: 'i' }, 'one', 60);
			await store.set({ owner: 'account-2', namespace: 'n', id: 'i' }, 'two', 60);

			await expect(store.get({ owner: 'account-1', namespace: 'n', id: 'i' })).resolves.toBe('one');
			await expect(store.get({ owner: 'account-2', namespace: 'n', id: 'i' })).resolves.toBe('two');
		});

		it('does not let a global entry collide with an owned one', async () => {
			await store.set({ owner: null, namespace: 'n', id: 'i' }, 'global', 60);
			await store.set({ owner: 'account-1', namespace: 'n', id: 'i' }, 'owned', 60);

			await expect(store.get({ owner: null, namespace: 'n', id: 'i' })).resolves.toBe('global');
		});

		it('keeps namespaces apart', async () => {
			await store.set({ owner: 'a', namespace: 'one', id: 'i' }, 1, 60);
			await store.set({ owner: 'a', namespace: 'two', id: 'i' }, 2, 60);
			await expect(store.get({ owner: 'a', namespace: 'one', id: 'i' })).resolves.toBe(1);
		});

		it('reports an expired entry as absent', async () => {
			await store.set(key, 'value', 10);
			await harness.advance(11);
			await expect(store.get(key)).resolves.toBeNull();
		});

		it('still serves an entry one second before it expires', async () => {
			await store.set(key, 'value', 10);
			await harness.advance(9);
			await expect(store.get(key)).resolves.toBe('value');
		});

		it('restarts the TTL on overwrite', async () => {
			await store.set(key, 'first', 10);
			await harness.advance(9);
			await store.set(key, 'second', 10);
			await harness.advance(5);
			await expect(store.get(key)).resolves.toBe('second');
		});

		it('deletes', async () => {
			await store.set(key, 'value', 60);
			await store.delete(key);
			await expect(store.get(key)).resolves.toBeNull();
		});

		it('treats deleting an absent key as a success', async () => {
			await expect(store.delete(key)).resolves.toBeUndefined();
		});

		it('starts an increment at 1', async () => {
			expect((await store.increment(key, 60)).count).toBe(1);
		});

		it('accumulates increments', async () => {
			await store.increment(key, 60);
			await store.increment(key, 60);
			expect((await store.increment(key, 60)).count).toBe(3);
		});

		it('does not extend the window when incrementing an existing counter', async () => {
			await store.increment(key, 10);
			await harness.advance(6);
			await store.increment(key, 10);
			await harness.advance(6);
			expect((await store.increment(key, 10)).count).toBe(1);
		});

		it('restarts the count after the window expires', async () => {
			await store.increment(key, 10);
			await harness.advance(11);
			expect((await store.increment(key, 10)).count).toBe(1);
		});

		// Without this the caller counts but cannot say when to come back, and a
		// 429 with no Retry-After leaves the client guessing.
		it('reports how much of the window is left', async () => {
			const opened = await store.increment(key, 60);

			expect(opened.ttlSeconds).toBeGreaterThan(0);
			expect(opened.ttlSeconds).toBeLessThanOrEqual(60);
		});

		it('reports a shrinking window as it elapses, in one call rather than two', async () => {
			await store.increment(key, 60);
			await harness.advance(30);

			const later = await store.increment(key, 60);

			expect(later.count).toBe(2);
			expect(later.ttlSeconds).toBeLessThanOrEqual(30);
			expect(later.ttlSeconds).toBeGreaterThan(0);
		});

		it('reports the full window again once the counter has restarted', async () => {
			await store.increment(key, 10);
			await harness.advance(11);

			const restarted = await store.increment(key, 10);

			expect(restarted.count).toBe(1);
			expect(restarted.ttlSeconds).toBeGreaterThan(0);
			expect(restarted.ttlSeconds).toBeLessThanOrEqual(10);
		});
	});
}
