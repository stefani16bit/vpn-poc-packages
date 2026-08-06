import type { IPasswordHasher } from '@vpn/ports';

const PREFIX = 'fake$';

export class FakePasswordHasher implements IPasswordHasher {
	async hash(plaintext: string): Promise<string> {
		return `${PREFIX}${plaintext}`;
	}

	async verify(plaintext: string, hash: string): Promise<boolean> {
		if (!hash.startsWith(PREFIX)) return false;
		return hash.slice(PREFIX.length) === plaintext;
	}

	needsRehash(hash: string): boolean {
		return !hash.startsWith(PREFIX);
	}
}
