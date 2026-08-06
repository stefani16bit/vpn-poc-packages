/**
 * In-memory IEmailSender. Doubles as the `memory` e-mail driver.
 *
 * `sent` is the assertion surface: a test that wants to know whether a
 * verification mail went out reads it here instead of reaching into mailpit,
 * which keeps unit tests independent of the devstack.
 */

import type { EmailMessage, IEmailSender } from '@vpn/ports';

export class MemoryEmailSender implements IEmailSender {
	readonly #sent: EmailMessage[] = [];
	readonly #seenKeys = new Set<string>();

	async send(message: EmailMessage): Promise<void> {
		// Idempotency is enforced here, not by the caller. Every adapter has to
		// carry it, otherwise swapping drivers changes retry behaviour.
		if (this.#seenKeys.has(message.idempotencyKey)) return;
		this.#seenKeys.add(message.idempotencyKey);
		this.#sent.push(message);
	}

	get sent(): readonly EmailMessage[] {
		return this.#sent;
	}

	lastTo(recipient: string): EmailMessage | undefined {
		return [...this.#sent].reverse().find((message) => message.to === recipient);
	}

	clear(): void {
		this.#sent.length = 0;
		this.#seenKeys.clear();
	}
}
