import { describe, expect, it } from 'vitest';

import { API_ERROR_CODES, CLIENT_ERROR_CODES } from '@vpn/contracts';

import { FALLBACK_LOCALE, RESOURCES, SUPPORTED_LOCALES, type LocaleMessages } from './locales.js';
import { isSupportedLocale, negotiateLocale } from './negotiate.js';
import { getTranslator } from './translator.js';

function flatten(value: unknown, prefix = ''): string[] {
	if (typeof value === 'string') return [prefix];
	if (typeof value !== 'object' || value === null) return [];

	return Object.entries(value).flatMap(([key, entry]) =>
		flatten(entry, prefix ? `${prefix}.${key}` : key),
	);
}

describe('locale resources', () => {
	it.each(SUPPORTED_LOCALES)('%s has the same key set as every other locale', (locale) => {
		const reference = flatten(RESOURCES[FALLBACK_LOCALE]).sort();
		expect(flatten(RESOURCES[locale]).sort()).toEqual(reference);
	});

	it.each(SUPPORTED_LOCALES)('%s has no empty translation', (locale) => {
		const empty = flatten(RESOURCES[locale]).filter((key) => {
			const translator = getTranslator(locale);
			return translator(key as never).trim() === '';
		});
		expect(empty).toEqual([]);
	});

	it.each(SUPPORTED_LOCALES)('%s covers every API error code', (locale) => {
		const errors = RESOURCES[locale].errors as Record<string, string>;
		for (const code of API_ERROR_CODES) {
			expect(errors[code], `missing errors.${code}`).toBeTruthy();
		}
	});

	it.each(SUPPORTED_LOCALES)('%s covers every client error code', (locale) => {
		const errors = RESOURCES[locale].errors as Record<string, string>;
		for (const code of CLIENT_ERROR_CODES) {
			expect(errors[code], `missing errors.${code}`).toBeTruthy();
		}
	});

	it('has no error key that is not a published code', () => {
		const published = new Set<string>([...API_ERROR_CODES, ...CLIENT_ERROR_CODES]);
		const declared = Object.keys(RESOURCES[FALLBACK_LOCALE].errors as Record<string, string>);
		expect(declared.filter((key) => !published.has(key))).toEqual([]);
	});
});

describe('negotiateLocale', () => {
	it('falls back when the header is absent', () => {
		expect(negotiateLocale(undefined)).toBe(FALLBACK_LOCALE);
		expect(negotiateLocale(null)).toBe(FALLBACK_LOCALE);
		expect(negotiateLocale('')).toBe(FALLBACK_LOCALE);
	});

	it('matches an exact tag', () => {
		expect(negotiateLocale('pt-BR')).toBe('pt-BR');
		expect(negotiateLocale('en')).toBe('en');
	});

	it('matches case-insensitively', () => {
		expect(negotiateLocale('EN-us')).toBe('en');
	});

	it('falls back from a region we do not carry to its language', () => {
		expect(negotiateLocale('en-GB')).toBe('en');
		expect(negotiateLocale('pt-PT')).toBe('pt-BR');
	});

	it('honours quality ordering rather than header order', () => {
		expect(negotiateLocale('en;q=0.2, pt-BR;q=0.9')).toBe('pt-BR');
		expect(negotiateLocale('pt-BR;q=0.1, en;q=0.8')).toBe('en');
	});

	it('excludes a tag with q=0', () => {
		expect(negotiateLocale('en;q=0, pt-BR;q=0.5')).toBe('pt-BR');
	});

	it('skips a language we do not support and takes the next preference', () => {
		expect(negotiateLocale('fr-FR, en;q=0.7')).toBe('en');
	});

	it('falls back when nothing matches', () => {
		expect(negotiateLocale('fr-FR, de-DE')).toBe(FALLBACK_LOCALE);
	});

	it('treats a wildcard as the fallback', () => {
		expect(negotiateLocale('*')).toBe(FALLBACK_LOCALE);
	});

	it('ignores a malformed quality value', () => {
		expect(negotiateLocale('en;q=abc')).toBe(FALLBACK_LOCALE);
	});
});

describe('isSupportedLocale', () => {
	it('accepts a supported locale', () => {
		expect(isSupportedLocale('pt-BR')).toBe(true);
		expect(isSupportedLocale('en')).toBe(true);
	});

	it('rejects anything else', () => {
		expect(isSupportedLocale('fr')).toBe(false);
		expect(isSupportedLocale('')).toBe(false);
		expect(isSupportedLocale(undefined)).toBe(false);
		expect(isSupportedLocale(42)).toBe(false);
	});
});

describe('getTranslator', () => {
	it('returns the string for the locale', () => {
		expect(getTranslator('pt-BR')('auth.login.title')).toBe('Entrar');
		expect(getTranslator('en')('auth.login.title')).toBe('Sign in');
	});

	it('interpolates variables', () => {
		expect(getTranslator('en')('auth.verifyEmail.resendIn', { seconds: 30 })).toBe(
			'Resend in 30s',
		);
	});

	it('leaves a placeholder alone when the variable is missing', () => {
		expect(getTranslator('en')('auth.verifyEmail.resendIn')).toContain('{{seconds}}');
	});

	it('interpolates the same placeholder everywhere it appears', () => {
		const body = getTranslator('en')('email.verify_email.body', {
			url: 'https://x/y',
			expiresInHours: 24,
		});
		expect(body).toContain('https://x/y');
		expect(body).toContain('24 hours');
		expect(body).not.toContain('{{');
	});

	it('returns the key rather than throwing when it does not exist', () => {
		const translator = getTranslator('en') as (key: string) => string;
		expect(translator('does.not.exist')).toBe('does.not.exist');
	});

	it('returns the key when the path lands on an object rather than a string', () => {
		const translator = getTranslator('en') as (key: string) => string;
		expect(translator('auth.login')).toBe('auth.login');
	});
});

describe('locale message shape', () => {
	it('keeps the fallback locale as the structural source of truth', () => {
		const reference: LocaleMessages = RESOURCES[FALLBACK_LOCALE];
		expect(Object.keys(reference).sort()).toEqual(
			['auth', 'billing', 'common', 'email', 'errors', 'keys', 'sms', 'validation'].sort(),
		);
	});
});
