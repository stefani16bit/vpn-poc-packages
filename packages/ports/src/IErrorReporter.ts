/**
 * Crash reporting.
 *
 * Why a port: the noop adapter is the point. Local development and the test
 * suite must not need a DSN, and the alternative - an `if (process.env.SENTRY_DSN)`
 * around every capture call - is the same conditional written thirty times.
 *
 * Contract:
 *   - capture never throws and never rejects. A reporter that fails must not
 *     turn a handled 500 into an unhandled one; swallow and move on.
 *   - the adapter is responsible for redacting PII before transmission. The
 *     caller may pass a request context and trust it is scrubbed.
 */

export interface ErrorContext {
	readonly correlationId?: string;
	readonly accountId?: string;
	readonly route?: string;
	readonly extra?: Readonly<Record<string, unknown>>;
}

export interface IErrorReporter {
	capture(error: unknown, context?: ErrorContext): void;
}

export const ERROR_REPORTER = 'ERROR_REPORTER';
