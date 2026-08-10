import type { ExitNodeDescription, IExitNode, PeerSpec } from '@vpn/ports';

export interface MemoryExitNodeOptions {
	readonly publicKey?: string;
	readonly endpoint?: string;
	readonly allowedIps?: readonly string[];
}

const DEFAULTS = {
	publicKey: 'rKCjjZR5cgoZSG0BE1Cjs5wHcOAOYU5Vweb/Gj0rPWg=',
	endpoint: '127.0.0.1:21820',
	allowedIps: ['10.13.13.0/24'],
} as const;

export class MemoryExitNode implements IExitNode {
	readonly #peers = new Map<string, string>();
	readonly #description: ExitNodeDescription;

	constructor(options: MemoryExitNodeOptions = {}) {
		this.#description = {
			publicKey: options.publicKey ?? DEFAULTS.publicKey,
			endpoint: options.endpoint ?? DEFAULTS.endpoint,
			allowedIps: options.allowedIps ?? DEFAULTS.allowedIps,
		};
	}

	async describe(): Promise<ExitNodeDescription> {
		return this.#description;
	}

	async provisionPeer(peer: PeerSpec): Promise<void> {
		this.#peers.set(peer.publicKey, peer.tunnelAddress);
	}

	async revokePeer(publicKey: string): Promise<void> {
		this.#peers.delete(publicKey);
	}

	async listPeers(): Promise<readonly PeerSpec[]> {
		return [...this.#peers].map(([publicKey, tunnelAddress]) => ({ publicKey, tunnelAddress }));
	}
}
