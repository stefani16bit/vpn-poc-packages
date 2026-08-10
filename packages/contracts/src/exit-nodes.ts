import { z } from 'zod';

import { publicKeySchema } from './devices.js';

export const exitNodeLabelSchema = z
	.string()
	.trim()
	.min(1, 'validation.exitNodeLabel.required')
	.max(60, 'validation.exitNodeLabel.tooLong');

export const exitNodeSchema = z.object({
	id: z.string().uuid(),
	regionId: z.string().uuid(),
	label: exitNodeLabelSchema,
	endpoint: z.string(),
	controlUrl: z.string().url(),
	publicKey: publicKeySchema,
	tunnelCidr: z.string(),
	lastSeenAt: z.string().datetime().nullable(),
	liveDeviceCount: z.number().int().nonnegative(),
	createdAt: z.string().datetime(),
});
export type ExitNode = z.infer<typeof exitNodeSchema>;

// Neither publicKey nor endpoint is here: registration calls describe() and
// stores what the node answered, never what the form claimed. DEC-077.
export const registerExitNodeRequestSchema = z.object({
	regionId: z.string().uuid(),
	label: exitNodeLabelSchema,
	controlUrl: z.string().url('validation.exitNodeControlUrl.invalid'),
	tunnelCidr: z.string().regex(/^(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/, 'validation.cidr.invalid'),
	credentialRef: z.string().trim().min(1).optional(),
});
export type RegisterExitNodeRequest = z.infer<typeof registerExitNodeRequestSchema>;

export const exitNodeListResponseSchema = z.object({
	nodes: z.array(exitNodeSchema),
});
export type ExitNodeListResponse = z.infer<typeof exitNodeListResponseSchema>;

export const exitNodeResponseSchema = z.object({
	node: exitNodeSchema,
});
export type ExitNodeResponse = z.infer<typeof exitNodeResponseSchema>;
