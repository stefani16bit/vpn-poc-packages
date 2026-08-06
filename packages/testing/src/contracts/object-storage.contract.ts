/**
 * The behaviour every IObjectStorage adapter must exhibit.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import type { IObjectStorage } from '@vpn/ports';

export function describeObjectStorageContract(
	name: string,
	createStorage: () => Promise<IObjectStorage> | IObjectStorage,
): void {
	describe(`${name} (IObjectStorage contract)`, () => {
		let storage: IObjectStorage;
		const body = new TextEncoder().encode('hello');

		beforeEach(async () => {
			storage = await createStorage();
		});

		it('round-trips an object', async () => {
			await storage.put('a/b.txt', body, 'text/plain');
			const found = await storage.get('a/b.txt');
			expect(found?.contentType).toBe('text/plain');
			expect(new TextDecoder().decode(found?.body)).toBe('hello');
		});

		it('returns null for a missing key instead of throwing', async () => {
			await expect(storage.get('absent')).resolves.toBeNull();
		});

		it('overwrites', async () => {
			await storage.put('k', body, 'text/plain');
			await storage.put('k', new TextEncoder().encode('replaced'), 'text/plain');
			const found = await storage.get('k');
			expect(new TextDecoder().decode(found?.body)).toBe('replaced');
		});

		// The caller owns its buffer and is entitled to reuse it. An adapter that
		// keeps the reference hands out whatever the caller wrote next.
		it('does not alias the caller buffer', async () => {
			const mutable = new TextEncoder().encode('original');
			await storage.put('k', mutable, 'text/plain');
			mutable.set(new TextEncoder().encode('MUTATED!'));

			const found = await storage.get('k');
			expect(new TextDecoder().decode(found?.body)).toBe('original');
		});

		it('deletes', async () => {
			await storage.put('k', body, 'text/plain');
			await storage.delete('k');
			await expect(storage.get('k')).resolves.toBeNull();
		});

		it('treats deleting an absent key as a success', async () => {
			await expect(storage.delete('absent')).resolves.toBeUndefined();
		});

		it('signs a URL that carries the key', async () => {
			await storage.put('a/b.txt', body, 'text/plain');
			const url = await storage.signedUrl('a/b.txt', 300);
			expect(url).toContain('b.txt');
		});
	});
}
