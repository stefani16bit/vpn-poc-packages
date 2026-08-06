/**
 * The behaviour every IEmailSender adapter must exhibit.
 *
 * `inspect` is how a suite reads what the adapter did without knowing where the
 * message went - the memory adapter reads its own array, the SMTP adapter reads
 * mailpit's API. Without that seam the idempotency assertion could only be
 * written once, against the fake, which is exactly the assertion most likely to
 * be missing from the real adapter.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import type { EmailMessage, IEmailSender } from '@vpn/ports';

export interface SentEmail {
	readonly to: string;
	readonly template: string;
}

export interface EmailSenderHarness {
	readonly sender: IEmailSender;
	/** Everything this adapter has accepted, oldest first. */
	inspect(): Promise<readonly SentEmail[]> | readonly SentEmail[];
}

function message(overrides: Partial<EmailMessage> = {}): EmailMessage {
	return {
		to: 'ada@example.com',
		template: 'verify_email',
		locale: 'pt-BR',
		variables: { token: 'abc123' },
		idempotencyKey: 'key-1',
		...overrides,
	};
}

export function describeEmailSenderContract(
	name: string,
	createHarness: () => Promise<EmailSenderHarness> | EmailSenderHarness,
): void {
	describe(`${name} (IEmailSender contract)`, () => {
		let harness: EmailSenderHarness;

		beforeEach(async () => {
			harness = await createHarness();
		});

		it('accepts a message', async () => {
			await harness.sender.send(message());
			const sent = await harness.inspect();
			expect(sent).toHaveLength(1);
			expect(sent[0]).toMatchObject({ to: 'ada@example.com', template: 'verify_email' });
		});

		// The requirement that makes queue redelivery safe. A retried send must
		// be a no-op, and it must be a SUCCESSFUL no-op - throwing would make the
		// queue retry forever.
		it('does not send twice for the same idempotency key', async () => {
			await harness.sender.send(message());
			await expect(harness.sender.send(message())).resolves.toBeUndefined();
			expect(await harness.inspect()).toHaveLength(1);
		});

		it('sends again for a different idempotency key', async () => {
			await harness.sender.send(message({ idempotencyKey: 'key-1' }));
			await harness.sender.send(message({ idempotencyKey: 'key-2' }));
			expect(await harness.inspect()).toHaveLength(2);
		});

		it('keys idempotency on the key alone, not on the recipient', async () => {
			await harness.sender.send(message({ to: 'ada@example.com' }));
			await harness.sender.send(message({ to: 'grace@example.com' }));
			expect(await harness.inspect()).toHaveLength(1);
		});

		it('carries every template in the union', async () => {
			const templates: EmailMessage['template'][] = [
				'verify_email',
				'reset_password',
				'password_changed',
				'welcome',
				'payment_failed',
				'subscription_canceled',
			];
			for (const [index, template] of templates.entries()) {
				await harness.sender.send(message({ template, idempotencyKey: `t-${index}` }));
			}
			expect(await harness.inspect()).toHaveLength(templates.length);
		});
	});
}
