export interface JobEnvelope {
	readonly name: string;
	readonly data: Record<string, unknown>;
	readonly idempotencyKey?: string;
}

export interface ReceivedJob extends JobEnvelope {
	readonly id: string;
	readonly receipt: string;
}

export interface ReceiveOptions {
	readonly max?: number;
	readonly waitSeconds?: number;
}

export interface IJobQueue {
	enqueue(job: JobEnvelope): Promise<void>;
	receive(options?: ReceiveOptions): Promise<readonly ReceivedJob[]>;
	acknowledge(receipt: string): Promise<void>;
}

export const JOB_QUEUE: unique symbol = Symbol.for('vpn.job-queue');
