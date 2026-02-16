import { API_BASE_URL, THREAD_FIELDS } from '../../config/config.js';
import { withBackoff } from '../../shared/backoff.js';
import { ApiError } from '../../shared/errors.js';

/**
 * Low-level HTTP client for the Threads Graph API.
 *
 * Every method uses native `fetch` (Node ≥ 18) and returns
 * parsed JSON. Token is injected per-request; the client
 * itself holds no mutable state.
 */

/**
 * Build a full API URL with query parameters.
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
		const err = new ApiError(json?.error?.message || `HTTP ${res.status}: ${body.slice(0, 200)}`, res.status);
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
 * Uses GET /me/threads.
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
 * Uses GET /me/replies.
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
 */
export async function deleteThread(mediaId, token, logger) {
	const url = buildUrl(`/${mediaId}`, { access_token: token });

	return withBackoff(() => request(url, { method: 'DELETE' }, logger), logger);
}

/**
 * Fetch insights (like count) for a single Threads media object.
 *
 * @returns {Promise<number>} like count
 */
export async function fetchMediaLikes(mediaId, token, logger) {
	const url = buildUrl(`/${mediaId}/insights`, {
		metric: 'likes',
		access_token: token,
	});

	const json = await withBackoff(() => request(url, { method: 'GET' }, logger), logger);

	const likesMetric = json?.data?.find((m) => m.name === 'likes');
	return likesMetric?.values?.[0]?.value ?? 0;
}
