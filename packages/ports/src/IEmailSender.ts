/**
 * Transactional e-mail.
 *
 * Why the closed template union instead of a subject/body pair: with free-form
 * bodies, the copy for a password reset ends up inline in a service, in one
 * language, and the provider swap becomes a rewrite of every call site. A
 * template key is a contract the adapter renders however its provider wants -
 * SMTP with a local template, or an SES template id.
 *
 * Contract:
 *   - send is idempotent per idempotencyKey: the same key never sends twice,
 *     and the second call is a success, not an error. Retries are the normal
 *     case here, not the exception - a queue redelivery must not re-mail a user.
 *   - the caller resolves the recipient's locale; the port takes it as data
 *   - send resolves once the message is ACCEPTED for delivery, which is not the
 *     same as delivered, and no adapter may pretend otherwise
 */

export type EmailTemplate =
	| 'verify_email'
	| 'reset_password'
	| 'password_changed'
	| 'welcome'
	| 'payment_failed'
	| 'subscription_canceled';

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

export const EMAIL_SENDER = 'EMAIL_SENDER';
