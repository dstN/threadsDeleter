import { BACKOFF } from '../config/config.js';

/**
 * Execute an async function with exponential backoff + jitter.
 *
 * Only retries when the error is deemed **retryable** (HTTP 429,
 * network errors, 5xx). All other errors are thrown immediately.
 *
 * @param {Function} fn        – async function to execute
 * @param {object}   [logger]  – optional logger instance
 * @param {object}   [opts]    – override default backoff settings
 * @returns {Promise<*>} result of fn()
 */
export async function withBackoff(fn, logger, opts = {}) {
	const { initialDelayMs = BACKOFF.initialDelayMs, factor = BACKOFF.factor, maxRetries = BACKOFF.maxRetries, maxDelayMs = BACKOFF.maxDelayMs } = opts;

	let attempt = 0;
	let delay = initialDelayMs;

	while (true) {
		try {
			return await fn();
		} catch (err) {
			attempt++;

			if (!isRetryable(err) || attempt > maxRetries) {
				throw err;
			}

			// Add jitter: ±25 % of the computed delay
			const jitter = delay * (0.75 + Math.random() * 0.5);
			const wait = Math.min(jitter, maxDelayMs);

			logger?.debug({
				action: 'backoff_retry',
				attempt,
				waitMs: Math.round(wait),
				error: err.message,
			});

			await sleep(wait);
			delay *= factor;
		}
	}
}

/**
 * Determine whether an error is worth retrying.
 *
 * @param {Error} err
 * @returns {boolean}
 */
function isRetryable(err) {
	if (err.status === 429) return true;
	if (err.status >= 500 && err.status < 600) return true;
	if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') return true;
	if (err.name === 'TypeError' && /fetch/i.test(err.message)) return true;
	return false;
}

/**
 * Promise-based sleep helper.
 * @param {number} ms
 */
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
