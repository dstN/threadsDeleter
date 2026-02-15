/**
 * Centralized configuration for the Threads Deleter CLI.
 *
 * All tunables (API base URL, rate limits, backoff parameters, defaults)
 * live here so they can be adjusted without touching business logic.
 */

/** Threads Graph API base URL (v1.0) */
export const API_BASE_URL = 'https://graph.threads.net/v1.0';

/** API version tag (for logging / diagnostics) */
export const API_VERSION = 'v1.0';

/** Hard daily deletion cap enforced by the Threads API */
export const MAX_DELETIONS_PER_DAY = 100;

/** Default number of replies to delete when --limit is omitted */
export const DEFAULT_LIMIT = 100;

/** Absolute ceiling the CLI will accept for --limit */
export const MAX_LIMIT = 100;

/** Number of items to request per page when fetching user threads */
export const PAGE_SIZE = 25;

/** Exponential-backoff settings for retryable errors (e.g. 429) */
export const BACKOFF = {
	/** Initial delay in milliseconds */
	initialDelayMs: 1_000,
	/** Multiplier applied after each retry */
	factor: 2,
	/** Maximum number of retry attempts */
	maxRetries: 5,
	/** Upper bound on any single delay (ms) */
	maxDelayMs: 60_000,
};

/**
 * Fields requested when listing the authenticated user's threads.
 * `is_reply` lets us filter out top-level posts client-side.
 */
export const THREAD_FIELDS = ['id', 'text', 'timestamp', 'media_type', 'is_reply', 'replied_to', 'root_post'].join(',');
