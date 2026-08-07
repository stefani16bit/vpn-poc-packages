import { randomUUID } from 'node:crypto';

import type { IClock, IJobQueue, JobEnvelope, ReceiveOptions, ReceivedJob } from '@vpn/ports';

interface Entry {
	readonly id: string;
	readonly body: string;
	receipt: string | null;
	visibleAt: number;
}

const DEFAULT_VISIBILITY_SECONDS = 30;
const DEFAULT_MAX = 10;

export interface MemoryJobQueueOptions {
	readonly visibilitySeconds?: number;
}

export class MemoryJobQueue implements IJobQueue {
	readonly #entries: Entry[] = [];
	readonly #clock: IClock;
	readonly #visibilityMs: number;

	constructor(clock: IClock, options: MemoryJobQueueOptions = {}) {
		this.#clock = clock;
		this.#visibilityMs = (options.visibilitySeconds ?? DEFAULT_VISIBILITY_SECONDS) * 1000;
	}

	async enqueue(job: JobEnvelope): Promise<void> {
		this.#entries.push({
			id: `job_${randomUUID()}`,
			body: JSON.stringify(job),
			receipt: null,
			visibleAt: this.#now(),
		});
	}

	async receive(options: ReceiveOptions = {}): Promise<readonly ReceivedJob[]> {
		const now = this.#now();
		const max = options.max ?? DEFAULT_MAX;
		const taken: ReceivedJob[] = [];

		for (const entry of this.#entries) {
			if (taken.length >= max) break;
			if (entry.visibleAt > now) continue;

			entry.receipt = `rcpt_${randomUUID()}`;
			entry.visibleAt = now + this.#visibilityMs;

			taken.push({
				...(JSON.parse(entry.body) as JobEnvelope),
				id: entry.id,
				receipt: entry.receipt,
			});
		}

		return taken;
	}

	async acknowledge(receipt: string): Promise<void> {
		const index = this.#entries.findIndex((entry) => entry.receipt === receipt);
		if (index === -1) return;

		this.#entries.splice(index, 1);
	}

	makeEverythingVisible(): void {
		for (const entry of this.#entries) {
			entry.receipt = null;
			entry.visibleAt = 0;
		}
	}

	get depth(): number {
		return this.#entries.length;
	}

	#now(): number {
		return this.#clock.now().getTime();
	}
}
