import { beforeEach, describe, expect, it } from 'vitest';

import type { IJobQueue, ReceivedJob } from '@vpn/ports';

export interface JobQueueHarness {
	readonly queue: IJobQueue;
	expire(): Promise<void> | void;
}

const POLL = { max: 10, waitSeconds: 1 } as const;
const IMMEDIATE = { max: 10, waitSeconds: 0 } as const;

const EMPTY_ROUNDS_UNTIL_DRAINED = 2;

async function collect(queue: IJobQueue, expected: number): Promise<ReceivedJob[]> {
	const jobs: ReceivedJob[] = [];
	let empty = 0;

	while (jobs.length < expected && empty < EMPTY_ROUNDS_UNTIL_DRAINED) {
		const received = await queue.receive(POLL);
		if (received.length === 0) empty += 1;
		else {
			empty = 0;
			jobs.push(...received);
		}
	}

	return jobs;
}

export function describeJobQueueContract(
	name: string,
	createHarness: () => Promise<JobQueueHarness> | JobQueueHarness,
): void {
	describe(`${name} (IJobQueue contract)`, () => {
		let harness: JobQueueHarness;
		let queue: IJobQueue;

		beforeEach(async () => {
			harness = await createHarness();
			queue = harness.queue;
		});

		it('returns an empty list for an empty queue rather than throwing', async () => {
			await expect(queue.receive(IMMEDIATE)).resolves.toEqual([]);
		});

		it('round-trips the name and the data', async () => {
			await queue.enqueue({ name: 'auth.verification', data: { accountId: 'acc-1' } });

			const [job] = await collect(queue, 1);
			expect(job?.name).toBe('auth.verification');
			expect(job?.data).toEqual({ accountId: 'acc-1' });
		});

		it('does not reshape the data: nesting, unicode and null survive intact', async () => {
			const data = {
				endsAt: null,
				nested: { deep: ['ção', '✅', 1, true] },
				empty: {},
			};
			await queue.enqueue({ name: 'billing.subscription_canceled', data });

			const [job] = await collect(queue, 1);
			expect(job?.data).toEqual(data);
		});

		it('carries the idempotency key through', async () => {
			await queue.enqueue({
				name: 'billing.payment_failed',
				data: { accountId: 'acc-1' },
				idempotencyKey: 'payment-failed:evt-1',
			});

			const [job] = await collect(queue, 1);
			expect(job?.idempotencyKey).toBe('payment-failed:evt-1');
		});

		it('does not deduplicate on the idempotency key: that is the consumer business', async () => {
			const job = { name: 'auth.welcome', data: { accountId: 'acc-1' }, idempotencyKey: 'same' };
			await queue.enqueue(job);
			await queue.enqueue(job);

			expect(await collect(queue, 2)).toHaveLength(2);
		});

		it('hands out a receipt that identifies the delivery', async () => {
			await queue.enqueue({ name: 'auth.welcome', data: {} });

			const [job] = await queue.receive(POLL);
			expect(job?.receipt).toBeTruthy();
			expect(job?.id).toBeTruthy();
		});

		it('stops delivering a job once it is acknowledged', async () => {
			await queue.enqueue({ name: 'auth.welcome', data: {} });

			const [job] = await queue.receive(POLL);
			if (!job) throw new Error('expected a job');
			await queue.acknowledge(job.receipt);

			await harness.expire();
			expect(await collect(queue, 1)).toEqual([]);
		});

		it('delivers a job again when it is never acknowledged', async () => {
			await queue.enqueue({ name: 'auth.welcome', data: {} });
			expect(await queue.receive(POLL)).toHaveLength(1);

			await harness.expire();
			expect(await collect(queue, 1)).toHaveLength(1);
		});

		it('hides a job from a second reader while it is in flight', async () => {
			await queue.enqueue({ name: 'auth.welcome', data: {} });
			expect(await queue.receive(POLL)).toHaveLength(1);

			await expect(queue.receive(IMMEDIATE)).resolves.toEqual([]);
		});

		it('delivers every job that was enqueued', async () => {
			const names = ['a', 'b', 'c'];
			for (const jobName of names) await queue.enqueue({ name: jobName, data: {} });

			const received = await collect(queue, names.length);
			expect(received.map((job) => job.name).sort()).toEqual(names);
		});

		it('treats acknowledging an unknown receipt as a success', async () => {
			await expect(queue.acknowledge('no-such-receipt')).resolves.toBeUndefined();
		});

		it('never hands back more than the caller asked for', async () => {
			for (const jobName of ['a', 'b', 'c']) await queue.enqueue({ name: jobName, data: {} });

			expect((await queue.receive({ max: 2, waitSeconds: 1 })).length).toBeLessThanOrEqual(2);
		});
	});
}
