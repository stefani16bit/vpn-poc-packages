/**
 * The behaviour every ISmsSender adapter must exhibit.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import type { ISmsSender, SmsMessage } from '@vpn/ports';

export interface SentSms {
	readonly phoneNumber: string;
	readonly template: string;
}

export interface SmsSenderHarness {
	readonly sender: ISmsSender;
	inspect(): Promise<readonly SentSms[]> | readonly SentSms[];
}

function message(overrides: Partial<SmsMessage> = {}): SmsMessage {
	return {
		phoneNumber: '+5511999999999',
		template: 'verify_phone',
		locale: 'pt-BR',
		variables: { code: '123456' },
		idempotencyKey: 'key-1',
		...overrides,
	};
}

export function describeSmsSenderContract(
	name: string,
	createHarness: () => Promise<SmsSenderHarness> | SmsSenderHarness,
): void {
	describe(`${name} (ISmsSender contract)`, () => {
		let harness: SmsSenderHarness;

		beforeEach(async () => {
			harness = await createHarness();
		});

		it('accepts a message', async () => {
			await harness.sender.send(message());
			expect(await harness.inspect()).toHaveLength(1);
		});

		it('does not send twice for the same idempotency key', async () => {
			await harness.sender.send(message());
			await harness.sender.send(message());
			expect(await harness.inspect()).toHaveLength(1);
		});

		// Normalisation is the caller's job. An adapter that quietly accepts a
		// local format lets the bug through to whichever provider is wired in
		// next, where it surfaces as a silent non-delivery.
		it('rejects a number that is not E.164', async () => {
			await expect(harness.sender.send(message({ phoneNumber: '11999999999' }))).rejects.toThrow();
		});

		it('rejects a number with no country code', async () => {
			await expect(harness.sender.send(message({ phoneNumber: '+0119999' }))).rejects.toThrow();
		});
	});
}
