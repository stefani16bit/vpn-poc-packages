export const API_ERROR_CODES = [
	'VALIDATION_FAILED',
	'INVALID_CREDENTIALS',
	'EMAIL_NOT_VERIFIED',
	'TOKEN_INVALID',
	'TOKEN_EXPIRED',
	'SESSION_REUSE_DETECTED',
	'RATE_LIMITED',
	'UNAUTHENTICATED',
	'FORBIDDEN',
	'NOT_FOUND',
	'CONFLICT',
	'PAYMENT_REQUIRED',
	'QUOTA_EXCEEDED',
	'INTERNAL',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorResponse {
	readonly code: ApiErrorCode;
	readonly message: string;
	readonly correlationId: string;
	readonly fields?: Readonly<Record<string, string>>;
	// Mirrors the Retry-After header. It is in the body too because the screen
	// that has to word the wait reads the body, not the headers.
	readonly retryAfterSeconds?: number;
}

export const CLIENT_ERROR_CODES = ['_NETWORK_ERROR', '_PARSE_ERROR', '_UNKNOWN_ERROR'] as const;

export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[number];

export type AnyErrorCode = ApiErrorCode | ClientErrorCode;
