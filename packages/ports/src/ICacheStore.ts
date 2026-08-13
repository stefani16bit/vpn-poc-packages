export interface CacheKey {
	readonly owner: string | null;
	readonly namespace: string;
	readonly id: string;
}

export interface CacheCounter {
	readonly count: number;
	readonly ttlSeconds: number;
}

export interface ICacheStore {
	get<T>(key: CacheKey): Promise<T | null>;
	set<T>(key: CacheKey, value: T, ttlSeconds: number): Promise<void>;
	delete(key: CacheKey): Promise<void>;
	increment(key: CacheKey, ttlSeconds: number): Promise<CacheCounter>;
}

export const CACHE_STORE: unique symbol = Symbol.for('vpn.cache-store');
