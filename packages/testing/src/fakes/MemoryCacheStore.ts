/**
 * In-memory ICacheStore. Doubles as the `memory` cache driver, so it is real
 * code and not a stub: nothing here may be a shortcut that only works under a
 * test.
 *
 * Expiry is evaluated on read against the injected clock rather than by a timer.
 * A timer-based fake cannot answer "is this expired?" without actually waiting,
 * which is what makes TTL tests slow and then flaky.
 */

import type { CacheKey, ICacheStore, IClock } from '@vpn/ports';

interface Entry {
	readonly value: unknown;
	readonly expiresAtMs: number;
}

/**
 * Exported because every adapter has to flatten the structured key the same
 * way. If Redis and memory disagreed on the separator, a cache written by one
 * driver would be invisible to the other during a migration.
 *
 * `owner: null` becomes the literal segment "global" rather than an empty
 * string, so a null owner cannot collide with an account whose id is "".
 */
export function flattenCacheKey(key: CacheKey): string {
	return `${key.owner ?? 'global'}:${key.namespace}:${key.id}`;
}

export class MemoryCacheStore implements ICacheStore {
	readonly #entries = new Map<string, Entry>();
	readonly #clock: IClock;

	constructor(clock: IClock) {
		this.#clock = clock;
	}

	async get<T>(key: CacheKey): Promise<T | null> {
		const flat = flattenCacheKey(key);
		const entry = this.#entries.get(flat);
		if (!entry) return null;

		if (entry.expiresAtMs <= this.#clock.now().getTime()) {
			// Drop it here rather than leaving it to a sweeper: an expired entry
			// that lingers is indistinguishable from a live one to `size`-style
			// introspection, and tests reach for that.
			this.#entries.delete(flat);
			return null;
		}
		return entry.value as T;
	}

	async set<T>(key: CacheKey, value: T, ttlSeconds: number): Promise<void> {
		this.#entries.set(flattenCacheKey(key), {
			value,
			expiresAtMs: this.#clock.now().getTime() + ttlSeconds * 1000,
		});
	}

	async delete(key: CacheKey): Promise<void> {
		this.#entries.delete(flattenCacheKey(key));
	}

	async increment(key: CacheKey, ttlSeconds: number): Promise<number> {
		const flat = flattenCacheKey(key);
		const existing = this.#entries.get(flat);
		const live = existing && existing.expiresAtMs > this.#clock.now().getTime() ? existing : null;

		const next = (typeof live?.value === 'number' ? live.value : 0) + 1;

		// The existing expiry is preserved on purpose. Refreshing it would let a
		// caller hold a rate-limit window open forever by continuing to hit it.
		this.#entries.set(flat, {
			value: next,
			expiresAtMs: live?.expiresAtMs ?? this.#clock.now().getTime() + ttlSeconds * 1000,
		});
		return next;
	}
}
