/**
 * Structural guards for the testing package.
 *
 * The vitest rule is the load-bearing one. The fakes are also the `memory`
 * drivers the API runs on locally, so anything they import lands in the
 * production dependency graph - and vitest arriving there is the kind of
 * mistake that only shows up as a container that will not start.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const fakesDir = join(here, 'fakes');
const contractsDir = join(here, 'contracts');

const fakeFiles = readdirSync(fakesDir).filter(
	(name) => name.endsWith('.ts') && !name.endsWith('.spec.ts') && name !== 'index.ts',
);
const contractFiles = readdirSync(contractsDir).filter((name) => name.endsWith('.contract.ts'));

describe('fakes are runtime-safe', () => {
	it.each(fakeFiles)('%s does not import vitest', (fakeFile) => {
		const source = readFileSync(join(fakesDir, fakeFile), 'utf8');
		expect(source).not.toMatch(/from ['"]vitest['"]/);
	});

	it.each(fakeFiles)('%s imports @vpn/ports as types only', (fakeFile) => {
		const source = readFileSync(join(fakesDir, fakeFile), 'utf8');
		// A value import of @vpn/ports would be a DI token, and a fake has no
		// business knowing about the container that wires it.
		for (const line of source.split('\n')) {
			if (line.includes("from '@vpn/ports'")) {
				expect(line.includes('import type') || line.trim().startsWith('}')).toBe(true);
			}
		}
	});

	it.each(fakeFiles)('%s is exported from the fakes barrel', (fakeFile) => {
		const barrel = readFileSync(join(fakesDir, 'index.ts'), 'utf8');
		expect(barrel).toContain(`./${fakeFile.replace(/\.ts$/, '')}.js`);
	});
});

describe('conformance suites', () => {
	it('has at least one', () => {
		expect(contractFiles.length).toBeGreaterThan(0);
	});

	it.each(contractFiles)('%s is exported from the contracts barrel', (contractFile) => {
		const barrel = readFileSync(join(contractsDir, 'index.ts'), 'utf8');
		expect(barrel).toContain(`./${contractFile.replace(/\.ts$/, '')}.js`);
	});

	// A suite that only defines assertions and never exports the describe*
	// function is a suite no adapter can run.
	it.each(contractFiles)('%s exports a describe* entry point', (contractFile) => {
		const source = readFileSync(join(contractsDir, contractFile), 'utf8');
		expect(source).toMatch(/export function describe\w+Contract/);
	});

	it.each(contractFiles)('%s explains why it exists', (contractFile) => {
		const source = readFileSync(join(contractsDir, contractFile), 'utf8');
		expect(source.startsWith('/**')).toBe(true);
	});
});

describe('package boundaries', () => {
	it('does not depend on vitest at runtime', () => {
		const manifest = JSON.parse(readFileSync(join(here, '..', 'package.json'), 'utf8')) as {
			dependencies?: Record<string, string>;
			peerDependencies?: Record<string, string>;
		};
		expect(Object.keys(manifest.dependencies ?? {})).not.toContain('vitest');
		expect(manifest.peerDependencies?.vitest).toBeDefined();
	});
});
