import { z } from 'zod';

// available, and not a count of nodes, because the fleet is ours: how many
// machines answer in Frankfurt is our inventory, and the form asks one question
// — can a key be created here right now. The server decides it against the same
// window it will pick a node by, so the picker cannot offer what the next call
// refuses.
export const regionSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	available: z.boolean(),
});
export type Region = z.infer<typeof regionSchema>;

export const regionListResponseSchema = z.object({
	regions: z.array(regionSchema),
});
export type RegionListResponse = z.infer<typeof regionListResponseSchema>;
