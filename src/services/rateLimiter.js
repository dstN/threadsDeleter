import { MAX_DELETIONS_PER_DAY } from '../config.js';

/**
 * In-memory rate-limiter that enforces the Threads API daily
 * deletion cap (100 deletions / account / day).
 *
 * This is a **local** safeguard — the API itself also enforces
 * the limit, but failing locally is cheaper and more informative.
 *
 * Instances are intentionally short-lived (one per CLI invocation)
 * so there is no persistence concern.
 */

/**
 * Create a rate-limiter instance.
 *
 * @param {object}  logger
 * @param {number}  [max] – override the daily cap (useful for tests)
 * @returns {object}
 */
export function createRateLimiter(logger, max = MAX_DELETIONS_PER_DAY) {
	let count = 0;

	return {
		/**
		 * Check whether performing one more deletion is allowed.
		 * @returns {boolean}
		 */
		canProceed() {
			return count < max;
		},

		/**
		 * Record that a deletion was performed.
		 * Throws if the limit has already been reached.
		 */
		record() {
			if (count >= max) {
				const err = new Error(`Daily deletion limit reached (${max}). Try again tomorrow.`);
				err.code = 'RATE_LIMIT_EXCEEDED';
				logger.warn({
					action: 'rate_limit_exceeded',
					deletionsToday: count,
					max,
				});
				throw err;
			}
			count++;
		},

		/** Current count of recorded deletions */
		get used() {
			return count;
		},

		/** Remaining deletions allowed */
		get remaining() {
			return max - count;
		},
	};
}
