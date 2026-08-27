import {
	FALLBACK_LOCALE,
	RESOURCES,
	type LocaleMessages,
	type SupportedLocale,
} from './locales.js';

type Leaves<T, Prefix extends string = ''> = {
	[K in keyof T & string]: T[K] extends string
		? Prefix extends ''
			? K
			: `${Prefix}.${K}`
		: Leaves<T[K], Prefix extends '' ? K : `${Prefix}.${K}`>;
}[keyof T & string];

export type TranslationKey = Leaves<LocaleMessages>;

export type TranslationVars = Readonly<Record<string, string | number>>;

export type Translator = (key: TranslationKey, vars?: TranslationVars) => string;

const PLACEHOLDER = /\{\{(\w+)\}\}/g;

export function getTranslator(locale: SupportedLocale): Translator {
	const primary = RESOURCES[locale];
	const fallback = RESOURCES[FALLBACK_LOCALE];

	return (key, vars) => {
		const template = lookup(primary, key) ?? lookup(fallback, key);
		if (template === null) return key;
		return vars ? interpolate(template, vars) : template;
	};
}

export function translate(
	locale: SupportedLocale,
	key: TranslationKey,
	vars?: TranslationVars,
): string {
	return getTranslator(locale)(key, vars);
}

// A region code is data — it arrives on a row, not in this source — so it cannot
// be a TranslationKey and cannot be checked at compile time. A code this package
// has never heard of falls back to the name the row carries, because the fleet
// grows by migration and nothing makes the front deploy alongside it. DEC-111.
export function regionName(locale: SupportedLocale, code: string, fallback: string): string {
	return (
		lookupRegion(RESOURCES[locale], code) ??
		lookupRegion(RESOURCES[FALLBACK_LOCALE], code) ??
		fallback
	);
}

function lookupRegion(messages: LocaleMessages, code: string): string | undefined {
	const names: Readonly<Record<string, string>> = messages.regions;
	return names[code];
}

function lookup(messages: LocaleMessages, key: string): string | null {
	let current: unknown = messages;

	for (const segment of key.split('.')) {
		if (typeof current !== 'object' || current === null) return null;
		current = (current as Record<string, unknown>)[segment];
	}

	return typeof current === 'string' ? current : null;
}

function interpolate(template: string, vars: TranslationVars): string {
	return template.replace(PLACEHOLDER, (match, name: string) => {
		const value = vars[name];
		return value === undefined ? match : String(value);
	});
}
