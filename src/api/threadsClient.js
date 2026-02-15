import { API_BASE_URL, THREAD_FIELDS } from '../config.js';
import { withBackoff } from '../utils/backoff.js';

/**
 * Low-level HTTP client for the Threads Graph API.
 *
 * Every method uses native `fetch` (Node ≥ 18) and returns
 * parsed JSON.  Token is injected per-request; the client
 * itself holds no mutable state.
 */

/**
 * Build a full API URL with query parameters.
 *
 * @param {string} path  – e.g. "/me/threads"
 * @param {object} params – key/value pairs for the query string
 * @returns {string}
 */
function buildUrl(path, params = {}) {
	const url = new URL(path, API_BASE_URL);
	for (const [k, v] of Object.entries(params)) {
		if (v !== undefined && v !== null) {
			url.searchParams.set(k, String(v));
		}
	}
	return url.toString();
}

/**
 * Generic request wrapper with JSON parsing and error mapping.
 *
 * @param {string} url
 * @param {object} opts     – fetch options (method, etc.)
 * @param {object} logger
 * @returns {Promise<object>}
 */
async function request(url, opts, logger) {
	const res = await fetch(url, opts);
	const body = await res.text();

	let json;
	try {
		json = JSON.parse(body);
	} catch {
		json = null;
	}

	if (!res.ok) {
		const err = new Error(json?.error?.message || `HTTP ${res.status}: ${body.slice(0, 200)}`);
		err.status = res.status;
		err.body = json;
		throw err;
	}

	logger?.debug({
		action: 'api_response',
		status: res.status,
		items: Array.isArray(json?.data) ? json.data.length : undefined,
	});
	return json;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Validate the access token by fetching the authenticated user's ID.
 *
 * @param {string} token
 * @param {object} logger
 * @returns {Promise<{id: string, username: string}>}
 */
export async function validateAccessToken(token, logger) {
	const url = buildUrl('/me', {
		fields: 'id,username',
		access_token: token,
	});

	return withBackoff(() => request(url, { method: 'GET' }, logger), logger);
}

/**
 * Fetch a single page of the authenticated user's top-level posts.
 *
 * Uses GET /me/threads which returns ONLY top-level posts (not replies).
 *
 * @param {string}  token
 * @param {object}  logger
 * @param {object}  [opts]
 * @param {number}  [opts.limit]  – items per page (max 100)
 * @param {string}  [opts.after]  – pagination cursor
 * @returns {Promise<{data: object[], paging?: {cursors?: {after: string}}}>}
 */
export async function fetchUserThreads(token, logger, { limit = 25, after } = {}) {
	const url = buildUrl('/me/threads', {
		fields: THREAD_FIELDS,
		limit,
		after,
		access_token: token,
	});

	return withBackoff(() => request(url, { method: 'GET' }, logger), logger);
}

/**
 * Fetch a single page of the authenticated user's replies.
 *
 * Uses the dedicated GET /me/replies endpoint which returns
 * ONLY replies (not top-level posts).
 *
 * @param {string}  token
 * @param {object}  logger
 * @param {object}  [opts]
 * @param {number}  [opts.limit]  – items per page (max 100)
 * @param {string}  [opts.after]  – pagination cursor
 * @returns {Promise<{data: object[], paging?: {cursors?: {after: string}}}>}
 */
export async function fetchUserReplies(token, logger, { limit = 25, after } = {}) {
	const url = buildUrl('/me/replies', {
		fields: THREAD_FIELDS,
		limit,
		after,
		access_token: token,
	});

	return withBackoff(() => request(url, { method: 'GET' }, logger), logger);
}

/**
 * Delete a single Threads media object by its ID.
 *
 * @param {string} mediaId
 * @param {string} token
 * @param {object} logger
 * @returns {Promise<{success: boolean, deleted_id: string}>}
 */
export async function deleteThread(mediaId, token, logger) {
	const url = buildUrl(`/${mediaId}`, { access_token: token });

	return withBackoff(() => request(url, { method: 'DELETE' }, logger), logger);
}

/**
 * Fetch insights (like count) for a single Threads media object.
 *
 * @param {string} mediaId
 * @param {string} token
 * @param {object} logger
 * @returns {Promise<number>} like count
 */
export async function fetchMediaLikes(mediaId, token, logger) {
	const url = buildUrl(`/${mediaId}/insights`, {
		metric: 'likes',
		access_token: token,
	});

	const json = await withBackoff(() => request(url, { method: 'GET' }, logger), logger);

	// Response shape: { data: [{ name: "likes", values: [{ value: N }] }] }
	const likesMetric = json?.data?.find((m) => m.name === 'likes');
	return likesMetric?.values?.[0]?.value ?? 0;
}
