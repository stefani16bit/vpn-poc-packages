#!/usr/bin/env sh
#
# Installs the PUBLISHED packages from Verdaccio into a throwaway project and
# imports them.
#
# Why this exists: inside the workspace, `workspace:*` resolves to the source
# directory, so a wrong `files`, a missing `exports` subpath or a dependency
# listed as dev instead of runtime all work perfectly. They only break for a
# consumer - which, thanks to the submodule boundary, is the main repo. This is
# the cheapest way to find out before it does.
#
# Usage: pnpm consumer-check   (after pnpm publish:local)

set -e

cd "$(dirname "$0")"

REGISTRY=${VERDACCIO_URL:-http://localhost:24873}
WORK=".work"

rm -rf "$WORK"
mkdir -p "$WORK"

cat >"$WORK/package.json" <<'JSON'
{
  "name": "consumer-check",
  "private": true,
  "type": "module",
  "version": "0.0.0"
}
JSON

cat >"$WORK/check.mjs" <<'JS'
// Deliberately plain JS with no build step: a consumer that has to compile our
// source to use us is a packaging failure, and TypeScript would hide it.
import * as ports from '@vpn/ports';
import { CACHE_STORE, BILLING_PROVIDER, JOB_QUEUE } from '@vpn/ports';
import { registerRequestSchema, loginRequestSchema, API_ERROR_CODES, SUPPORTED_LOCALES, USER_ROLES } from '@vpn/contracts';
import { getTranslator, negotiateLocale } from '@vpn/i18n';
import { MemoryCacheStore, FixedClock, MemoryJobQueue } from '@vpn/testing/fakes';

const failures = [];
const check = (label, ok) => { if (!ok) failures.push(label); };

check('@vpn/ports exports distinct symbol DI tokens', typeof CACHE_STORE === 'symbol' && CACHE_STORE === Symbol.for('vpn.cache-store') && JOB_QUEUE !== CACHE_STORE && BILLING_PROVIDER !== CACHE_STORE);

// The retired identity port must be gone from the *published* tarball, not merely
// unimported here — that is the difference consumer-check exists to catch.
check('@vpn/ports no longer ships the retired identity port', !('IDENTITY_PROVIDER' in ports));

const parsed = registerRequestSchema.parse({ email: ' Ada@Example.COM ', password: 'a-sufficiently-long-password' });
check('@vpn/contracts normalises an e-mail', parsed.email === 'ada@example.com');
check('@vpn/contracts ships its error codes', API_ERROR_CODES.includes('INVALID_CREDENTIALS'));
check('@vpn/contracts ships the locale list', SUPPORTED_LOCALES.includes('pt-BR'));
check('@vpn/contracts ships the role vocabulary', USER_ROLES.includes('owner'));
check('@vpn/contracts accepts a login without a slug', loginRequestSchema.safeParse({ email: 'ada@example.com', password: 'x' }).success);
check('@vpn/contracts accepts a login scoped by slug', loginRequestSchema.safeParse({ email: 'ada@example.com', password: 'x', slug: 'acme-2' }).success);
check('@vpn/contracts rejects a malformed slug', !loginRequestSchema.safeParse({ email: 'ada@example.com', password: 'x', slug: '-nope-' }).success);

check('@vpn/i18n negotiates a locale', negotiateLocale('en-GB;q=0.9') === 'en');
check('@vpn/i18n translates and interpolates', getTranslator('en')('auth.login.title') === 'Sign in');

const clock = new FixedClock();
const cache = new MemoryCacheStore(clock);
await cache.set({ owner: 'a', namespace: 'n', id: 'i' }, 'v', 60);
check('@vpn/testing/fakes cache round-trips', (await cache.get({ owner: 'a', namespace: 'n', id: 'i' })) === 'v');

const queue = new MemoryJobQueue(clock);
await queue.enqueue({ name: 'auth.verification', data: { userId: 'u-1' } });
const received = await queue.receive({ max: 1 });
check('@vpn/testing/fakes job queue round-trips', received.length === 1 && received[0].name === 'auth.verification');

// The contracts subpath pulls vitest in, so it must NOT be reachable from a
// plain install. Failing to load it here is the pass condition.
let contractsLoaded = false;
try { await import('@vpn/testing/contracts'); contractsLoaded = true; } catch { /* expected */ }
check('@vpn/testing/contracts stays out of a runtime install', !contractsLoaded);

if (failures.length) {
  console.error('consumer-check FAILED:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('consumer-check passed: every package installs and imports from the registry');
JS

cd "$WORK"
npm install --registry "$REGISTRY" --no-audit --no-fund --silent \
	@vpn/ports@latest @vpn/contracts@latest @vpn/testing@latest @vpn/i18n@latest
node check.mjs
