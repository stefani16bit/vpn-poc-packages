import type { ISecretStore, SecretVersions } from '@vpn/ports';

// Two, because that is what the rotation window is: writing a third value
// retires the oldest, and a caller still holding it is refused.
const KEPT_VERSIONS = 2;

export class MemorySecretStore implements ISecretStore {
	readonly #secrets = new Map<string, string[]>();

	constructor(seed: Readonly<Record<string, string>> = {}) {
		for (const [ref, value] of Object.entries(seed)) this.seed(ref, value);
	}

	async read(ref: string): Promise<SecretVersions | null> {
		const versions = this.#secrets.get(ref);
		if (!versions || versions.length === 0) return null;

		return { current: versions[0] as string, previous: versions[1] ?? null };
	}

	// Beyond the port, like every other fake: nothing in production writes a
	// secret, so putting one here is a test affordance rather than a capability.
	seed(ref: string, value: string): void {
		this.#secrets.set(ref, [value, ...(this.#secrets.get(ref) ?? [])].slice(0, KEPT_VERSIONS));
	}

	forget(ref: string): void {
		this.#secrets.delete(ref);
	}
}
