/**
 * A clock the test moves by hand.
 *
 * Why not vi.useFakeTimers: fake timers are global and leak across a suite that
 * forgets to restore them, and they also freeze timers the adapter under test
 * legitimately uses. An injected clock only affects the code that asked for it.
 */

import type { IClock } from '@vpn/ports';

export class FixedClock implements IClock {
	#current: Date;

	constructor(start: Date = new Date('2026-01-01T00:00:00.000Z')) {
		this.#current = new Date(start.getTime());
	}

	now(): Date {
		// A copy, so a caller mutating the returned Date cannot move the clock.
		return new Date(this.#current.getTime());
	}

	advance(seconds: number): void {
		this.#current = new Date(this.#current.getTime() + seconds * 1000);
	}

	set(at: Date): void {
		this.#current = new Date(at.getTime());
	}
}
