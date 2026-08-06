/**
 * Shared vitest preset.
 *
 * Why a package and not a copied file: the coverage thresholds are the
 * enforcement point for the TDD non-negotiable in CLAUDE.md. Copied per repo
 * they drift downwards one "just this once" at a time; imported, lowering them
 * is a visible change to a published package.
 *
 * Contract:
 *   - thresholds ratchet up only; a caller may raise, never lower
 *   - the returned object is plain data, so a caller can spread and extend it
 */

export interface VitestPresetOptions {
	/** Extra glob patterns to exclude from coverage, on top of the defaults. */
	readonly coverageExclude?: readonly string[];
	/** Raise the 80% floor. Values below it are clamped back up. */
	readonly thresholds?: Partial<CoverageThresholds>;
	readonly environment?: 'node' | 'jsdom';
	readonly setupFiles?: readonly string[];
}

export interface CoverageThresholds {
	readonly lines: number;
	readonly functions: number;
	readonly branches: number;
	readonly statements: number;
}

const FLOOR: CoverageThresholds = {
	lines: 80,
	functions: 80,
	branches: 80,
	statements: 80,
};

const DEFAULT_COVERAGE_EXCLUDE = [
	'**/dist/**',
	'**/node_modules/**',
	'**/*.config.*',
	'**/*.d.ts',
	'**/index.ts',
	'**/main.ts',
	'**/*.contract.ts',
	'**/fakes/**',
];

/**
 * Clamps every threshold to the 80% floor. A caller asking for 60 gets 80 and
 * no error: the point is that the number in their config is aspirational, and
 * silently honouring it would make the floor a suggestion.
 */
export function resolveThresholds(requested?: Partial<CoverageThresholds>): CoverageThresholds {
	return {
		lines: Math.max(FLOOR.lines, requested?.lines ?? 0),
		functions: Math.max(FLOOR.functions, requested?.functions ?? 0),
		branches: Math.max(FLOOR.branches, requested?.branches ?? 0),
		statements: Math.max(FLOOR.statements, requested?.statements ?? 0),
	};
}

export function createVitestConfig(options: VitestPresetOptions = {}) {
	return {
		test: {
			environment: options.environment ?? 'node',
			globals: false,
			...(options.setupFiles ? { setupFiles: [...options.setupFiles] } : {}),
			coverage: {
				provider: 'v8' as const,
				reporter: ['text', 'lcov'],
				exclude: [...DEFAULT_COVERAGE_EXCLUDE, ...(options.coverageExclude ?? [])],
				thresholds: resolveThresholds(options.thresholds),
			},
		},
	};
}
