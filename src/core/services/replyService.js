import { fetchUserReplies, fetchUserThreads, fetchMediaLikes } from '../../infrastructure/threads/threadsClient.js';
import { PAGE_SIZE, MAX_PAGES_PER_FETCH } from '../../config/config.js';

/**
 * Service responsible for fetching the authenticated user's
 * content (posts, replies, or both) from the Threads API.
 *
 * Routes to the correct API endpoint based on the `type` option:
 *   - "replies" → GET /me/replies  (only replies)
 *   - "posts"   → GET /me/threads  (only top-level posts)
 *   - "all"     → both endpoints merged, newest first
 */

/** Valid type values */
export const VALID_TYPES = ['replies', 'posts', 'all'];

/**
 * Fetch up to `limit` items from the authenticated user's profile.
 *
 * When `minLikes` is set, the like filter is applied *while* paginating:
 * items at or above the threshold are skipped and further pages are
 * fetched until `limit` matching items are collected (or no pages remain).
 * Filtering only the first `limit` items after the fact would return
 * nothing at all when every recent item is above the threshold.
 *
 * @param {string}  token
 * @param {number}  limit    – maximum number of items to return (1–100)
 * @param {object}  logger
 * @param {object}  [opts]
 * @param {'replies'|'posts'|'all'} [opts.type='replies']
 * @param {number}  [opts.minLikes] – if set, only include items below this like count
 * @returns {Promise<object[]>}
 */
export async function fetchReplies(token, limit, logger, { type = 'replies', minLikes } = {}) {
	const items = [];
	const enrichWithLikes = minLikes !== undefined && minLikes !== null;

	logger.info({
		action: 'fetch_start',
		type,
		requestedLimit: limit,
		minLikes: minLikes ?? 'disabled',
	});

	// Optional like-count filter, evaluated per item during pagination
	const stats = { scanned: 0, filteredOut: 0 };
	const filter = enrichWithLikes ? createLikeFilter(token, minLikes, logger, stats) : undefined;

	if (type === 'all') {
		const [repliesArr, postsArr] = await Promise.all([
			fetchPaginated(fetchUserReplies, token, limit, logger, filter),
			fetchPaginated(fetchUserThreads, token, limit, logger, filter),
		]);
		const merged = [...repliesArr, ...postsArr]
			.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
			.slice(0, limit);
		items.push(...merged);
	} else {
		const fetcher = type === 'posts' ? fetchUserThreads : fetchUserReplies;
		const fetched = await fetchPaginated(fetcher, token, limit, logger, filter);
		items.push(...fetched);
	}

	if (enrichWithLikes) {
		logger.info({
			action: 'fetch_complete',
			type,
			found: items.length,
			scanned: stats.scanned,
			filteredOut: stats.filteredOut,
		});
		return items;
	}

	logger.info({ action: 'fetch_complete', type, found: items.length });
	return items;
}

// ─── Internal pagination helper ──────────────────────────────

/**
 * Build an async predicate that enriches an item with its like count
 * and rejects it when it reaches `minLikes`.
 */
function createLikeFilter(token, minLikes, logger, stats) {
	return async (item) => {
		stats.scanned++;
		try {
			item.likes = await fetchMediaLikes(item.id, token, logger);
		} catch (err) {
			logger.debug({ action: 'insights_error', replyId: item.id, error: err.message });
			item.likes = 0;
		}

		if (item.likes >= minLikes) {
			stats.filteredOut++;
			logger.debug({
				action: 'skip_above_threshold',
				replyId: item.id,
				likes: item.likes,
				minLikes,
			});
			return false;
		}
		return true;
	};
}

/**
 * Generic paginated fetch — walks cursor pages until `limit` items
 * are collected or no more pages remain.
 *
 * @param {(item: object) => Promise<boolean>} [filter] – optional async
 *   predicate; items it rejects are not counted towards `limit`, so
 *   pagination continues past them.
 */
async function fetchPaginated(fetchFn, token, limit, logger, filter) {
	const results = [];
	let cursor = undefined;
	let pagesScanned = 0;

	while (results.length < limit && pagesScanned < MAX_PAGES_PER_FETCH) {
		// With a filter active most items on a page may be rejected,
		// so always request full pages instead of just the remainder.
		const pageLimit = filter ? PAGE_SIZE : Math.min(PAGE_SIZE, limit - results.length);
		const page = await fetchFn(token, logger, {
			limit: pageLimit,
			after: cursor,
		});

		const data = page?.data;
		if (!data || data.length === 0) break;

		for (const item of data) {
			if (filter && !(await filter(item))) continue;

			results.push(item);
			logger.debug({
				action: 'item_found',
				id: item.id,
				text: truncate(item.text, 60),
				timestamp: item.timestamp,
				isReply: item.is_reply,
			});
			if (results.length >= limit) break;
		}

		pagesScanned++;

		logger.debug({
			action: 'page_scanned',
			page: pagesScanned,
			itemsOnPage: data.length,
			totalSoFar: results.length,
		});

		cursor = page?.paging?.cursors?.after;
		if (!cursor) break;
	}

	if (results.length < limit && pagesScanned >= MAX_PAGES_PER_FETCH) {
		logger.warn({
			action: 'page_limit_reached',
			pagesScanned,
			found: results.length,
			requestedLimit: limit,
			message: `Stopped after ${pagesScanned} pages; more items may exist further back.`,
		});
	}

	return results;
}

// ─── Helpers ─────────────────────────────────────────────────

function truncate(str, max) {
	if (!str) return '';
	return str.length > max ? str.slice(0, max) + '…' : str;
}
