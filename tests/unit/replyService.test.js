import { jest } from '@jest/globals';

const noopLogger = {
	info: () => {},
	warn: () => {},
	error: () => {},
	debug: () => {},
	count: () => {},
};

/**
 * Build a fake paginated endpoint over `items` with `pageSize` items per page.
 * Returns the fetch function plus a call counter.
 */
function fakeEndpoint(items, pageSize = 25) {
	const calls = [];
	const fetchFn = jest.fn(async (_token, _logger, { limit = 25, after } = {}) => {
		const start = after ? parseInt(after, 10) : 0;
		const size = Math.min(limit, pageSize);
		const data = items.slice(start, start + size);
		const next = start + size;
		calls.push({ limit, after });
		return {
			data,
			paging: next < items.length ? { cursors: { after: String(next) } } : {},
		};
	});
	return { fetchFn, calls };
}

function makeItems(count, prefix, likesFor) {
	return Array.from({ length: count }, (_, i) => ({
		id: `${prefix}${i}`,
		text: `item ${i}`,
		timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, count - i)).toISOString(),
		is_reply: prefix === 'r',
		_likes: likesFor(i),
	}));
}

async function loadServiceWith({ replies = [], threads = [] }) {
	jest.resetModules();

	const repliesEp = fakeEndpoint(replies);
	const threadsEp = fakeEndpoint(threads);
	const all = new Map([...replies, ...threads].map((it) => [it.id, it._likes]));
	const fetchMediaLikes = jest.fn(async (id) => all.get(id) ?? 0);

	jest.unstable_mockModule('../../src/infrastructure/threads/threadsClient.js', () => ({
		fetchUserReplies: repliesEp.fetchFn,
		fetchUserThreads: threadsEp.fetchFn,
		fetchMediaLikes,
		validateAccessToken: jest.fn(),
		deleteThread: jest.fn(),
	}));

	const { fetchReplies } = await import('../../src/core/services/replyService.js');
	return { fetchReplies, repliesEp, threadsEp, fetchMediaLikes };
}

describe('fetchReplies with minLikes threshold', () => {
	test('keeps paginating when the first pages are entirely above the threshold', async () => {
		// 100 recent replies all with 50 likes, then 30 older ones with 1 like.
		const replies = makeItems(130, 'r', (i) => (i < 100 ? 50 : 1));
		const { fetchReplies, repliesEp } = await loadServiceWith({ replies });

		const result = await fetchReplies('tok', 100, noopLogger, { type: 'replies', minLikes: 5 });

		expect(result).toHaveLength(30);
		expect(result.every((it) => it.likes === 1)).toBe(true);
		expect(result.map((it) => it.id)).toEqual(replies.slice(100).map((it) => it.id));
		// 130 items / 25 per page = 6 pages, all walked
		expect(repliesEp.calls).toHaveLength(6);
	});

	test('stops once `limit` matching items are collected', async () => {
		// Alternate: even indices above threshold, odd ones below.
		const replies = makeItems(200, 'r', (i) => (i % 2 === 0 ? 10 : 0));
		const { fetchReplies, repliesEp, fetchMediaLikes } = await loadServiceWith({ replies });

		const result = await fetchReplies('tok', 10, noopLogger, { type: 'replies', minLikes: 5 });

		expect(result).toHaveLength(10);
		expect(result.every((it) => it.likes === 0)).toBe(true);
		// 10 matches need 20 items → one full page of 25 is enough
		expect(repliesEp.calls).toHaveLength(1);
		expect(repliesEp.calls[0].limit).toBe(25);
		// Stops checking likes after the 10th match (20 items inspected)
		expect(fetchMediaLikes).toHaveBeenCalledTimes(20);
	});

	test('returns an empty list when nothing is below the threshold', async () => {
		const replies = makeItems(60, 'r', () => 99);
		const { fetchReplies } = await loadServiceWith({ replies });

		const result = await fetchReplies('tok', 100, noopLogger, { type: 'replies', minLikes: 5 });

		expect(result).toEqual([]);
	});

	test('applies the filter to both endpoints for type "all"', async () => {
		const replies = makeItems(40, 'r', (i) => (i < 30 ? 50 : 0));
		const threads = makeItems(40, 't', (i) => (i < 30 ? 50 : 0));
		const { fetchReplies } = await loadServiceWith({ replies, threads });

		const result = await fetchReplies('tok', 100, noopLogger, { type: 'all', minLikes: 5 });

		expect(result).toHaveLength(20);
		expect(result.every((it) => it.likes === 0)).toBe(true);
		// Newest first
		const ts = result.map((it) => new Date(it.timestamp).getTime());
		expect(ts).toEqual([...ts].sort((a, b) => b - a));
	});
});

describe('fetchReplies without minLikes', () => {
	test('requests only as many items as still needed', async () => {
		const replies = makeItems(100, 'r', () => 0);
		const { fetchReplies, repliesEp, fetchMediaLikes } = await loadServiceWith({ replies });

		const result = await fetchReplies('tok', 30, noopLogger, { type: 'replies' });

		expect(result).toHaveLength(30);
		expect(repliesEp.calls.map((c) => c.limit)).toEqual([25, 5]);
		expect(fetchMediaLikes).not.toHaveBeenCalled();
		expect(result[0].likes).toBeUndefined();
	});
});
