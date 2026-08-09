import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { IExitNode } from '@vpn/ports';

export interface ExitNodeHarness {
	readonly node: IExitNode;
}

// Throwaway keys that belong to this suite alone. A real node is shared state,
// and reusing a key some devstack fixture seeded would revoke a live tunnel.
const ADA = {
	publicKey: 'hslPZ8OuAwL0RUaJPhxCw+XqWYgfm4ud70Y2FRzjaCM=',
	tunnelAddress: '10.13.13.202/32',
} as const;

const GRACE = {
	publicKey: 'iNzK8AwMwfCghBcaNNdc8zgw63whVqeXAhRLUNg/gUk=',
	tunnelAddress: '10.13.13.203/32',
} as const;

export function describeExitNodeContract(
	name: string,
	createHarness: () => Promise<ExitNodeHarness> | ExitNodeHarness,
): void {
	describe(`${name} (IExitNode contract)`, () => {
		let node: IExitNode;

		beforeEach(async () => {
			({ node } = await createHarness());
			await node.revokePeer(ADA.publicKey);
			await node.revokePeer(GRACE.publicKey);
		});

		afterEach(async () => {
			await node.revokePeer(ADA.publicKey);
			await node.revokePeer(GRACE.publicKey);
		});

		it('describes itself with a public key a client can dial', async () => {
			const description = await node.describe();

			expect(description.publicKey).toBeTruthy();
			expect(description.endpoint).toBeTruthy();
			expect(description.allowedIps.length).toBeGreaterThan(0);
		});

		it('does not report a peer public key as its own', async () => {
			await node.provisionPeer(ADA);

			expect((await node.describe()).publicKey).not.toBe(ADA.publicKey);
		});

		it('lists a peer once it is provisioned', async () => {
			await node.provisionPeer(ADA);

			expect(await node.listPeers()).toContain(ADA.publicKey);
		});

		it('lists nothing before anything is provisioned', async () => {
			expect(await node.listPeers()).not.toContain(ADA.publicKey);
		});

		it('converges when the same peer is provisioned twice', async () => {
			await node.provisionPeer(ADA);
			await node.provisionPeer(ADA);

			const peers = await node.listPeers();
			expect(peers.filter((key) => key === ADA.publicKey)).toHaveLength(1);
		});

		it('moves a peer to a new address rather than keeping both', async () => {
			await node.provisionPeer(ADA);
			await node.provisionPeer({ ...ADA, tunnelAddress: '10.13.13.9/32' });

			const peers = await node.listPeers();
			expect(peers.filter((key) => key === ADA.publicKey)).toHaveLength(1);
		});

		it('keeps two peers apart', async () => {
			await node.provisionPeer(ADA);
			await node.provisionPeer(GRACE);

			const peers = await node.listPeers();
			expect(peers).toContain(ADA.publicKey);
			expect(peers).toContain(GRACE.publicKey);
		});

		it('stops listing a peer once it is revoked', async () => {
			await node.provisionPeer(ADA);
			await node.revokePeer(ADA.publicKey);

			expect(await node.listPeers()).not.toContain(ADA.publicKey);
		});

		it('leaves the other peers alone when one is revoked', async () => {
			await node.provisionPeer(ADA);
			await node.provisionPeer(GRACE);
			await node.revokePeer(ADA.publicKey);

			expect(await node.listPeers()).toContain(GRACE.publicKey);
		});

		it('treats revoking an absent peer as a success, because a retry must be safe', async () => {
			await expect(node.revokePeer(ADA.publicKey)).resolves.toBeUndefined();
		});

		it('treats revoking the same peer twice as a success', async () => {
			await node.provisionPeer(ADA);
			await node.revokePeer(ADA.publicKey);

			await expect(node.revokePeer(ADA.publicKey)).resolves.toBeUndefined();
		});

		it('takes a peer back after it was revoked', async () => {
			await node.provisionPeer(ADA);
			await node.revokePeer(ADA.publicKey);
			await node.provisionPeer(ADA);

			expect(await node.listPeers()).toContain(ADA.publicKey);
		});
	});
}
