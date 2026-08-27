import { describe, expect, it } from 'vitest';

import {
	DEFAULT_PAGE_SIZE,
	MAX_PAGE_SIZE,
	pageCount,
	pageMetaSchema,
	pageOffset,
	pageQuerySchema,
} from './pagination.js';

describe('pageQuerySchema', () => {
	it('answers the first page when the caller asked for nothing', () => {
		expect(pageQuerySchema.parse({})).toEqual({ page: 1, perPage: DEFAULT_PAGE_SIZE });
	});

	it('reads a query string, where every value arrives as text', () => {
		expect(pageQuerySchema.parse({ page: '3', perPage: '10' })).toEqual({ page: 3, perPage: 10 });
	});

	it('refuses page zero, because a page is what a person counts and people start at one', () => {
		expect(pageQuerySchema.safeParse({ page: '0' }).success).toBe(false);
	});

	it('refuses a page that is not a number at all', () => {
		expect(pageQuerySchema.safeParse({ page: 'abc' }).success).toBe(false);
	});

	it('refuses a fractional page', () => {
		expect(pageQuerySchema.safeParse({ page: '1.5' }).success).toBe(false);
	});

	it('caps the size, so one caller cannot ask for the whole account', () => {
		expect(pageQuerySchema.safeParse({ perPage: String(MAX_PAGE_SIZE) }).success).toBe(true);
		expect(pageQuerySchema.safeParse({ perPage: String(MAX_PAGE_SIZE + 1) }).success).toBe(false);
	});
});

describe('pageOffset', () => {
	it('starts the first page at the beginning', () => {
		expect(pageOffset(1, 6)).toBe(0);
	});

	it('skips a whole page for every page before this one', () => {
		expect(pageOffset(2, 6)).toBe(6);
		expect(pageOffset(4, 6)).toBe(18);
	});
});

describe('pageCount', () => {
	it('counts a partial page as a page, since its rows have to be reachable', () => {
		expect(pageCount(7, 6)).toBe(2);
	});

	it('counts an exact fit once', () => {
		expect(pageCount(12, 6)).toBe(2);
	});

	// Zero and not one: a pager over nothing is a control that leads nowhere, and
	// the screen decides to skip it by asking whether there is a second page.
	it('counts no page at all when there is nothing to page through', () => {
		expect(pageCount(0, 6)).toBe(0);
	});
});

describe('pageMetaSchema', () => {
	it('carries the total, because numbered pages cannot be drawn without it', () => {
		expect(pageMetaSchema.safeParse({ page: 1, perPage: 6, total: 7 }).success).toBe(true);
	});

	it('refuses a negative total', () => {
		expect(pageMetaSchema.safeParse({ page: 1, perPage: 6, total: -1 }).success).toBe(false);
	});
});
