import { beforeEach, describe, expect, it } from 'vitest';

import type { ISecretStore } from '@vpn/ports';

// Seeding is out of band on purpose: the port has no write, because the
// application never puts a secret anywhere. The harness carries it, so the
// in-memory driver seeds a map and the real one talks to whatever holds the
// secret.
export interface SecretStoreHarness {
	readonly store: ISecretStore;
	seed(ref: string, value: string): Promise<void> | void;
	forget(ref: string): Promise<void> | void;
}

export function describeSecretStoreContract(
	name: string,
	createHarness: () => Promise<SecretStoreHarness> | SecretStoreHarness,
): void {
	describe(`${name} (ISecretStore contract)`, () => {
		let harness: SecretStoreHarness;
		let store: ISecretStore;

		beforeEach(async () => {
			harness = await createHarness();
			store = harness.store;
		});

		it('reads back what was seeded', async () => {
			await harness.seed('exit-node/sa', 'a-credential');

			await expect(store.read('exit-node/sa')).resolves.toBe('a-credential');
		});

		// The whole point of null over throw: the caller has to tell "nobody
		// created this secret" apart from "the machine refused me", and those two
		// send an operator to different places.
		it('answers null for a ref nobody created, rather than throwing', async () => {
			await expect(store.read('exit-node/never-created')).resolves.toBeNull();
		});

		it('answers null once a ref stops existing', async () => {
			await harness.seed('exit-node/temporary', 'a-credential');
			await harness.forget('exit-node/temporary');

			await expect(store.read('exit-node/temporary')).resolves.toBeNull();
		});

		it('keeps two refs apart, which is the only reason to have more than one', async () => {
			await harness.seed('exit-node/sa', 'the-sa-one');
			await harness.seed('exit-node/na', 'the-na-one');

			await expect(store.read('exit-node/sa')).resolves.toBe('the-sa-one');
			await expect(store.read('exit-node/na')).resolves.toBe('the-na-one');
		});

		it('serves the current value after a ref is written again', async () => {
			await harness.seed('exit-node/sa', 'the-old-one');
			await harness.seed('exit-node/sa', 'the-new-one');

			await expect(store.read('exit-node/sa')).resolves.toBe('the-new-one');
		});

		// A credential is base64 far more often than not, and a store that trims
		// or re-encodes turns a valid token into a 401 nobody can explain.
		it('returns the value byte for byte, padding and slashes included', async () => {
			const credential = 'StZtsGF+hrd7nHOYtH0GhM/759qnBuUbKdVMEeFyLVU=';
			await harness.seed('exit-node/sa', credential);

			await expect(store.read('exit-node/sa')).resolves.toBe(credential);
		});

		// Not a hypothetical: the AWS rotation templates store JSON, so a store
		// that parses opportunistically would hand back an object one day.
		it('does not interpret a value that happens to look like json', async () => {
			await harness.seed('exit-node/sa', '{"token":"not-parsed"}');

			await expect(store.read('exit-node/sa')).resolves.toBe('{"token":"not-parsed"}');
		});
	});
}
