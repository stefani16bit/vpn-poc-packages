import { FALLBACK_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from './locales.js';

interface Preference {
	readonly tag: string;
	readonly quality: number;
}

export function isSupportedLocale(value: unknown): value is SupportedLocale {
	return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function negotiateLocale(acceptLanguage: string | null | undefined): SupportedLocale {
	if (!acceptLanguage) return FALLBACK_LOCALE;

	const preferences = parse(acceptLanguage);

	for (const preference of preferences) {
		const match = matchTag(preference.tag);
		if (match) return match;
	}

	return FALLBACK_LOCALE;
}

function parse(header: string): Preference[] {
	return header
		.split(',')
		.map((part) => {
			const [rawTag, ...params] = part.trim().split(';');
			const tag = (rawTag ?? '').trim().toLowerCase();
			if (!tag) return null;

			const qParam = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
			const quality = qParam ? Number(qParam.slice(2)) : 1;
			if (!Number.isFinite(quality) || quality <= 0) return null;

			return { tag, quality };
		})
		.filter((p): p is Preference => p !== null)
		.sort((a, b) => b.quality - a.quality);
}

function matchTag(tag: string): SupportedLocale | null {
	if (tag === '*') return FALLBACK_LOCALE;

	const exact = SUPPORTED_LOCALES.find((locale) => locale.toLowerCase() === tag);
	if (exact) return exact;

	const language = tag.split('-')[0];
	const byLanguage = SUPPORTED_LOCALES.find(
		(locale) => locale.toLowerCase().split('-')[0] === language,
	);
	return byLanguage ?? null;
}
