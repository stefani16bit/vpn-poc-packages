export interface VitestPresetOptions {
	readonly coverageExclude?: readonly string[];
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
