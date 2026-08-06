/**
 * Auth request/response schemas.
 *
 * Why they live in a published package rather than in the API: the web form and
 * the endpoint must agree on what a valid password is, and the version of that
 * rule that gets forgotten is always the client's. Sharing the schema makes the
 * form validation and the server validation the same object.
 *
 * Contract:
 *   - every schema is the SERVER's authority. The client re-using it is a
 *     convenience, never a substitute for validating on arrival.
 *   - responses never carry a password hash, a refresh token, or an internal id
 *     the client has no use for
 */

import { z } from 'zod';

/**
 * Lowercased and trimmed at the schema, not at the call site. Two accounts
 * differing only in case is the bug this prevents, and it has to be prevented
 * in exactly one place.
 */
export const emailSchema = z
	.string()
	.trim()
	.toLowerCase()
	.min(3)
	.max(254)
	.email();

/**
 * Length over composition rules. A 12-character minimum with no character-class
 * requirement resists guessing better than 8-with-a-symbol, and does not push
 * users towards Password1!.
 */
export const passwordSchema = z
	.string()
	.min(12, 'password must be at least 12 characters')
	.max(200, 'password must be at most 200 characters');

export const registerRequestSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
	locale: z.string().min(2).max(10).default('pt-BR'),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
	email: emailSchema,
	password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const verifyEmailRequestSchema = z.object({
	token: z.string().min(16),
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
	token: z.string().min(16),
	password: passwordSchema,
});
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

export const authenticatedUserSchema = z.object({
	id: z.string().uuid(),
	email: z.string().email(),
	emailVerified: z.boolean(),
	createdAt: z.string().datetime(),
});
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;

/**
 * The refresh token is absent on purpose: it travels as an httpOnly cookie so
 * that XSS cannot read it. Putting it in the body as well would undo that for
 * the convenience of one client.
 */
export const sessionResponseSchema = z.object({
	user: authenticatedUserSchema,
	accessToken: z.string(),
	expiresIn: z.number().int().positive(),
});
export type SessionResponse = z.infer<typeof sessionResponseSchema>;

/**
 * Deliberately contentless. Register, forgot-password and resend-verification
 * all answer with this regardless of whether the address exists, because any
 * difference between the two answers is an account enumeration oracle.
 */
export const acknowledgedResponseSchema = z.object({
	acknowledged: z.literal(true),
});
export type AcknowledgedResponse = z.infer<typeof acknowledgedResponseSchema>;
