export interface IPasswordHasher {
	hash(plaintext: string): Promise<string>;
	verify(plaintext: string, hash: string): Promise<boolean>;
	needsRehash(hash: string): boolean;
}

export const PASSWORD_HASHER: unique symbol = Symbol.for('vpn.password-hasher');
