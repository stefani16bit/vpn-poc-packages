export interface ISecretStore {
	read(ref: string): Promise<string | null>;
}

export const SECRET_STORE: unique symbol = Symbol.for('vpn.secret-store');
