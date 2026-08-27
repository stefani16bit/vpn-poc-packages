import { z } from 'zod';

export const DEFAULT_PAGE_SIZE = 6;
export const MAX_PAGE_SIZE = 100;

export const pageQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	perPage: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type PageQuery = z.infer<typeof pageQuerySchema>;

export const pageMetaSchema = z.object({
	page: z.number().int().min(1),
	perPage: z.number().int().min(1),
	total: z.number().int().nonnegative(),
});
export type PageMeta = z.infer<typeof pageMetaSchema>;

export function pageOffset(page: number, perPage: number): number {
	return (page - 1) * perPage;
}

export function pageCount(total: number, perPage: number): number {
	return Math.ceil(total / perPage);
}
