import type { CacheCounter, CacheKey, ICacheStore, IClock } from '@vpn/ports';

interface Entry {
	readonly value: unknown;
	readonly expiresAtMs: number;
}

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

	// Fake-only, like the seeds on MemoryBillingProvider. A suite that shares one
	// process shares the counters in it, and a rate limit keyed on the caller
	// address is shared state exactly like a table is.
	clear(): void {
		this.#entries.clear();
	}

	async increment(key: CacheKey, ttlSeconds: number): Promise<CacheCounter> {
		const flat = flattenCacheKey(key);
		const nowMs = this.#clock.now().getTime();
		const existing = this.#entries.get(flat);
		const live = existing && existing.expiresAtMs > nowMs ? existing : null;

		const count = (typeof live?.value === 'number' ? live.value : 0) + 1;
		const expiresAtMs = live?.expiresAtMs ?? nowMs + ttlSeconds * 1000;

		this.#entries.set(flat, { value: count, expiresAtMs });

		// Rounded up: reporting 0 to a caller that still has 400ms of window left
		// invites a retry that trips the same limit again.
		return { count, ttlSeconds: Math.ceil((expiresAtMs - nowMs) / 1000) };
	}
}
