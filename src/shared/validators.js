import { MAX_LIMIT } from '../config/config.js';
import { ValidationError } from './errors.js';

/**
 * Validate that the access token is a non-empty string with
 * a plausible minimum length. This is a format check only —
 * actual authentication is verified by the API call.
 *
 * @param {string} token
 * @throws {ValidationError} if token is missing or obviously malformed
 */
export function validateToken(token) {
	if (!token || typeof token !== 'string' || token.trim().length < 10) {
		throw new ValidationError('A valid Threads access token is required. Pass it via --token <value> or set THREADS_ACCESS_TOKEN in .env.');
	}
}

/**
 * Validate and coerce the --limit value into a safe integer
 * between 1 and MAX_LIMIT (inclusive).
 *
 * @param {*} raw – the raw CLI argument (string or number)
 * @returns {number} validated limit
 * @throws {ValidationError} if the value is out of range or non-numeric
 */
export function validateLimit(raw) {
	const n = Number(raw);

	if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) {
		throw new ValidationError(`--limit must be an integer between 1 and ${MAX_LIMIT}. Received: ${raw}`);
	}

	return n;
}
