import { z } from 'zod';

export const regionNameSchema = z
	.string()
	.trim()
	.min(1, 'validation.regionName.required')
	.max(60, 'validation.regionName.tooLong');

export const regionSchema = z.object({
	id: z.string().uuid(),
	name: regionNameSchema,
	nodeCount: z.number().int().nonnegative(),
	reachableNodeCount: z.number().int().nonnegative(),
	createdAt: z.string().datetime(),
});
export type Region = z.infer<typeof regionSchema>;

export const createRegionRequestSchema = z.object({
	name: regionNameSchema,
});
export type CreateRegionRequest = z.infer<typeof createRegionRequestSchema>;

export const regionListResponseSchema = z.object({
	regions: z.array(regionSchema),
});
export type RegionListResponse = z.infer<typeof regionListResponseSchema>;

export const regionResponseSchema = z.object({
	region: regionSchema,
});
export type RegionResponse = z.infer<typeof regionResponseSchema>;
