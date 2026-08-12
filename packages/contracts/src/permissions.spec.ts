import { describe, expect, it } from 'vitest';

import { USER_ROLES } from './auth.js';
import {
	DEFAULT_ROLE_PERMISSIONS,
	PERMISSIONS,
	effectivePermissions,
	permissionGrantSchema,
	permissionSchema,
	permissionsResponseSchema,
	roleGrantsResponseSchema,
} from './permissions.js';

describe('PERMISSIONS', () => {
	it('names every permission as resource.action, so a screen can group them', () => {
		for (const permission of PERMISSIONS) {
			expect(permission).toMatch(/^[a-z]+\.[a-z]+$/);
		}
	});

	it('has no duplicate', () => {
		expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
	});
});

describe('DEFAULT_ROLE_PERMISSIONS', () => {
	it('covers every role, so a lookup never falls off the map', () => {
		expect(Object.keys(DEFAULT_ROLE_PERMISSIONS).sort()).toEqual([...USER_ROLES].sort());
	});

	it('grants nothing it cannot name', () => {
		for (const role of USER_ROLES) {
			for (const permission of DEFAULT_ROLE_PERMISSIONS[role]) {
				expect(PERMISSIONS).toContain(permission);
			}
		}
	});

	it('gives the owner everything, because the account starts as one person', () => {
		expect([...DEFAULT_ROLE_PERMISSIONS.owner].sort()).toEqual([...PERMISSIONS].sort());
	});

	it('lets an admin manage people and not money', () => {
		expect(DEFAULT_ROLE_PERMISSIONS.admin).toContain('users.create');
		expect(DEFAULT_ROLE_PERMISSIONS.admin).not.toContain('billing.manage');
	});

	it('lets a member generate its own key by default, which a tenant may take away', () => {
		expect(DEFAULT_ROLE_PERMISSIONS.member).toEqual(['devices.create']);
	});

	it('keeps permissions.manage away from everyone but the owner', () => {
		expect(DEFAULT_ROLE_PERMISSIONS.admin).not.toContain('permissions.manage');
		expect(DEFAULT_ROLE_PERMISSIONS.member).not.toContain('permissions.manage');
	});
});

describe('effectivePermissions', () => {
	it('falls back to the code map when the account granted nothing', () => {
		expect(effectivePermissions('member', [], [])).toEqual(['devices.create']);
	});

	it('adds what the account granted the role', () => {
		const effective = effectivePermissions(
			'member',
			[{ permission: 'users.read', granted: true }],
			[],
		);

		expect(effective).toContain('devices.create');
		expect(effective).toContain('users.read');
	});

	it('lets an account take the only default a member has, which is the empty set', () => {
		expect(
			effectivePermissions('member', [{ permission: 'devices.create', granted: false }], []),
		).toEqual([]);
	});

	it('lets one person differ from another with the same role', () => {
		const account = [{ permission: 'devices.create', granted: false }] as const;

		expect(
			effectivePermissions('member', account, [{ permission: 'devices.create', granted: true }]),
		).toEqual(['devices.create']);
		expect(effectivePermissions('member', account, [])).toEqual([]);
	});

	it('lets a revoke on the person beat a grant on the role', () => {
		expect(
			effectivePermissions(
				'member',
				[{ permission: 'devices.create', granted: true }],
				[{ permission: 'devices.create', granted: false }],
			),
		).toEqual([]);
	});

	it('ignores every grant written against the owner, in both layers', () => {
		const stripped = PERMISSIONS.map((permission) => ({ permission, granted: false }));

		expect(effectivePermissions('owner', stripped, stripped)).toEqual([...PERMISSIONS]);
	});

	it('gives the owner a permission it was never granted, because it holds them all', () => {
		expect(effectivePermissions('owner', [], [])).toEqual([...PERMISSIONS]);
	});

	it('ignores a stored permission the code no longer names', () => {
		const effective = effectivePermissions(
			'member',
			[{ permission: 'devices.teleport', granted: true }],
			[],
		);

		expect(effective).toEqual(['devices.create']);
	});

	it('answers in a stable order, so two reads compare equal', () => {
		const grants = [
			{ permission: 'users.read', granted: true },
			{ permission: 'billing.manage', granted: true },
		];

		expect(effectivePermissions('member', grants, [])).toEqual(
			effectivePermissions('member', [...grants].reverse(), []),
		);
	});
});

describe('the wire shapes', () => {
	it('accepts a permission the client knows how to honour', () => {
		expect(permissionSchema.safeParse('devices.create').success).toBe(true);
	});

	it('rejects one it does not', () => {
		expect(permissionSchema.safeParse('devices.teleport').success).toBe(false);
	});

	it('carries the effective set of the caller', () => {
		expect(permissionsResponseSchema.safeParse({ permissions: ['devices.create'] }).success).toBe(
			true,
		);
	});

	it('carries a grant as a permission and a side', () => {
		expect(
			permissionGrantSchema.safeParse({ permission: 'devices.create', granted: false }).success,
		).toBe(true);
	});

	it('carries the defaults next to the grants, so a screen can show what diverges', () => {
		const parsed = roleGrantsResponseSchema.safeParse({
			roles: [
				{
					role: 'member',
					defaults: ['devices.create'],
					grants: [{ permission: 'devices.create', granted: false }],
					effective: [],
				},
			],
			users: [
				{
					userId: '00000000-0000-0000-0000-000000000000',
					email: 'ana@example.com',
					role: 'member',
					grants: [{ permission: 'devices.create', granted: true }],
				},
			],
		});

		expect(parsed.success).toBe(true);
	});
});
