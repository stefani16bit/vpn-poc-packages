import { z } from 'zod';

import { emailSchema, roleSchema } from './auth.js';
import { localeSchema } from './locale.js';

// owner is absent because it is one per account by partial unique index, and no
// request here creates or moves it. DEC-039, DEC-076.
export const ASSIGNABLE_ROLES = ['admin', 'member'] as const;
export const assignableRoleSchema = z.enum(ASSIGNABLE_ROLES, {
	errorMap: () => ({ message: 'validation.role.invalid' }),
});
export type AssignableRole = z.infer<typeof assignableRoleSchema>;

export const createUserRequestSchema = z.object({
	email: emailSchema,
	role: assignableRoleSchema,
	locale: localeSchema.optional(),
});
export type CreateUserRequest = z.infer<typeof createUserRequestSchema>;

export const accountUserSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	role: roleSchema,
	emailVerified: z.boolean(),
	locale: localeSchema,
	liveDeviceCount: z.number().int().nonnegative(),
	createdAt: z.string().datetime(),
});
export type AccountUser = z.infer<typeof accountUserSchema>;

export const userListResponseSchema = z.object({
	users: z.array(accountUserSchema),
});
export type UserListResponse = z.infer<typeof userListResponseSchema>;

export const createUserResponseSchema = z.object({
	user: accountUserSchema,
	temporaryPassword: z.string(),
});
export type CreateUserResponse = z.infer<typeof createUserResponseSchema>;

export const updateUserRoleRequestSchema = z.object({
	role: assignableRoleSchema,
});
export type UpdateUserRoleRequest = z.infer<typeof updateUserRoleRequestSchema>;

export const userResponseSchema = z.object({
	user: accountUserSchema,
});
export type UserResponse = z.infer<typeof userResponseSchema>;
