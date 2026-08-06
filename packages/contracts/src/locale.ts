import { z } from 'zod';

export const SUPPORTED_LOCALES = ['pt-BR', 'en'] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const FALLBACK_LOCALE: SupportedLocale = 'pt-BR';

export const localeSchema = z.enum(SUPPORTED_LOCALES, {
	errorMap: () => ({ message: 'validation.locale.unsupported' }),
});

export const updateLocaleRequestSchema = z.object({
	locale: localeSchema,
});
export type UpdateLocaleRequest = z.infer<typeof updateLocaleRequestSchema>;
