import type { IClock } from '@vpn/ports';

export class FixedClock implements IClock {
	#current: Date;

	constructor(start: Date = new Date('2026-01-01T00:00:00.000Z')) {
		this.#current = new Date(start.getTime());
	}

	now(): Date {
		return new Date(this.#current.getTime());
	}

	advance(seconds: number): void {
		this.#current = new Date(this.#current.getTime() + seconds * 1000);
	}

	set(at: Date): void {
		this.#current = new Date(at.getTime());
	}
}
