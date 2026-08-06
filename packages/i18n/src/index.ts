export {
	SUPPORTED_LOCALES,
	FALLBACK_LOCALE,
	RESOURCES,
	type SupportedLocale,
	type LocaleMessages,
} from './locales.js';

export { negotiateLocale, isSupportedLocale } from './negotiate.js';

export {
	getTranslator,
	translate,
	type Translator,
	type TranslationKey,
	type TranslationVars,
} from './translator.js';
