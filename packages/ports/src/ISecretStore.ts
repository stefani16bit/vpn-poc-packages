export interface SecretVersions {
	readonly current: string;
	readonly previous: string | null;
}

export interface ISecretStore {
	read(ref: string): Promise<SecretVersions | null>;
}

export const SECRET_STORE: unique symbol = Symbol.for('vpn.secret-store');
