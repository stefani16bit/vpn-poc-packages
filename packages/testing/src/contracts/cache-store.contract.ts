/**
 * The behaviour every ICacheStore adapter must exhibit.
 *
 * Why a shared suite instead of per-adapter tests: the value of a port is that
 * the caller cannot tell which adapter it got. That claim is only true if both
 * adapters are held to the same assertions - and the ones that drift are always
 * the edge cases nobody wrote twice (expiry, increment on a missing key,
 * delete-the-absent).
 *
 * Usage, from an adapter's own spec file:
 *
 *   describeCacheStoreContract('RedisCacheStore', async () => {
 *     const clock = new FixedClock();
 *     return { store: new RedisCacheStore(client, clock), clock };
 *   });
 */

import { beforeEach, describe, expect, it } from 'vitest';

import type { ICacheStore } from '@vpn/ports';

export interface CacheStoreHarness {
	readonly store: ICacheStore;
	/** Moves the adapter's notion of time forward. */
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

		// The isolation guarantee the structured key exists to provide. If this
		// fails, one account can read another's cached data.
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
			await expect(store.increment(key, 60)).resolves.toBe(1);
		});

		it('accumulates increments', async () => {
			await store.increment(key, 60);
			await store.increment(key, 60);
			await expect(store.increment(key, 60)).resolves.toBe(3);
		});

		// The whole point of a rate limit: the window has to end even while the
		// caller keeps hitting it. An adapter that refreshes the TTL on every
		// increment produces a limiter that never resets under sustained load.
		it('does not extend the window when incrementing an existing counter', async () => {
			await store.increment(key, 10);
			await harness.advance(6);
			await store.increment(key, 10);
			await harness.advance(6);
			await expect(store.increment(key, 10)).resolves.toBe(1);
		});

		it('restarts the count after the window expires', async () => {
			await store.increment(key, 10);
			await harness.advance(11);
			await expect(store.increment(key, 10)).resolves.toBe(1);
		});
	});
}
