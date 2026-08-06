/**
 * A password hasher for tests. NOT a security control - it is reversible by
 * inspection, and the prefix says so out loud so that a stray production wiring
 * is obvious in a database dump rather than subtle.
 *
 * It exists because Argon2 is deliberately slow: a suite that creates fifty
 * accounts pays that cost fifty times, and the usual fix is to stop running the
 * auth tests.
 */

import type { IPasswordHasher } from '@vpn/ports';

const PREFIX = 'fake$';

export class FakePasswordHasher implements IPasswordHasher {
	async hash(plaintext: string): Promise<string> {
		return `${PREFIX}${plaintext}`;
	}

	async verify(plaintext: string, hash: string): Promise<boolean> {
		// Matches the real adapter's contract: a foreign or corrupt hash reads as
		// a wrong password, never as a throw.
		if (!hash.startsWith(PREFIX)) return false;
		return hash.slice(PREFIX.length) === plaintext;
	}

	needsRehash(hash: string): boolean {
		return !hash.startsWith(PREFIX);
	}
}
