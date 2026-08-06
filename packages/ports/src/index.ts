/**
 * The full port surface. Adding a file here without exporting it from this
 * barrel is the one way a port can exist and be unusable, so the guard spec
 * asserts the two stay in step.
 *
 * Rate limiting is deliberately NOT a port. It is a policy expressed over
 * ICacheStore.increment, and our own policies do not get interfaces - only the
 * things we would have to replace do. See docs/03-DECISION-LOG.md DEC-004.
 */

export type { IClock } from './IClock.js';
export { CLOCK } from './IClock.js';

export type { ICacheStore, CacheKey } from './ICacheStore.js';
export { CACHE_STORE } from './ICacheStore.js';

export type {
	IIdentityProvider,
	Account,
	Session,
	RegisterOutcome,
	RefreshOutcome,
} from './IIdentityProvider.js';
export { IDENTITY_PROVIDER } from './IIdentityProvider.js';

export type { IPasswordHasher } from './IPasswordHasher.js';
export { PASSWORD_HASHER } from './IPasswordHasher.js';

export type { IEmailSender, EmailMessage, EmailTemplate } from './IEmailSender.js';
export { EMAIL_SENDER } from './IEmailSender.js';

export type { ISmsSender, SmsMessage, SmsTemplate } from './ISmsSender.js';
export { SMS_SENDER } from './ISmsSender.js';

export type {
	IBillingProvider,
	Subscription,
	SubscriptionStatus,
	CheckoutRequest,
	CheckoutSession,
	NormalizedBillingEvent,
} from './IBillingProvider.js';
export { BILLING_PROVIDER } from './IBillingProvider.js';

export type { IObjectStorage, StoredObject } from './IObjectStorage.js';
export { OBJECT_STORAGE } from './IObjectStorage.js';

export type { IErrorReporter, ErrorContext } from './IErrorReporter.js';
export { ERROR_REPORTER } from './IErrorReporter.js';
