import type { EmailMessage, IEmailSender } from '@vpn/ports';

export class MemoryEmailSender implements IEmailSender {
	readonly #sent: EmailMessage[] = [];
	readonly #seenKeys = new Set<string>();

	async send(message: EmailMessage): Promise<void> {
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
