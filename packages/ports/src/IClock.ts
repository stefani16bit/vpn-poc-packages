export interface IClock {
	now(): Date;
}

export const CLOCK: unique symbol = Symbol.for('vpn.clock');
