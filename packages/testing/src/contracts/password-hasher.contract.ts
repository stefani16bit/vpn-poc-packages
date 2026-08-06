/**
 * The behaviour every IPasswordHasher adapter must exhibit.
 */

import { describe, expect, it } from 'vitest';

import type { IPasswordHasher } from '@vpn/ports';

export function describePasswordHasherContract(
	name: string,
	createHasher: () => Promise<IPasswordHasher> | IPasswordHasher,
): void {
	describe(`${name} (IPasswordHasher contract)`, () => {
		it('verifies a hash it produced', async () => {
			const hasher = await createHasher();
			const hash = await hasher.hash('a-sufficiently-long-password');
			await expect(hasher.verify('a-sufficiently-long-password', hash)).resolves.toBe(true);
		});

		it('rejects a different password', async () => {
			const hasher = await createHasher();
			const hash = await hasher.hash('a-sufficiently-long-password');
			await expect(hasher.verify('something-else-entirely', hash)).resolves.toBe(false);
		});

		// Weak on purpose. A real assertion here would have to know the adapter's
		// format, which is the one thing the contract must not encode - so this
		// catches the identity-function mistake and nothing subtler. The test
		// hasher passes it while still being trivially reversible, which is why
		// FakePasswordHasher's own comment says out loud that it is not a
		// security control.
		it('does not return the password unchanged', async () => {
			const hasher = await createHasher();
			const secret = 'correct horse battery staple';
			await expect(hasher.hash(secret)).resolves.not.toBe(secret);
		});

		// A corrupt row must read as a wrong password. Throwing here would turn
		// the login endpoint into an oracle: a 500 for a known-broken account and
		// a 401 for everything else tells an attacker which addresses exist.
		it('returns false rather than throwing for a malformed hash', async () => {
			const hasher = await createHasher();
			await expect(hasher.verify('anything', 'not-a-hash')).resolves.toBe(false);
		});

		it('returns false rather than throwing for an empty hash', async () => {
			const hasher = await createHasher();
			await expect(hasher.verify('anything', '')).resolves.toBe(false);
		});

		it('does not ask to rehash something it just produced', async () => {
			const hasher = await createHasher();
			const hash = await hasher.hash('a-sufficiently-long-password');
			expect(hasher.needsRehash(hash)).toBe(false);
		});

		it('asks to rehash a foreign hash', async () => {
			const hasher = await createHasher();
			expect(hasher.needsRehash('$2b$04$abcdefghijklmnopqrstuv')).toBe(true);
		});
	});
}
