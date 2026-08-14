import { describe, expect, it } from 'vitest';

import { exitNodeEndpointSchema, exitNodeSchema } from './exit-nodes.js';

const REGION_ID = '3f1c9d2e-8b7a-4c65-9e10-2d4f6a8b0c31';
const REAL_KEY = 'StZtsGF+hrd7nHOYtH0GhM/759qnBuUbKdVMEeFyLVU=';

describe('exitNodeEndpointSchema', () => {
	it('accepts an address and a port, which is what wireguard dials', () => {
		expect(exitNodeEndpointSchema.parse('203.0.113.10:51820')).toBe('203.0.113.10:51820');
	});

	it('accepts a hostname, because a node behind DNS is still a node', () => {
		expect(exitNodeEndpointSchema.parse('sp-01.example.com:51820')).toBe('sp-01.example.com:51820');
	});

	it('rejects an address with no port, which is the likeliest way to type this wrong', () => {
		expect(exitNodeEndpointSchema.safeParse('203.0.113.10').success).toBe(false);
	});

	it('rejects a port above the range, which a regex on digits alone would accept', () => {
		expect(exitNodeEndpointSchema.safeParse('203.0.113.10:70000').success).toBe(false);
	});

	it('rejects port zero, which parses as a number and dials nothing', () => {
		expect(exitNodeEndpointSchema.safeParse('203.0.113.10:0').success).toBe(false);
	});

	it('accepts an ipv6 literal in brackets, which is a legitimate wireguard endpoint', () => {
		expect(exitNodeEndpointSchema.parse('[2001:db8::1]:51820')).toBe('[2001:db8::1]:51820');
	});

	it('rejects an ipv6 literal without the brackets, because the last colon is the port', () => {
		expect(exitNodeEndpointSchema.safeParse('2001:db8::1:51820').success).toBe(false);
	});

	it('rejects an ipv6 literal that is not one, so the brackets are not a way around the check', () => {
		expect(exitNodeEndpointSchema.safeParse('[2001:db8:::1]:51820').success).toBe(false);
	});

	it.each(['999.999.999.999:80', '256.0.0.1:80'])(
		'rejects %s, which reads as four labels to a hostname rule',
		(value) => {
			expect(exitNodeEndpointSchema.safeParse(value).success).toBe(false);
		},
	);

	it.each(['...:80', '.:1', '-:1', '-a.example.com:80', 'a-.example.com:80', ':80'])(
		'rejects %s, which is not a host any resolver would take',
		(value) => {
			expect(exitNodeEndpointSchema.safeParse(value).success).toBe(false);
		},
	);

	it('reports the failure as a translation key rather than a sentence', () => {
		const parsed = exitNodeEndpointSchema.safeParse('nope');
		expect(parsed.success).toBe(false);
		if (!parsed.success)
			expect(parsed.error.issues[0]?.message).toBe('validation.exitNodeEndpoint.invalid');
	});
});

describe('exitNodeSchema', () => {
	const SEEDED = {
		id: '9c0b1a2d-3e4f-4a5b-8c7d-6e5f4a3b2c1d',
		regionId: REGION_ID,
		label: 'sa-01',
		endpoint: '203.0.113.10:51820',
		controlUrl: 'http://203.0.113.10:51821',
		publicKey: REAL_KEY,
		tunnelCidr: '10.13.13.0/24',
		credentialRef: 'poc-vpn/exit-node/sa',
		lastSeenAt: null,
		createdAt: '2026-08-13T00:00:00.000Z',
	};

	it('holds a node the platform seeded', () => {
		expect(exitNodeSchema.parse(SEEDED).endpoint).toBe('203.0.113.10:51820');
	});

	it('holds the endpoint to the resolver rule, so a bad seed fails where it is written', () => {
		expect(exitNodeSchema.safeParse({ ...SEEDED, endpoint: '203.0.113.10' }).success).toBe(false);
	});

	it('rejects a tunnel range that is not a cidr', () => {
		expect(exitNodeSchema.safeParse({ ...SEEDED, tunnelCidr: '10.13.13.0' }).success).toBe(false);
	});

	// A node whose row does not say where its credential lives has no credential:
	// there is no fleet-wide one left to fall back to.
	it('demands the ref that says where the credential lives', () => {
		const { credentialRef, ...withoutRef } = SEEDED;
		expect(credentialRef).toBeDefined();

		expect(exitNodeSchema.safeParse(withoutRef).success).toBe(false);
	});
});
