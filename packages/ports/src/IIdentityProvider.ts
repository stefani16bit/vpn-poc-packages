export interface Account {
	readonly id: string;
	readonly email: string;
	readonly emailVerifiedAt: Date | null;
	readonly locale: string;
	readonly createdAt: Date;
}

export interface Session {
	readonly accountId: string;
	readonly sessionId: string;
	readonly refreshToken: string;
	readonly expiresAt: Date;
}

export type RegisterOutcome =
	| { readonly kind: 'registered'; readonly account: Account }
	| { readonly kind: 'email_taken' };

export type RefreshOutcome =
	| { readonly kind: 'rotated'; readonly session: Session }
	| { readonly kind: 'reuse_detected'; readonly sessionId: string }
	| { readonly kind: 'rejected' };

export interface IIdentityProvider {
	register(email: string, password: string, locale: string): Promise<RegisterOutcome>;
	authenticate(email: string, password: string): Promise<Account | null>;
	findByEmail(email: string): Promise<Account | null>;
	findById(accountId: string): Promise<Account | null>;

	startSession(accountId: string): Promise<Session>;
	refreshSession(refreshToken: string): Promise<RefreshOutcome>;
	revokeSession(refreshToken: string): Promise<void>;
	revokeAllSessions(accountId: string): Promise<void>;

	markEmailVerified(accountId: string): Promise<void>;
	setLocale(accountId: string, locale: string): Promise<void>;
	changePassword(accountId: string, newPassword: string): Promise<void>;
}

export const IDENTITY_PROVIDER: unique symbol = Symbol.for('vpn.identity-provider');
