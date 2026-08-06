import type { CacheKey, ICacheStore, IClock } from '@vpn/ports';

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

	async increment(key: CacheKey, ttlSeconds: number): Promise<number> {
		const flat = flattenCacheKey(key);
		const existing = this.#entries.get(flat);
		const live = existing && existing.expiresAtMs > this.#clock.now().getTime() ? existing : null;

		const next = (typeof live?.value === 'number' ? live.value : 0) + 1;

		this.#entries.set(flat, {
			value: next,
			expiresAtMs: live?.expiresAtMs ?? this.#clock.now().getTime() + ttlSeconds * 1000,
		});
		return next;
	}
}
