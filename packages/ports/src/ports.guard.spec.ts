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

	it('exports a distinct symbol per port', () => {
		const tokens = portFiles.map((portFile) => {
			const source = readFileSync(join(here, `${portFile}.ts`), 'utf8');
			return /Symbol\.for\('([^']+)'\)/.exec(source)?.[1];
		});
		expect(new Set(tokens).size).toBe(portFiles.length);
	});

	it.each(portFiles)('%s exports a DI token, because interfaces erase at runtime', (portFile) => {
		const source = readFileSync(join(here, `${portFile}.ts`), 'utf8');
		const expected = portFile
			.slice(1)
			.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
			.toUpperCase();
		const slug = expected.toLowerCase().replace(/_/g, '-');
		expect(source).toContain(
			`export const ${expected}: unique symbol = Symbol.for('vpn.${slug}');`,
		);
	});

	it.each(portFiles)('%s carries no explanatory comment block', (portFile) => {
		const source = readFileSync(join(here, `${portFile}.ts`), 'utf8');
		expect(source.startsWith('/*')).toBe(false);
		expect(source).not.toMatch(/^\s*\/\//m);
	});

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
