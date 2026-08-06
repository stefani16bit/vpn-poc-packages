import { FALLBACK_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from '@vpn/contracts';

import { en } from './locales/en.js';
import { ptBR, type LocaleMessages } from './locales/pt-BR.js';

export const RESOURCES: Record<SupportedLocale, LocaleMessages> = {
	'pt-BR': ptBR,
	en,
};

export { FALLBACK_LOCALE, SUPPORTED_LOCALES };
export type { SupportedLocale, LocaleMessages };
