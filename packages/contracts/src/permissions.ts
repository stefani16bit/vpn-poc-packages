import { z } from 'zod';

import { roleSchema, type UserRole } from './auth.js';
import { pageMetaSchema } from './pagination.js';

export const PERMISSIONS = [
	'billing.manage',
	'users.read',
	'users.create',
	'users.update',
	'users.delete',
	'devices.create',
	'devices.assign',
	'devices.readAll',
	'devices.revokeAll',
	'permissions.manage',
] as const;
export const permissionSchema = z.enum(PERMISSIONS);
export type Permission = z.infer<typeof permissionSchema>;

export const DEVICE_PERMISSIONS = [
	'devices.create',
	'devices.assign',
	'devices.readAll',
	'devices.revokeAll',
] as const satisfies readonly Permission[];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
	owner: [...PERMISSIONS],
	admin: [
		'users.read',
		'users.create',
		'users.update',
		'users.delete',
		'devices.create',
		'devices.assign',
		'devices.readAll',
		'devices.revokeAll',
	],
	member: ['devices.create'],
};

export const permissionGrantSchema = z.object({
	permission: permissionSchema,
	granted: z.boolean(),
});
export type PermissionGrant = z.infer<typeof permissionGrantSchema>;

export interface StoredGrant {
	readonly permission: string;
	readonly granted: boolean;
}

export function effectivePermissions(
	role: UserRole,
	roleGrants: readonly StoredGrant[],
	userGrants: readonly StoredGrant[],
): Permission[] {
	if (role === 'owner') return [...PERMISSIONS];

	const effective = new Set<Permission>(DEFAULT_ROLE_PERMISSIONS[role]);

	for (const grant of [...roleGrants, ...userGrants]) {
		const parsed = permissionSchema.safeParse(grant.permission);
		if (!parsed.success) continue;

		if (grant.granted) effective.add(parsed.data);
		else effective.delete(parsed.data);
	}

	return PERMISSIONS.filter((permission) => effective.has(permission));
}

export const permissionsResponseSchema = z.object({
	permissions: z.array(permissionSchema),
});
export type PermissionsResponse = z.infer<typeof permissionsResponseSchema>;

export const roleGrantsSchema = z.object({
	role: roleSchema,
	defaults: z.array(permissionSchema),
	grants: z.array(permissionGrantSchema),
	effective: z.array(permissionSchema),
});
export type RoleGrants = z.infer<typeof roleGrantsSchema>;

// `effective` next to `grants` because a screen handed only the departures shows
// nothing at all until the first exception exists. DEC-113.
export const userGrantsSchema = z.object({
	userId: z.string().uuid(),
	email: z.string().email(),
	role: roleSchema,
	grants: z.array(permissionGrantSchema),
	effective: z.array(permissionSchema),
});
export type UserGrants = z.infer<typeof userGrantsSchema>;

export const roleGrantsResponseSchema = z.object({
	roles: z.array(roleGrantsSchema),
});
export type RoleGrantsResponse = z.infer<typeof roleGrantsResponseSchema>;

export const userGrantsResponseSchema = z.object({
	user: userGrantsSchema,
});
export type UserGrantsResponse = z.infer<typeof userGrantsResponseSchema>;

export const userGrantsPageResponseSchema = pageMetaSchema.extend({
	users: z.array(userGrantsSchema),
});
export type UserGrantsPageResponse = z.infer<typeof userGrantsPageResponseSchema>;

export const updateGrantsRequestSchema = z.object({
	grants: z.array(permissionGrantSchema),
});
export type UpdateGrantsRequest = z.infer<typeof updateGrantsRequestSchema>;
