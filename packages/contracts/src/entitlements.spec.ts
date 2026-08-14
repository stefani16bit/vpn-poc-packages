import { describe, expect, it } from 'vitest';

import { TIER_IDS, subscriptionStatusSchema } from './billing.js';
import {
	CAPABILITIES,
	ENTITLEMENTS,
	UNSUBSCRIBED_ENTITLEMENTS,
	entitlementsFor,
	entitlementsResponseSchema,
	entitlementsSchema,
	resolveTier,
} from './entitlements.js';

describe('ENTITLEMENTS', () => {
	it('covers every tier, so a lookup never falls off the map', () => {
		expect(Object.keys(ENTITLEMENTS).sort()).toEqual([...TIER_IDS].sort());
	});

	it('describes every tier in the shape the wire promises', () => {
		for (const tier of TIER_IDS) {
			expect(entitlementsSchema.safeParse(ENTITLEMENTS[tier]).success).toBe(true);
		}
	});

	it('grants the paid tier every capability the product has today', () => {
		expect(ENTITLEMENTS.pro.capabilities).toEqual([...CAPABILITIES]);
	});
});

describe('resolveTier', () => {
	it('grants a tier while the subscription is paid for', () => {
		expect(resolveTier('active')).toBe('pro');
		expect(resolveTier('trialing')).toBe('pro');
	});

	it('grants nothing for every other status, dunning included', () => {
		const denied = subscriptionStatusSchema.options.filter(
			(status) => status !== 'active' && status !== 'trialing',
		);

		expect(denied.map(resolveTier)).toEqual(denied.map(() => null));
		expect(denied).toContain('past_due');
	});
});

describe('entitlementsFor', () => {
	it('hands an account with no tier a set that unlocks nothing', () => {
		expect(entitlementsFor(null)).toEqual(UNSUBSCRIBED_ENTITLEMENTS);
		expect(entitlementsFor(null).capabilities).toEqual([]);
	});

	it('hands a tier exactly what the map says', () => {
		expect(entitlementsFor('pro')).toEqual(ENTITLEMENTS.pro);
	});
});

describe('entitlementsResponseSchema', () => {
	it('accepts a null tier, which is how an unsubscribed account reads', () => {
		const parsed = entitlementsResponseSchema.safeParse({
			tier: null,
			entitlements: UNSUBSCRIBED_ENTITLEMENTS,
		});

		expect(parsed.success).toBe(true);
	});

	it('rejects a tier the map does not have', () => {
		const parsed = entitlementsResponseSchema.safeParse({
			tier: 'enterprise',
			entitlements: ENTITLEMENTS.pro,
		});

		expect(parsed.success).toBe(false);
	});

	it('rejects a capability the client would not know how to honour', () => {
		const parsed = entitlementsResponseSchema.safeParse({
			tier: 'pro',
			entitlements: { ...ENTITLEMENTS.pro, capabilities: ['read_minds'] },
		});

		expect(parsed.success).toBe(false);
	});
});

// The tier says nothing about regions. While the tenant named them a count was
// the only thing a plan could promise; now that we name them, the honest shape
// is a list of ours — and with one tier there is nothing yet to choose between.
describe('the region allowance', () => {
	it('promises no region allowance at all, in either direction', () => {
		expect(ENTITLEMENTS.pro).not.toHaveProperty('regions');
		expect(UNSUBSCRIBED_ENTITLEMENTS).not.toHaveProperty('regions');
	});
});
