/**
 * Everything that owns a credential and a session.
 *
 * Why this is a port even though the first adapter is our own database: the
 * realistic next step for this system is Cognito or an OIDC provider, and the
 * decision that makes that migration expensive is not the storage - it is
 * having session semantics smeared across controllers. Pinning them here means
 * the swap is one adapter, not an audit.
 *
 * Authentication only. What an authenticated account is *allowed* to do is a
 * separate concern and does not belong behind this interface.
 *
 * Contract:
 *   - authenticate returns null for a wrong password AND for an account that
 *     does not exist. Distinguishing them turns the login form into an account
 *     enumeration oracle, and the caller has no legitimate use for the
 *     difference.
 *   - register returns `email_taken` rather than throwing, for the same reason:
 *     the caller is expected to answer the client identically either way.
 *   - refresh ROTATES. The old token is dead the moment a new one is issued, and
 *     presenting an already-rotated token is reported as `reuse_detected` -
 *     that is a stolen-token signal, and the adapter must revoke the whole
 *     family, not just reject the request.
 *   - revokeSession is idempotent.
 *   - changePassword revokes every session. A password change that leaves the
 *     attacker's session alive is the most common way this goes wrong.
 */

export interface Account {
	readonly id: string;
	readonly email: string;
	readonly emailVerifiedAt: Date | null;
	readonly createdAt: Date;
}

export interface Session {
	readonly accountId: string;
	readonly sessionId: string;
	/** Opaque. Never a JWT: it has to be revocable server-side. */
	readonly refreshToken: string;
	readonly expiresAt: Date;
}

export type RegisterOutcome =
	| { readonly kind: 'registered'; readonly account: Account }
	| { readonly kind: 'email_taken' };

export type RefreshOutcome =
	| { readonly kind: 'rotated'; readonly session: Session }
	/** The presented token had already been rotated away. Treat as compromise. */
	| { readonly kind: 'reuse_detected'; readonly sessionId: string }
	| { readonly kind: 'rejected' };

export interface IIdentityProvider {
	register(email: string, password: string): Promise<RegisterOutcome>;
	authenticate(email: string, password: string): Promise<Account | null>;
	findByEmail(email: string): Promise<Account | null>;
	findById(accountId: string): Promise<Account | null>;

	startSession(accountId: string): Promise<Session>;
	refreshSession(refreshToken: string): Promise<RefreshOutcome>;
	revokeSession(refreshToken: string): Promise<void>;
	revokeAllSessions(accountId: string): Promise<void>;

	markEmailVerified(accountId: string): Promise<void>;
	/** Revokes every session as part of the same operation. */
	changePassword(accountId: string, newPassword: string): Promise<void>;
}

export const IDENTITY_PROVIDER = 'IDENTITY_PROVIDER';
