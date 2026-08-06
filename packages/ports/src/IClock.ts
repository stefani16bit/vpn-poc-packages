/**
 * Time as a dependency.
 *
 * Why: every expiry rule in this system - access token TTL, reset token
 * validity, resend cooldown - is a comparison against "now". With Date.now()
 * inlined, testing "the token expired" means either sleeping or mutating global
 * time, and both make the suite flaky in a way that gets solved by deleting the
 * test.
 *
 * Contract:
 *   - now() is monotonic within a single process for the real adapter
 *   - callers never construct Date themselves; they ask the clock
 */
export interface IClock {
	now(): Date;
}

export const CLOCK = 'CLOCK';
