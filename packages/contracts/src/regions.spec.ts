import { describe, expect, it } from 'vitest';

import { regionSchema } from './regions.js';

const REGION = {
	id: '3f1c9d2e-8b7a-4c65-9e10-2d4f6a8b0c31',
	name: 'Europe',
	available: true,
};

describe('regionSchema', () => {
	it('says whether a key can be created here, and nothing about how many machines answer', () => {
		const parsed = regionSchema.parse(REGION);

		expect(parsed.available).toBe(true);
		expect(parsed).not.toHaveProperty('nodeCount');
	});

	it('carries a region whose nodes all went silent, because it still exists to be named', () => {
		expect(regionSchema.parse({ ...REGION, available: false }).available).toBe(false);
	});

	it('refuses to let availability be left out, which would read as available', () => {
		const { available, ...withoutAvailable } = REGION;
		expect(available).toBe(true);

		expect(regionSchema.safeParse(withoutAvailable).success).toBe(false);
	});
});
