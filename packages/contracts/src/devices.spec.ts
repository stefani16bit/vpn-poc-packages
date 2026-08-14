import { describe, expect, it } from 'vitest';

import { createDeviceRequestSchema, deviceSchema, publicKeySchema } from './devices.js';

const REAL = 'StZtsGF+hrd7nHOYtH0GhM/759qnBuUbKdVMEeFyLVU=';

describe('publicKeySchema', () => {
	it('accepts a key wireguard itself produced', () => {
		expect(publicKeySchema.parse(REAL)).toBe(REAL);
	});

	it('rejects a private key pasted by mistake, which looks identical in shape', () => {
		expect(publicKeySchema.safeParse('WJC0KZjD4knUKhixmkOJblemjUjYH/YI2D2E/UhojEc').success).toBe(
			false,
		);
	});

	it('rejects a key whose last character carries bits that cannot exist', () => {
		expect(publicKeySchema.safeParse(`${REAL.slice(0, 42)}B=`).success).toBe(false);
	});

	it('rejects base64 of the wrong length, which is a key for another algorithm', () => {
		expect(publicKeySchema.safeParse('c2hvcnQ=').success).toBe(false);
	});

	it('rejects base64url, because wireguard writes standard base64', () => {
		expect(publicKeySchema.safeParse(REAL.replace('+', '-').replace('/', '_')).success).toBe(false);
	});

	it('reports the failure as a translation key rather than a sentence', () => {
		const parsed = publicKeySchema.safeParse('nope');
		expect(parsed.success).toBe(false);
		if (!parsed.success)
			expect(parsed.error.issues[0]?.message).toBe('validation.publicKey.invalid');
	});
});

describe('createDeviceRequestSchema', () => {
	const REGION = '3f1c9d2e-8b7a-4c65-9e10-2d4f6a8b0c31';

	it('trims the name, so two devices do not differ by a space', () => {
		const parsed = createDeviceRequestSchema.parse({
			name: '  laptop  ',
			publicKey: REAL,
			regionId: REGION,
		});
		expect(parsed.name).toBe('laptop');
	});

	it('rejects a name that is only whitespace', () => {
		expect(
			createDeviceRequestSchema.safeParse({ name: '   ', publicKey: REAL, regionId: REGION })
				.success,
		).toBe(false);
	});

	it('refuses a body carrying a private key field, whatever it is called', () => {
		const parsed = createDeviceRequestSchema.parse({
			name: 'laptop',
			publicKey: REAL,
			regionId: REGION,
			privateKey: 'should-not-survive',
		});
		expect(parsed).toEqual({ name: 'laptop', publicKey: REAL, regionId: REGION });
	});

	it('leaves the owner absent when nobody was chosen, which reads as "for me"', () => {
		const parsed = createDeviceRequestSchema.parse({
			name: 'laptop',
			publicKey: REAL,
			regionId: REGION,
		});
		expect(parsed.userId).toBeUndefined();
	});

	it('carries the owner when the key is being assigned to someone else', () => {
		const userId = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
		const parsed = createDeviceRequestSchema.parse({
			name: 'laptop',
			publicKey: REAL,
			regionId: REGION,
			userId,
		});

		expect(parsed.userId).toBe(userId);
	});

	it('rejects an owner that is not an id, so a typo never reaches the repository', () => {
		expect(
			createDeviceRequestSchema.safeParse({
				name: 'laptop',
				publicKey: REAL,
				regionId: REGION,
				userId: 'ana',
			}).success,
		).toBe(false);
	});
});

describe('createDeviceRequestSchema, once a fleet exists', () => {
	const REGION_ID = '3f1c9d2e-8b7a-4c65-9e10-2d4f6a8b0c31';

	it('carries the region, because the person chooses where the traffic leaves', () => {
		const parsed = createDeviceRequestSchema.parse({
			name: 'laptop',
			publicKey: REAL,
			regionId: REGION_ID,
		});

		expect(parsed.regionId).toBe(REGION_ID);
	});

	it('refuses a key with no region, rather than picking a continent for someone', () => {
		expect(createDeviceRequestSchema.safeParse({ name: 'laptop', publicKey: REAL }).success).toBe(
			false,
		);
	});

	it('rejects a region that is not an id', () => {
		expect(
			createDeviceRequestSchema.safeParse({ name: 'laptop', publicKey: REAL, regionId: 'europa' })
				.success,
		).toBe(false);
	});
});

describe('deviceSchema, once a fleet exists', () => {
	it('reports the choice and the assignment as two separate facts', () => {
		const shape = deviceSchema.shape;

		expect(shape).toHaveProperty('regionId');
		expect(shape).toHaveProperty('exitNodeId');
	});
});
