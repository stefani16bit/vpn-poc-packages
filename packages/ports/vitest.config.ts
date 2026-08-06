import { defineConfig } from 'vitest/config';

// No coverage thresholds here: this package is types plus DI token constants,
// so a percentage would measure nothing. The guard specs are what matter.
export default defineConfig({
	test: { environment: 'node' },
});
