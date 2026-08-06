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

export const OBJECT_STORAGE: unique symbol = Symbol.for('vpn.object-storage');
