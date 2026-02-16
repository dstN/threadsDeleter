import { fetchUserReplies, fetchUserThreads, fetchMediaLikes } from '../../infrastructure/threads/threadsClient.js';
import { PAGE_SIZE } from '../../config/config.js';

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

	if (type === 'all') {
		const [repliesArr, postsArr] = await Promise.all([fetchPaginated(fetchUserReplies, token, limit, logger), fetchPaginated(fetchUserThreads, token, limit, logger)]);
		const merged = [...repliesArr, ...postsArr].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
		items.push(...merged);
	} else {
		const fetcher = type === 'posts' ? fetchUserThreads : fetchUserReplies;
		const fetched = await fetchPaginated(fetcher, token, limit, logger);
		items.push(...fetched);
	}

	// Optional like-count filtering
	if (enrichWithLikes) {
		const filtered = [];
		for (const item of items) {
			try {
				item.likes = await fetchMediaLikes(item.id, token, logger);
			} catch (err) {
				logger.debug({ action: 'insights_error', replyId: item.id, error: err.message });
				item.likes = 0;
			}

			if (item.likes >= minLikes) {
				logger.debug({
					action: 'skip_above_threshold',
					replyId: item.id,
					likes: item.likes,
					minLikes,
				});
				continue;
			}
			filtered.push(item);
		}

		logger.info({
			action: 'fetch_complete',
			type,
			found: filtered.length,
			filteredOut: items.length - filtered.length,
		});
		return filtered;
	}

	logger.info({ action: 'fetch_complete', type, found: items.length });
	return items;
}

// ─── Internal pagination helper ──────────────────────────────

/**
 * Generic paginated fetch — walks cursor pages until `limit` items
 * are collected or no more pages remain.
 */
async function fetchPaginated(fetchFn, token, limit, logger) {
	const results = [];
	let cursor = undefined;
	let pagesScanned = 0;
	const MAX_PAGES = 20;

	while (results.length < limit && pagesScanned < MAX_PAGES) {
		const page = await fetchFn(token, logger, {
			limit: Math.min(PAGE_SIZE, limit - results.length),
			after: cursor,
		});

		const data = page?.data;
		if (!data || data.length === 0) break;

		for (const item of data) {
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

	return results;
}

// ─── Helpers ─────────────────────────────────────────────────

function truncate(str, max) {
	if (!str) return '';
	return str.length > max ? str.slice(0, max) + '…' : str;
}
