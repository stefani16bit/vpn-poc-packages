export interface PeerSpec {
	readonly publicKey: string;
	readonly tunnelAddress: string;
}

export interface ExitNodeDescription {
	readonly publicKey: string;
	readonly endpoint: string;
	readonly allowedIps: readonly string[];
}

export interface IExitNode {
	describe(): Promise<ExitNodeDescription>;
	provisionPeer(peer: PeerSpec): Promise<void>;
	revokePeer(publicKey: string): Promise<void>;
	listPeers(): Promise<readonly PeerSpec[]>;
}

export const EXIT_NODE: unique symbol = Symbol.for('vpn.exit-node');
