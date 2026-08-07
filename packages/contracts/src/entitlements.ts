import { z } from 'zod';

import { tierIdSchema, type SubscriptionStatusView, type TierId } from './billing.js';

export const CAPABILITIES = ['vpn_access'] as const;
export const capabilitySchema = z.enum(CAPABILITIES);
export type Capability = z.infer<typeof capabilitySchema>;

export const REGIONS = ['us', 'eu'] as const;
export const regionSchema = z.enum(REGIONS);
export type Region = z.infer<typeof regionSchema>;

export const entitlementsSchema = z.object({
	capabilities: z.array(capabilitySchema),
	seats: z.number().int().nonnegative(),
	devicesPerUser: z.number().int().nonnegative(),
	monthlyTrafficGb: z.number().int().nonnegative(),
	regions: z.array(regionSchema),
});
export type Entitlements = z.infer<typeof entitlementsSchema>;

export const ENTITLEMENTS: Record<TierId, Entitlements> = {
	pro: {
		capabilities: ['vpn_access'],
		seats: 25,
		devicesPerUser: 5,
		monthlyTrafficGb: 500,
		regions: ['us', 'eu'],
	},
};

export const UNSUBSCRIBED_ENTITLEMENTS: Entitlements = {
	capabilities: [],
	seats: 1,
	devicesPerUser: 0,
	monthlyTrafficGb: 0,
	regions: [],
};

const SOLE_TIER: TierId = 'pro';

const TIER_GRANTING_STATUSES: readonly SubscriptionStatusView[] = ['active', 'trialing'];

export function resolveTier(status: SubscriptionStatusView): TierId | null {
	return TIER_GRANTING_STATUSES.includes(status) ? SOLE_TIER : null;
}

export function entitlementsFor(tier: TierId | null): Entitlements {
	return tier === null ? UNSUBSCRIBED_ENTITLEMENTS : ENTITLEMENTS[tier];
}

export const entitlementsResponseSchema = z.object({
	tier: tierIdSchema.nullable(),
	entitlements: entitlementsSchema,
});
export type EntitlementsResponse = z.infer<typeof entitlementsResponseSchema>;
