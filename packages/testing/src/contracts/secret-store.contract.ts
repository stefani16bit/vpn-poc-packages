import { beforeEach, describe, expect, it } from 'vitest';

import type { ISecretStore } from '@vpn/ports';

// Seeding is out of band on purpose: the port has no write, because the
// application never puts a secret anywhere. The harness carries it, so the
// in-memory driver seeds a map and the real one talks to whatever holds the
// secret. Seeding the same ref twice is what opens a rotation window.
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

			await expect(store.read('exit-node/sa')).resolves.toEqual({
				current: 'a-credential',
				previous: null,
			});
		});

		// The whole point of null over throw: the caller has to tell "nobody
		// created this secret" apart from "the machine refused me", and those two
		// send an operator to different places.
		it('answers null for a ref nobody created, rather than throwing', async () => {
			await expect(store.read('exit-node/never-created')).resolves.toBeNull();
		});

		// Null for the ref, never a present object holding an empty string: a
		// caller that reads `.current` off it would build a credential out of
		// nothing and fail somewhere far away.
		it('answers null for the ref itself, not a blank current', async () => {
			await expect(store.read('exit-node/never-created')).not.resolves.toEqual(
				expect.objectContaining({ current: '' }),
			);
		});

		it('answers null once a ref stops existing', async () => {
			await harness.seed('exit-node/temporary', 'a-credential');
			await harness.forget('exit-node/temporary');

			await expect(store.read('exit-node/temporary')).resolves.toBeNull();
		});

		it('keeps two refs apart, which is the only reason to have more than one', async () => {
			await harness.seed('exit-node/sa', 'the-sa-one');
			await harness.seed('exit-node/na', 'the-na-one');

			await expect(store.read('exit-node/sa')).resolves.toEqual({
				current: 'the-sa-one',
				previous: null,
			});
			await expect(store.read('exit-node/na')).resolves.toEqual({
				current: 'the-na-one',
				previous: null,
			});
		});

		it('serves the current value after a ref is written again', async () => {
			await harness.seed('exit-node/sa', 'the-old-one');
			await harness.seed('exit-node/sa', 'the-new-one');

			await expect(store.read('exit-node/sa')).resolves.toEqual({
				current: 'the-new-one',
				previous: 'the-old-one',
			});
		});

		// Absent rather than equal to current: a caller that verifies against both
		// would do the same work twice and, worse, could not tell "never rotated"
		// from "rotated to the same value".
		it('reports no previous value before the first rotation', async () => {
			await harness.seed('auth/signing', 'the-only-one');

			const versions = await store.read('auth/signing');

			expect(versions?.previous).toBeNull();
		});

		// The assertion that gives the window an end. Without it, "accepts two"
		// and "accepts everything it has ever held" pass exactly the same tests,
		// and a value somebody rotated away from precisely because they suspected
		// it would keep working forever.
		it('retires a value once a third one is written', async () => {
			await harness.seed('auth/signing', 'first');
			await harness.seed('auth/signing', 'second');
			await harness.seed('auth/signing', 'third');

			const versions = await store.read('auth/signing');

			expect(versions).toEqual({ current: 'third', previous: 'second' });
			expect(versions?.current).not.toBe('first');
			expect(versions?.previous).not.toBe('first');
		});

		// A credential is base64 far more often than not, and a store that trims
		// or re-encodes turns a valid token into a 401 nobody can explain. It has
		// to hold for the retired half too, which is the one nobody looks at.
		it('returns both values byte for byte, padding and slashes included', async () => {
			const previous = 'StZtsGF+hrd7nHOYtH0GhM/759qnBuUbKdVMEeFyLVU=';
			const current = 'rKCjjZR5cgoZSG0BE1Cjs5wHcOAOYU5Vweb/Gj0rPWg=';
			await harness.seed('exit-node/sa', previous);
			await harness.seed('exit-node/sa', current);

			await expect(store.read('exit-node/sa')).resolves.toEqual({ current, previous });
		});

		// Not a hypothetical: the AWS rotation templates store JSON, so a store
		// that parses opportunistically would hand back an object one day.
		it('does not interpret a value that happens to look like json', async () => {
			await harness.seed('exit-node/sa', '{"token":"not-parsed"}');

			await expect(store.read('exit-node/sa')).resolves.toEqual({
				current: '{"token":"not-parsed"}',
				previous: null,
			});
		});
	});
}
