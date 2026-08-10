import { z } from 'zod';

// 32 bytes in base64: 43 payload characters plus padding. The 43rd carries the
// last 4 bits of the key and 2 zero bits, so only every fourth symbol can appear.
export const WIREGUARD_PUBLIC_KEY = /^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$/;

export const publicKeySchema = z
	.string()
	.regex(WIREGUARD_PUBLIC_KEY, 'validation.publicKey.invalid');

export const deviceNameSchema = z
	.string()
	.trim()
	.min(1, 'validation.deviceName.required')
	.max(60, 'validation.deviceName.tooLong');

export const createDeviceRequestSchema = z.object({
	name: deviceNameSchema,
	publicKey: publicKeySchema,
});
export type CreateDeviceRequest = z.infer<typeof createDeviceRequestSchema>;

export const deviceSchema = z.object({
	id: z.string().uuid(),
	name: deviceNameSchema,
	publicKey: publicKeySchema,
	tunnelAddress: z.string(),
	userId: z.string().uuid(),
	userEmail: z.string(),
	provisionedAt: z.string().datetime().nullable(),
	createdAt: z.string().datetime(),
});
export type Device = z.infer<typeof deviceSchema>;

export const exitNodeViewSchema = z.object({
	publicKey: publicKeySchema,
	endpoint: z.string(),
	allowedIps: z.array(z.string()).min(1),
});
export type ExitNodeView = z.infer<typeof exitNodeViewSchema>;

// The node travels with each device rather than beside the list: two devices of
// the same user can sit on different nodes once a tenant registers a fleet.
export const deviceWithNodeSchema = deviceSchema.extend({
	node: exitNodeViewSchema,
});
export type DeviceWithNode = z.infer<typeof deviceWithNodeSchema>;

export const deviceListResponseSchema = z.object({
	devices: z.array(deviceWithNodeSchema),
});
export type DeviceListResponse = z.infer<typeof deviceListResponseSchema>;

export const createDeviceResponseSchema = z.object({
	device: deviceWithNodeSchema,
});
export type CreateDeviceResponse = z.infer<typeof createDeviceResponseSchema>;
