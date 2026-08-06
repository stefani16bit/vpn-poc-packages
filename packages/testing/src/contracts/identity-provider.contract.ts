import { beforeEach, describe, expect, it } from 'vitest';

import type { IIdentityProvider } from '@vpn/ports';

export interface IdentityProviderHarness {
	readonly provider: IIdentityProvider;
	advance(seconds: number): Promise<void> | void;
}

const EMAIL = 'ada@example.com';
const PASSWORD = 'a-sufficiently-long-password';

export function describeIdentityProviderContract(
	name: string,
	createHarness: () => Promise<IdentityProviderHarness> | IdentityProviderHarness,
): void {
	describe(`${name} (IIdentityProvider contract)`, () => {
		let harness: IdentityProviderHarness;
		let provider: IIdentityProvider;

		beforeEach(async () => {
			harness = await createHarness();
			provider = harness.provider;
		});

		async function registered(email = EMAIL, locale = 'pt-BR') {
			const outcome = await provider.register(email, PASSWORD, locale);
			if (outcome.kind !== 'registered') throw new Error('setup: registration failed');
			return outcome.account;
		}

		describe('registration', () => {
			it('creates an account that is not yet verified', async () => {
				const account = await registered();
				expect(account.email).toBe(EMAIL);
				expect(account.emailVerifiedAt).toBeNull();
			});

			it('persists the locale it was registered with', async () => {
				const account = await registered('grace@example.com', 'en');
				expect(account.locale).toBe('en');
				expect((await provider.findById(account.id))?.locale).toBe('en');
			});

			it('reports a duplicate address rather than throwing', async () => {
				await registered();
				await expect(provider.register(EMAIL, PASSWORD, 'pt-BR')).resolves.toEqual({
					kind: 'email_taken',
				});
			});

			it('treats addresses differing only in case as the same account', async () => {
				await registered();
				await expect(provider.register('ADA@Example.com', PASSWORD, 'pt-BR')).resolves.toEqual({
					kind: 'email_taken',
				});
			});
		});

		describe('authentication', () => {
			it('accepts the right password', async () => {
				const account = await registered();
				await expect(provider.authenticate(EMAIL, PASSWORD)).resolves.toMatchObject({
					id: account.id,
				});
			});

			it('returns null for a wrong password', async () => {
				await registered();
				await expect(provider.authenticate(EMAIL, 'wrong-password-entirely')).resolves.toBeNull();
			});

			it('returns null for an account that does not exist', async () => {
				await expect(provider.authenticate('nobody@example.com', PASSWORD)).resolves.toBeNull();
			});

			it('authenticates regardless of the case the address was typed in', async () => {
				await registered();
				await expect(provider.authenticate('ADA@EXAMPLE.COM', PASSWORD)).resolves.not.toBeNull();
			});
		});

		describe('sessions', () => {
			it('issues a session bound to the account', async () => {
				const account = await registered();
				const session = await provider.startSession(account.id);
				expect(session.accountId).toBe(account.id);
				expect(session.refreshToken.length).toBeGreaterThanOrEqual(32);
			});

			it('issues distinct refresh tokens for two sessions', async () => {
				const account = await registered();
				const first = await provider.startSession(account.id);
				const second = await provider.startSession(account.id);
				expect(first.refreshToken).not.toBe(second.refreshToken);
			});

			it('rotates: refreshing returns a new token', async () => {
				const account = await registered();
				const session = await provider.startSession(account.id);

				const outcome = await provider.refreshSession(session.refreshToken);
				expect(outcome.kind).toBe('rotated');
				if (outcome.kind !== 'rotated') return;
				expect(outcome.session.refreshToken).not.toBe(session.refreshToken);
				expect(outcome.session.sessionId).toBe(session.sessionId);
			});

			it('reports a replayed token as reuse, not as a plain rejection', async () => {
				const account = await registered();
				const session = await provider.startSession(account.id);
				await provider.refreshSession(session.refreshToken);

				const replay = await provider.refreshSession(session.refreshToken);
				expect(replay.kind).toBe('reuse_detected');
			});

			it('kills the whole family when reuse is detected', async () => {
				const account = await registered();
				const session = await provider.startSession(account.id);
				const rotated = await provider.refreshSession(session.refreshToken);
				if (rotated.kind !== 'rotated') throw new Error('setup: rotation failed');

				await provider.refreshSession(session.refreshToken);

				await expect(provider.refreshSession(rotated.session.refreshToken)).resolves.toEqual({
					kind: 'rejected',
				});
			});

			it('does not affect a second session when one family is compromised', async () => {
				const account = await registered();
				const compromised = await provider.startSession(account.id);
				const untouched = await provider.startSession(account.id);

				await provider.refreshSession(compromised.refreshToken);
				await provider.refreshSession(compromised.refreshToken);

				const outcome = await provider.refreshSession(untouched.refreshToken);
				expect(outcome.kind).toBe('rotated');
			});

			it('rejects a token it never issued', async () => {
				await expect(provider.refreshSession('not-a-real-token')).resolves.toEqual({
					kind: 'rejected',
				});
			});

			it('rejects an expired refresh token', async () => {
				const account = await registered();
				const session = await provider.startSession(account.id);
				await harness.advance(31 * 24 * 60 * 60);
				await expect(provider.refreshSession(session.refreshToken)).resolves.toEqual({
					kind: 'rejected',
				});
			});

			it('revokes', async () => {
				const account = await registered();
				const session = await provider.startSession(account.id);
				await provider.revokeSession(session.refreshToken);
				await expect(provider.refreshSession(session.refreshToken)).resolves.toEqual({
					kind: 'rejected',
				});
			});

			it('treats revoking an unknown token as a success', async () => {
				await expect(provider.revokeSession('never-issued')).resolves.toBeUndefined();
			});

			it('revokes every session for an account', async () => {
				const account = await registered();
				const first = await provider.startSession(account.id);
				const second = await provider.startSession(account.id);

				await provider.revokeAllSessions(account.id);

				await expect(provider.refreshSession(first.refreshToken)).resolves.toEqual({
					kind: 'rejected',
				});
				await expect(provider.refreshSession(second.refreshToken)).resolves.toEqual({
					kind: 'rejected',
				});
			});

			it('leaves another account untouched when revoking all', async () => {
				const mine = await registered();
				const theirs = await registered('grace@example.com');
				const theirSession = await provider.startSession(theirs.id);

				await provider.revokeAllSessions(mine.id);

				expect((await provider.refreshSession(theirSession.refreshToken)).kind).toBe('rotated');
			});
		});

		describe('account state', () => {
			it('changes the locale', async () => {
				const account = await registered(EMAIL, 'pt-BR');
				await provider.setLocale(account.id, 'en');
				expect((await provider.findById(account.id))?.locale).toBe('en');
			});

			it('leaves another account untouched when changing a locale', async () => {
				const mine = await registered(EMAIL, 'pt-BR');
				const theirs = await registered('grace@example.com', 'pt-BR');

				await provider.setLocale(mine.id, 'en');

				expect((await provider.findById(theirs.id))?.locale).toBe('pt-BR');
			});

			it('marks the e-mail verified', async () => {
				const account = await registered();
				await provider.markEmailVerified(account.id);
				const reloaded = await provider.findById(account.id);
				expect(reloaded?.emailVerifiedAt).toBeInstanceOf(Date);
			});

			it('does not move the verification timestamp on a second call', async () => {
				const account = await registered();
				await provider.markEmailVerified(account.id);
				const first = (await provider.findById(account.id))?.emailVerifiedAt;

				await harness.advance(3600);
				await provider.markEmailVerified(account.id);

				expect((await provider.findById(account.id))?.emailVerifiedAt).toEqual(first);
			});

			it('changes the password', async () => {
				const account = await registered();
				await provider.changePassword(account.id, 'an-entirely-different-password');

				await expect(provider.authenticate(EMAIL, PASSWORD)).resolves.toBeNull();
				await expect(
					provider.authenticate(EMAIL, 'an-entirely-different-password'),
				).resolves.not.toBeNull();
			});

			it('revokes every session when the password changes', async () => {
				const account = await registered();
				const session = await provider.startSession(account.id);

				await provider.changePassword(account.id, 'an-entirely-different-password');

				await expect(provider.refreshSession(session.refreshToken)).resolves.toEqual({
					kind: 'rejected',
				});
			});

			it('finds by e-mail, case-insensitively', async () => {
				const account = await registered();
				await expect(provider.findByEmail('ADA@example.COM')).resolves.toMatchObject({
					id: account.id,
				});
			});

			it('returns null for an unknown account', async () => {
				await expect(provider.findByEmail('nobody@example.com')).resolves.toBeNull();
				await expect(
					provider.findById('00000000-0000-0000-0000-000000000000'),
				).resolves.toBeNull();
			});
		});
	});
}
