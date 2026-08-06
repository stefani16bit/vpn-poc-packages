/**
 * In-memory ISmsSender. Doubles as the `memory` SMS driver.
 */

import type { ISmsSender, SmsMessage } from '@vpn/ports';

export class MemorySmsSender implements ISmsSender {
	readonly #sent: SmsMessage[] = [];
	readonly #seenKeys = new Set<string>();

	async send(message: SmsMessage): Promise<void> {
		// The port says E.164 and this adapter enforces it. A fake that accepts
		// what the real provider rejects is worse than no fake: it makes the test
		// suite green on input that fails in production.
		if (!/^\+[1-9]\d{7,14}$/.test(message.phoneNumber)) {
			throw new Error(`phoneNumber must be E.164, got: ${message.phoneNumber}`);
		}
		if (this.#seenKeys.has(message.idempotencyKey)) return;
		this.#seenKeys.add(message.idempotencyKey);
		this.#sent.push(message);
	}

	get sent(): readonly SmsMessage[] {
		return this.#sent;
	}

	clear(): void {
		this.#sent.length = 0;
		this.#seenKeys.clear();
	}
}
