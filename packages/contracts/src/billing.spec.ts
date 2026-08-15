import { describe, expect, it } from 'vitest';

import { CADENCES, PLAN_PRICES, TIER_IDS, planPriceSchema } from './billing.js';

describe('PLAN_PRICES', () => {
	it('covers every tier, so a lookup never falls off the map', () => {
		expect(Object.keys(PLAN_PRICES).sort()).toEqual([...TIER_IDS].sort());
	});

	it('prices every cadence of every tier, because checkout asks for the pair', () => {
		for (const tier of TIER_IDS) {
			expect(Object.keys(PLAN_PRICES[tier]).sort()).toEqual([...CADENCES].sort());
		}
	});

	it('states every amount in the shape the wire already uses for an invoice', () => {
		for (const tier of TIER_IDS) {
			for (const cadence of CADENCES) {
				expect(planPriceSchema.safeParse(PLAN_PRICES[tier][cadence]).success).toBe(true);
			}
		}
	});

	it('charges one currency per tier, since an amount in cents means nothing without it', () => {
		for (const tier of TIER_IDS) {
			const currencies = CADENCES.map((cadence) => PLAN_PRICES[tier][cadence].currency);

			expect(new Set(currencies).size).toBe(1);
		}
	});

	it('keeps the year below twelve months, which is the only reason to pay upfront', () => {
		for (const tier of TIER_IDS) {
			expect(PLAN_PRICES[tier].yearly.amountCents).toBeLessThan(
				PLAN_PRICES[tier].monthly.amountCents * 12,
			);
		}
	});
});
