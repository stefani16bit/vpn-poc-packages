export interface ErrorContext {
	readonly correlationId?: string;
	readonly accountId?: string;
	readonly route?: string;
	readonly extra?: Readonly<Record<string, unknown>>;
}

export interface IErrorReporter {
	capture(error: unknown, context?: ErrorContext): void;
}

export const ERROR_REPORTER: unique symbol = Symbol.for('vpn.error-reporter');
