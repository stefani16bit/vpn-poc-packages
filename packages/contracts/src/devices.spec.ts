import { describe, expect, it } from 'vitest';

import { createDeviceRequestSchema, publicKeySchema } from './devices.js';

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
	it('trims the name, so two devices do not differ by a space', () => {
		const parsed = createDeviceRequestSchema.parse({ name: '  laptop  ', publicKey: REAL });
		expect(parsed.name).toBe('laptop');
	});

	it('rejects a name that is only whitespace', () => {
		expect(createDeviceRequestSchema.safeParse({ name: '   ', publicKey: REAL }).success).toBe(
			false,
		);
	});

	it('refuses a body carrying a private key field, whatever it is called', () => {
		const parsed = createDeviceRequestSchema.parse({
			name: 'laptop',
			publicKey: REAL,
			privateKey: 'should-not-survive',
		});
		expect(parsed).toEqual({ name: 'laptop', publicKey: REAL });
	});
});
