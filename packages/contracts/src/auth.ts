import { z } from 'zod';

import { localeSchema } from './locale.js';

export const emailSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(3, 'validation.email.invalid')
	.max(254, 'validation.email.tooLong')
	.email('validation.email.invalid');

export const passwordSchema = z
	.string()
	.min(12, 'validation.password.tooShort')
	.max(200, 'validation.password.tooLong');

export const registerRequestSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
	locale: localeSchema.optional(),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
	email: emailSchema,
	password: z.string().min(1, 'validation.password.required'),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const verifyEmailRequestSchema = z.object({
	token: z.string().min(16, 'validation.token.invalid'),
});
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;

export const resendVerificationRequestSchema = z.object({
	email: emailSchema,
});
export type ResendVerificationRequest = z.infer<typeof resendVerificationRequestSchema>;

export const forgotPasswordRequestSchema = z.object({
	email: emailSchema,
});
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;

export const resetPasswordRequestSchema = z.object({
	token: z.string().min(16, 'validation.token.invalid'),
	password: passwordSchema,
});
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

export const authenticatedUserSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	emailVerified: z.boolean(),
	locale: localeSchema,
	createdAt: z.string().datetime(),
});
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;

export const sessionResponseSchema = z.object({
	user: authenticatedUserSchema,
	accessToken: z.string(),
	expiresIn: z.number().int().positive(),
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export const acknowledgedResponseSchema = z.object({
	acknowledged: z.literal(true),
});
export type AcknowledgedResponse = z.infer<typeof acknowledgedResponseSchema>;
