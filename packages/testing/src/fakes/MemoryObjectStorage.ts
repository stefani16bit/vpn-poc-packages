/**
 * In-memory IObjectStorage. Doubles as the `memory` storage driver.
 */

import type { IObjectStorage, StoredObject } from '@vpn/ports';

export class MemoryObjectStorage implements IObjectStorage {
	readonly #objects = new Map<string, StoredObject>();

	async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
		// A copy: the caller owns its buffer and may reuse it.
		this.#objects.set(key, { body: Uint8Array.from(body), contentType });
	}

	async get(key: string): Promise<StoredObject | null> {
		const found = this.#objects.get(key);
		return found ? { body: Uint8Array.from(found.body), contentType: found.contentType } : null;
	}

	async delete(key: string): Promise<void> {
		this.#objects.delete(key);
	}

	async signedUrl(key: string, expiresInSeconds: number): Promise<string> {
		// Deliberately not a real signature. The contract only promises a URL
		// that carries the key and an expiry, and a fake that invented crypto
		// here would be asserting something no caller is allowed to rely on.
		return `memory://objects/${encodeURIComponent(key)}?expires_in=${expiresInSeconds}`;
	}
}
