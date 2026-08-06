/**
 * Dev-only entry point: everything reachable from here imports vitest.
 *
 * An adapter is not done until its spec file calls the matching describe*
 * function. That is the whole enforcement mechanism behind "every port has at
 * least two interchangeable implementations".
 */

export { describeCacheStoreContract } from './cache-store.contract.js';
export type { CacheStoreHarness } from './cache-store.contract.js';

export { describeIdentityProviderContract } from './identity-provider.contract.js';
export type { IdentityProviderHarness } from './identity-provider.contract.js';

export { describePasswordHasherContract } from './password-hasher.contract.js';

export { describeEmailSenderContract } from './email-sender.contract.js';
export type { EmailSenderHarness, SentEmail } from './email-sender.contract.js';

export { describeSmsSenderContract } from './sms-sender.contract.js';
export type { SmsSenderHarness, SentSms } from './sms-sender.contract.js';

export { describeObjectStorageContract } from './object-storage.contract.js';

export { describeBillingProviderContract } from './billing-provider.contract.js';
export type { BillingProviderHarness, SignedWebhook } from './billing-provider.contract.js';
