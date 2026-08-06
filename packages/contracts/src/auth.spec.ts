import { describe, expect, it } from 'vitest';

import {
	emailSchema,
	loginRequestSchema,
	passwordSchema,
	registerRequestSchema,
	resetPasswordRequestSchema,
} from './auth.js';

describe('emailSchema', () => {
	it('lowercases and trims', () => {
		expect(emailSchema.parse('  Ada@Example.COM ')).toBe('ada@example.com');
	});

	it('rejects a value with no domain', () => {
		expect(emailSchema.safeParse('ada@').success).toBe(false);
	});

	it('rejects an address past the RFC length limit', () => {
		const tooLong = `${'a'.repeat(250)}@example.com`;
		expect(emailSchema.safeParse(tooLong).success).toBe(false);
	});
});

describe('passwordSchema', () => {
	it('accepts a long passphrase with no symbols', () => {
		expect(passwordSchema.safeParse('correct horse battery staple').success).toBe(true);
	});

	it('rejects a short password even when it is complex', () => {
		expect(passwordSchema.safeParse('Aa1!Aa1!').success).toBe(false);
	});
});

describe('registerRequestSchema', () => {
	it('leaves the locale undefined when omitted, so the server can negotiate it', () => {
		const parsed = registerRequestSchema.parse({
			email: 'ada@example.com',
			password: 'a-sufficiently-long-password',
		});
		expect(parsed.locale).toBeUndefined();
	});

	it('keeps an explicit locale', () => {
		const parsed = registerRequestSchema.parse({
			email: 'ada@example.com',
			password: 'a-sufficiently-long-password',
			locale: 'en',
		});
		expect(parsed.locale).toBe('en');
	});

	it('rejects a locale we do not support', () => {
		const parsed = registerRequestSchema.safeParse({
			email: 'ada@example.com',
			password: 'a-sufficiently-long-password',
			locale: 'klingon',
		});
		expect(parsed.success).toBe(false);
	});
});

describe('loginRequestSchema', () => {
	it('accepts a password shorter than the registration minimum', () => {
		const parsed = loginRequestSchema.safeParse({ email: 'ada@example.com', password: 'short' });
		expect(parsed.success).toBe(true);
	});

	it('still rejects an empty password', () => {
		expect(loginRequestSchema.safeParse({ email: 'ada@example.com', password: '' }).success).toBe(
			false,
		);
	});
});

describe('resetPasswordRequestSchema', () => {
	it('rejects a token short enough to brute-force', () => {
		const parsed = resetPasswordRequestSchema.safeParse({
			token: 'abc123',
			password: 'a-sufficiently-long-password',
		});
		expect(parsed.success).toBe(false);
	});
});
