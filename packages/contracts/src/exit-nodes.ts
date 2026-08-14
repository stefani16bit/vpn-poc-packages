import { z } from 'zod';

import { publicKeySchema } from './devices.js';

// How long a node may stay silent before it stops receiving new devices. Three
// missed healthchecks, so one slow answer does not empty a region. The same
// number decides what a region reports as available, because a picker that
// judged staleness by its own clock would offer what the next call refuses.
export const STALE_AFTER_SECONDS = 180;

// A label may not open or close on a hyphen, and the last one may not be all
// digits: without that, a hostname rule swallows 999.999.999.999 as four
// perfectly ordinary labels.
const HOSTNAME = /^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z][A-Za-z0-9-]*$/;
const PORT = /^\d{1,5}$/;

const ipv4 = z.string().ip({ version: 'v4' });
const ipv6 = z.string().ip({ version: 'v6' });

// Brackets are how an ipv6 endpoint says where the address ends and the port
// begins; without them the last colon belongs to the address and there is no
// port to find.
function splitEndpoint(value: string): readonly [host: string, port: string] | null {
	if (value.startsWith('[')) {
		const closed = value.indexOf(']:');

		return closed < 0 ? null : [value.slice(1, closed), value.slice(closed + 2)];
	}

	const colon = value.lastIndexOf(':');

	return colon < 1 ? null : [value.slice(0, colon), value.slice(colon + 1)];
}

function isEndpoint(value: string): boolean {
	const split = splitEndpoint(value);
	if (!split) return false;

	const [host, port] = split;
	if (!PORT.test(port) || Number(port) < 1 || Number(port) > 65535) return false;

	return value.startsWith('[')
		? ipv6.safeParse(host).success
		: ipv4.safeParse(host).success || HOSTNAME.test(host);
}

export const exitNodeEndpointSchema = z
	.string()
	.trim()
	.refine(isEndpoint, 'validation.exitNodeEndpoint.invalid');

// Nothing on the wire carries this: the fleet is ours and no route hands a node
// to a tenant. It is the shape the seeded rows are held to, so a malformed
// endpoint is caught where it is written rather than by a client that never
// completes a handshake.
export const exitNodeSchema = z.object({
	id: z.string().uuid(),
	regionId: z.string().uuid(),
	label: z.string().trim().min(1).max(60),
	endpoint: exitNodeEndpointSchema,
	controlUrl: z.string().url(),
	publicKey: publicKeySchema,
	tunnelCidr: z.string().regex(/^(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/),
	credentialRef: z.string().trim().min(1),
	lastSeenAt: z.string().datetime().nullable(),
	createdAt: z.string().datetime(),
});
export type ExitNode = z.infer<typeof exitNodeSchema>;
