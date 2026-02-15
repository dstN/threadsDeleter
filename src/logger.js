import { writeFileSync, appendFileSync, existsSync } from 'node:fs';

/**
 * Structured logger with level filtering, optional file output,
 * and built-in token masking to prevent credential leakage.
 *
 * Every log entry is a JSON object:
 *   { timestamp, level, action, replyId?, status?, error?, ...extra }
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

/**
 * Create a configured logger instance.
 *
 * @param {object} opts
 * @param {'info'|'debug'|'warn'|'error'} opts.logLevel
 * @param {boolean}  opts.verbose   – when true, forces debug level
 * @param {string}   [opts.output]  – optional path to a log file
 * @param {string}   [opts.token]   – access token to mask in output
 * @returns {object} logger with error/warn/info/debug methods + summary()
 */
export function createLogger({ logLevel = 'info', verbose = false, output, token }) {
	const effectiveLevel = verbose ? 'debug' : logLevel;
	const threshold = LEVELS[effectiveLevel] ?? LEVELS.info;

	// Prepare file output (truncate on first run)
	if (output) {
		writeFileSync(output, '', 'utf-8');
	}

	/**
	 * Mask the access token so it never appears in logs.
	 * Shows only the first 4 and last 4 characters.
	 */
	function mask(str) {
		if (!token || typeof str !== 'string') return str;
		return str.replaceAll(token, `${token.slice(0, 4)}…${token.slice(-4)}`);
	}

	/**
	 * Core emit function.
	 * @param {'error'|'warn'|'info'|'debug'} level
	 * @param {object} entry – structured log fields
	 */
	function emit(level, entry) {
		if (LEVELS[level] > threshold) return;

		const record = {
			timestamp: new Date().toISOString(),
			level,
			...entry,
		};

		const line = mask(JSON.stringify(record));

		// Console output
		const writer = level === 'error' ? console.error : console.log;
		writer(line);

		// File output
		if (output) {
			appendFileSync(output, line + '\n', 'utf-8');
		}
	}

	/** Accumulated counters for the final summary */
	const stats = { fetched: 0, deleted: 0, skipped: 0, failed: 0 };

	return {
		error: (entry) => emit('error', entry),
		warn: (entry) => emit('warn', entry),
		info: (entry) => emit('info', entry),
		debug: (entry) => emit('debug', entry),

		/** Increment a named counter */
		count(key, n = 1) {
			if (key in stats) stats[key] += n;
		},

		/** Print a human-readable summary line */
		summary() {
			emit('info', {
				action: 'summary',
				...stats,
			});
		},

		/** Direct access to stats (for testing / inspection) */
		get stats() {
			return { ...stats };
		},
	};
}
