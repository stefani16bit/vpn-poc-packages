/**
 * Key/value cache with a TTL.
 *
 * Why the structured key: a cache is the easiest place in the system to leak
 * one user's data to another, because a key collision is invisible - it looks
 * like a cache hit. Making the namespace and the owner part of the key *type*
 * means a caller cannot forget them; the adapter, not the caller, decides how
 * they are flattened into a string.
 *
 * `owner: null` is deliberate and explicit rather than optional: writing
 * `{ owner: null }` is a decision the reader can see, `{}` is an omission.
 *
 * Contract:
 *   - get returns null for both "absent" and "expired"; callers cannot tell
 *     them apart and must not try
 *   - set with the same key overwrites, and resets the TTL
 *   - delete is idempotent: deleting an absent key is a success
 *   - increment on an absent key starts from 0 and applies the TTL; on a
 *     present key it leaves the existing TTL alone, so a rate-limit window
 *     cannot be extended by the traffic it is limiting
 */

export interface CacheKey {
	/** Who the entry belongs to. null means genuinely global, never "unknown". */
	readonly owner: string | null;
	readonly namespace: string;
	readonly id: string;
}

export interface ICacheStore {
	get<T>(key: CacheKey): Promise<T | null>;
	set<T>(key: CacheKey, value: T, ttlSeconds: number): Promise<void>;
	delete(key: CacheKey): Promise<void>;
	/** Returns the value after the increment. */
	increment(key: CacheKey, ttlSeconds: number): Promise<number>;
}

export const CACHE_STORE = 'CACHE_STORE';
