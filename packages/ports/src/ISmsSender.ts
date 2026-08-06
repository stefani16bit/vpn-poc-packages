/**
 * Transactional SMS. Mirrors IEmailSender on purpose.
 *
 * Why it exists before a real provider does: SMS verification is on the roadmap
 * and the shape of the call site is the part that is expensive to change later.
 * With the port defined now, adding SNS or Twilio is one adapter and one env
 * value; added later, it is a change to every place that assumes verification
 * means e-mail.
 *
 * The only adapter in this phase writes the code to the log. That is a
 * deliberate dev-only affordance and the reason the adapter is named for it.
 *
 * Contract:
 *   - phoneNumber is E.164. The port does not normalise; a caller passing a
 *     local format is a bug the adapter is allowed to reject.
 *   - send is idempotent per idempotencyKey, as with e-mail
 */

export type SmsTemplate = 'verify_phone' | 'login_code';

export interface SmsMessage {
	/** E.164, e.g. +5511999999999. */
	readonly phoneNumber: string;
	readonly template: SmsTemplate;
	readonly locale: string;
	readonly variables: Readonly<Record<string, string>>;
	readonly idempotencyKey: string;
}

export interface ISmsSender {
	send(message: SmsMessage): Promise<void>;
}

export const SMS_SENDER = 'SMS_SENDER';
