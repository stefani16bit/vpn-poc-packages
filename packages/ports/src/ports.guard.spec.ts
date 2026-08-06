/**
 * Structural guards for the ports package.
 *
 * These assert properties that are cheap to break and expensive to notice: a
 * port file that nobody exported, a DI token that does not match its file, or a
 * runtime dependency creeping into the one package every other package depends
 * on. None of them can be caught by type-checking.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, '..');

const portFiles = readdirSync(here)
	.filter((name) => name.startsWith('I') && name.endsWith('.ts'))
	.map((name) => name.replace(/\.ts$/, ''));

const barrel = readFileSync(join(here, 'index.ts'), 'utf8');

describe('ports package structure', () => {
	it('has at least one port', () => {
		expect(portFiles.length).toBeGreaterThan(0);
	});

	it.each(portFiles)('%s is re-exported from the barrel', (portFile) => {
		expect(barrel).toContain(`./${portFile}.js`);
	});

	it.each(portFiles)('%s declares the interface its filename promises', (portFile) => {
		const source = readFileSync(join(here, `${portFile}.ts`), 'utf8');
		expect(source).toMatch(new RegExp(`export interface ${portFile}\\b`));
	});

	it.each(portFiles)('%s exports a DI token, because interfaces erase at runtime', (portFile) => {
		const source = readFileSync(join(here, `${portFile}.ts`), 'utf8');
		// IIdentityProvider -> IDENTITY_PROVIDER
		const expected = portFile
			.slice(1)
			.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
			.toUpperCase();
		expect(source).toContain(`export const ${expected} = '${expected}';`);
	});

	it.each(portFiles)('%s opens with a comment explaining why it exists', (portFile) => {
		const source = readFileSync(join(here, `${portFile}.ts`), 'utf8');
		expect(source.startsWith('/**')).toBe(true);
		expect(source).toContain('Contract:');
	});

	// The whole point of this package is that anything may depend on it. A single
	// runtime dependency here is inherited by every adapter, every app, and the
	// browser bundle.
	it('has no runtime dependencies', () => {
		const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
			dependencies?: Record<string, string>;
		};
		expect(manifest.dependencies ?? {}).toEqual({});
	});

	it('imports nothing but its own siblings', () => {
		for (const portFile of portFiles) {
			const source = readFileSync(join(here, `${portFile}.ts`), 'utf8');
			expect(source).not.toMatch(/^\s*import\s/m);
		}
	});
});
