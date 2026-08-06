import { randomUUID } from 'node:crypto';

import type {
	Account,
	IClock,
	IIdentityProvider,
	IPasswordHasher,
	RefreshOutcome,
	RegisterOutcome,
	Session,
} from '@vpn/ports';

interface AccountRow {
	id: string;
	email: string;
	passwordHash: string;
	emailVerifiedAt: Date | null;
	locale: string;
	createdAt: Date;
}

interface TokenRow {
	familyId: string;
	accountId: string;
	spent: boolean;
	expiresAt: Date;
}

export interface MemoryIdentityProviderOptions {
	readonly refreshTokenTtlSeconds?: number;
}

export class MemoryIdentityProvider implements IIdentityProvider {
	readonly #accountsById = new Map<string, AccountRow>();
	readonly #accountIdByEmail = new Map<string, string>();
	readonly #tokens = new Map<string, TokenRow>();
	readonly #revokedFamilies = new Set<string>();

	readonly #hasher: IPasswordHasher;
	readonly #clock: IClock;
	readonly #refreshTtlSeconds: number;

	constructor(hasher: IPasswordHasher, clock: IClock, options: MemoryIdentityProviderOptions = {}) {
		this.#hasher = hasher;
		this.#clock = clock;
		this.#refreshTtlSeconds = options.refreshTokenTtlSeconds ?? 30 * 24 * 60 * 60;
	}

	async register(email: string, password: string, locale: string): Promise<RegisterOutcome> {
		const normalized = normalizeEmail(email);
		if (this.#accountIdByEmail.has(normalized)) return { kind: 'email_taken' };

		const row: AccountRow = {
			id: randomUUID(),
			email: normalized,
			passwordHash: await this.#hasher.hash(password),
			emailVerifiedAt: null,
			locale,
			createdAt: this.#clock.now(),
		};
		this.#accountsById.set(row.id, row);
		this.#accountIdByEmail.set(normalized, row.id);
		return { kind: 'registered', account: toAccount(row) };
	}

	async authenticate(email: string, password: string): Promise<Account | null> {
		const row = this.#rowByEmail(email);
		if (!row) {
			await this.#hasher.verify(password, 'fake$__absent__');
			return null;
		}
		const ok = await this.#hasher.verify(password, row.passwordHash);
		return ok ? toAccount(row) : null;
	}

	async findByEmail(email: string): Promise<Account | null> {
		const row = this.#rowByEmail(email);
		return row ? toAccount(row) : null;
	}

	async findById(accountId: string): Promise<Account | null> {
		const row = this.#accountsById.get(accountId);
		return row ? toAccount(row) : null;
	}

	async startSession(accountId: string): Promise<Session> {
		return this.#issue(randomUUID(), accountId);
	}

	async refreshSession(refreshToken: string): Promise<RefreshOutcome> {
		const row = this.#tokens.get(refreshToken);
		if (!row) return { kind: 'rejected' };

		if (this.#revokedFamilies.has(row.familyId)) return { kind: 'rejected' };

		if (row.spent) {
			this.#revokedFamilies.add(row.familyId);
			return { kind: 'reuse_detected', sessionId: row.familyId };
		}

		if (row.expiresAt.getTime() <= this.#clock.now().getTime()) return { kind: 'rejected' };

		row.spent = true;
		return { kind: 'rotated', session: this.#issue(row.familyId, row.accountId) };
	}

	async revokeSession(refreshToken: string): Promise<void> {
		const row = this.#tokens.get(refreshToken);
		if (row) this.#revokedFamilies.add(row.familyId);
	}

	async revokeAllSessions(accountId: string): Promise<void> {
		for (const row of this.#tokens.values()) {
			if (row.accountId === accountId) this.#revokedFamilies.add(row.familyId);
		}
	}

	async setLocale(accountId: string, locale: string): Promise<void> {
		const row = this.#accountsById.get(accountId);
		if (row) row.locale = locale;
	}

	async markEmailVerified(accountId: string): Promise<void> {
		const row = this.#accountsById.get(accountId);
		if (row && row.emailVerifiedAt === null) row.emailVerifiedAt = this.#clock.now();
	}

	async changePassword(accountId: string, newPassword: string): Promise<void> {
		const row = this.#accountsById.get(accountId);
		if (!row) return;
		row.passwordHash = await this.#hasher.hash(newPassword);
		await this.revokeAllSessions(accountId);
	}

	#rowByEmail(email: string): AccountRow | undefined {
		const id = this.#accountIdByEmail.get(normalizeEmail(email));
		return id ? this.#accountsById.get(id) : undefined;
	}

	#issue(familyId: string, accountId: string): Session {
		const refreshToken = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
		const expiresAt = new Date(this.#clock.now().getTime() + this.#refreshTtlSeconds * 1000);
		this.#tokens.set(refreshToken, { familyId, accountId, spent: false, expiresAt });
		return { accountId, sessionId: familyId, refreshToken, expiresAt };
	}
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function toAccount(row: AccountRow): Account {
	return {
		id: row.id,
		email: row.email,
		emailVerifiedAt: row.emailVerifiedAt,
		locale: row.locale,
		createdAt: row.createdAt,
	};
}
