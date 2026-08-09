export type EmailTemplate =
	| 'verify_email'
	| 'reset_password'
	| 'password_changed'
	| 'welcome'
	| 'payment_failed'
	| 'subscription_activated'
	| 'subscription_cancel_scheduled'
	| 'subscription_resumed'
	| 'subscription_canceled'
	| 'access_revoked';

export interface EmailMessage {
	readonly to: string;
	readonly template: EmailTemplate;
	readonly locale: string;
	readonly variables: Readonly<Record<string, string>>;
	readonly idempotencyKey: string;
}

export interface IEmailSender {
	send(message: EmailMessage): Promise<void>;
}

export const EMAIL_SENDER: unique symbol = Symbol.for('vpn.email-sender');
