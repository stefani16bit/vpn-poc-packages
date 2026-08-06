export type SmsTemplate = 'verify_phone' | 'login_code';

export interface SmsMessage {
	readonly phoneNumber: string;
	readonly template: SmsTemplate;
	readonly locale: string;
	readonly variables: Readonly<Record<string, string>>;
	readonly idempotencyKey: string;
}

export interface ISmsSender {
	send(message: SmsMessage): Promise<void>;
}

export const SMS_SENDER: unique symbol = Symbol.for('vpn.sms-sender');
