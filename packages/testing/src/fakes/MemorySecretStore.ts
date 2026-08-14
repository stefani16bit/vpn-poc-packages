import type { ISecretStore } from '@vpn/ports';

export class MemorySecretStore implements ISecretStore {
	readonly #secrets = new Map<string, string>();

	constructor(seed: Readonly<Record<string, string>> = {}) {
		for (const [ref, value] of Object.entries(seed)) this.#secrets.set(ref, value);
	}

	async read(ref: string): Promise<string | null> {
		return this.#secrets.get(ref) ?? null;
	}

	// Beyond the port, like every other fake: nothing in production writes a
	// secret, so putting one here is a test affordance rather than a capability.
	seed(ref: string, value: string): void {
		this.#secrets.set(ref, value);
	}

	forget(ref: string): void {
		this.#secrets.delete(ref);
	}
}
