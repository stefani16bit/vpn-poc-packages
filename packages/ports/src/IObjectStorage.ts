/**
 * Blob storage.
 *
 * Contract:
 *   - put overwrites an existing key without complaint
 *   - get returns null for a missing key rather than throwing; "absent" is an
 *     ordinary answer, not an exception
 *   - delete is idempotent
 *   - signedUrl produces a URL usable without our credentials until it expires.
 *     The adapter, not the caller, decides how; the caller may not assume the
 *     URL is stable or guessable.
 */

export interface StoredObject {
	readonly body: Uint8Array;
	readonly contentType: string;
}

export interface IObjectStorage {
	put(key: string, body: Uint8Array, contentType: string): Promise<void>;
	get(key: string): Promise<StoredObject | null>;
	delete(key: string): Promise<void>;
	signedUrl(key: string, expiresInSeconds: number): Promise<string>;
}

export const OBJECT_STORAGE = 'OBJECT_STORAGE';
