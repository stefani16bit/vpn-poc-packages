/**
 * The error vocabulary the API is allowed to speak.
 *
 * Why a closed union: the web app branches on `code`, and a string typo turns
 * into a silently unhandled branch that renders the generic message. With the
 * union published, the branch that forgot a case fails to compile.
 *
 * Contract:
 *   - one code per user-visible outcome, never per throw site
 *   - `message` is for developers and logs. Never render it: it is not
 *     localised and may leak internals. The client maps `code` to its own copy.
 *   - correlationId is always present on a response the server generated, and
 *     is the value to quote in a bug report
 */

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
	'INTERNAL',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiErrorResponse {
	readonly code: ApiErrorCode;
	/** Developer-facing. Not localised, never rendered to a user. */
	readonly message: string;
	readonly correlationId: string;
	/** Present only for VALIDATION_FAILED: field path -> first message. */
	readonly fields?: Readonly<Record<string, string>>;
}

/**
 * Codes the CLIENT synthesises when there is no server response to read. They
 * are separate from ApiErrorCode because nothing on the server may ever emit
 * them, and mixing the two makes "did the request reach us?" unanswerable from
 * a log line alone.
 */
export const CLIENT_ERROR_CODES = ['_NETWORK_ERROR', '_PARSE_ERROR', '_UNKNOWN_ERROR'] as const;

export type ClientErrorCode = (typeof CLIENT_ERROR_CODES)[number];

export type AnyErrorCode = ApiErrorCode | ClientErrorCode;
