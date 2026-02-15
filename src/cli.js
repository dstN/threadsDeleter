#!/usr/bin/env node

/**
 * Threads Deleter CLI
 *
 * Production-grade command-line tool that deletes posts, replies,
 * or both from the authenticated user's Threads profile via the
 * official Threads API.
 *
 * Usage:
 *   node src/cli.js [--token <TOKEN>] [--type replies] [--limit 100] [--dry-run] [--yes]
 *
 * The token can also be provided via THREADS_ACCESS_TOKEN in .env
 */

import 'dotenv/config';
import { createRequire } from 'node:module';
import { createInterface } from 'node:readline';
import { Command } from 'commander';

import { DEFAULT_LIMIT, MAX_LIMIT } from './config.js';
import { createLogger } from './logger.js';
import { validateToken, validateLimit } from './utils/validators.js';
import { validateAccessToken } from './api/threadsClient.js';
import { fetchReplies, VALID_TYPES } from './services/replyService.js';
import { deleteReplies } from './services/deleteService.js';
import { createRateLimiter } from './services/rateLimiter.js';

// ─── Constants ───────────────────────────────────────────────
const LOOP_INTERVAL_MS = 1441 * 60 * 1000; // 24 hours + 1 minute

// ─── Read package.json version ───────────────────────────────
const require = createRequire(import.meta.url);
const { version, description } = require('../package.json');

// ─── CLI definition ──────────────────────────────────────────
const program = new Command();

program.name('threads-deleter').description(description).version(version).option('--token <string>', 'Threads API access token (or set THREADS_ACCESS_TOKEN in .env)').option('--type <type>', 'What to delete: posts, replies, or all (default: replies)', 'replies').option('--limit <number>', `Max items to delete per run (1–${MAX_LIMIT})`, String(DEFAULT_LIMIT)).option('--min-likes <number>', 'Only delete items with fewer likes than this threshold').option('--loop', 'Keep running every ~24h until nothing is left to delete', false).option('--dry-run', 'Preview deletions without actually deleting', false).option('--verbose', 'Enable verbose (debug-level) logging', false).option('--log-level <level>', 'Log level: info | debug | warn | error', 'info').option('--output <file>', 'Write structured log to a file').option('--yes', 'Skip confirmation prompt', false).action(run);

program.parseAsync(process.argv).catch((err) => {
	console.error(`\n✖ Fatal: ${err.message}\n`);
	process.exit(1);
});

// ─── Main workflow ───────────────────────────────────────────
async function run(opts) {
	// Resolve token: CLI flag takes priority, then .env
	const token = opts.token || process.env.THREADS_ACCESS_TOKEN;
	const { verbose, logLevel, output, yes: skipConfirmation } = opts;
	const dryRun = opts.dryRun;
	const loop = opts.loop;

	// 1. Initialize logger (before anything else so errors are captured)
	const logger = createLogger({
		logLevel,
		verbose,
		output,
		token,
	});

	try {
		// 2. Validate inputs
		validateToken(token);
		const limit = validateLimit(opts.limit);

		// 3. Validate --type
		const type = opts.type;
		if (!VALID_TYPES.includes(type)) {
			throw new Error(`--type must be one of: ${VALID_TYPES.join(', ')}. Received: ${type}`);
		}

		// 4. Parse optional min-likes threshold
		const minLikes = opts.minLikes !== undefined ? Number(opts.minLikes) : undefined;
		if (minLikes !== undefined && (!Number.isInteger(minLikes) || minLikes < 0)) {
			throw new Error(`--min-likes must be a non-negative integer. Received: ${opts.minLikes}`);
		}

		// 5. Validate access token against the API
		logger.info({ action: 'token_validation', status: 'pending' });
		const user = await validateAccessToken(token, logger);
		logger.info({
			action: 'token_validation',
			status: 'success',
			userId: user.id,
			username: user.username,
		});

		// 6. Run deletion (once or in a loop)
		if (loop) {
			logger.info({
				action: 'loop_mode',
				message: `Loop mode enabled. Will repeat every ${Math.round(LOOP_INTERVAL_MS / 60000)} minutes (~24h 1m) until nothing is left.`,
			});

			// First run always requires confirmation (unless --yes)
			if (!dryRun && !skipConfirmation) {
				const confirmed = await confirm(`\n⚠  Loop mode will keep deleting ${type} (up to ${limit}/day) until your profile is empty. Continue? (y/N) `);
				if (!confirmed) {
					logger.info({ action: 'aborted', message: 'User cancelled the operation.' });
					return;
				}
			}

			let iteration = 0;
			while (true) {
				iteration++;
				logger.info({ action: 'loop_iteration', iteration, timestamp: new Date().toISOString() });

				const deletedCount = await runOnce(token, limit, type, minLikes, dryRun, logger);

				if (deletedCount === 0) {
					logger.info({
						action: 'loop_complete',
						iteration,
						message: `No more ${type === 'all' ? 'items' : type} to delete. Exiting loop.`,
					});
					break;
				}

				const nextRunDate = new Date(Date.now() + LOOP_INTERVAL_MS);
				logger.info({
					action: 'loop_waiting',
					iteration,
					deleted: deletedCount,
					nextRunAt: nextRunDate.toISOString(),
					message: `Waiting ${Math.round(LOOP_INTERVAL_MS / 60000)} minutes until next run…`,
				});

				await sleep(LOOP_INTERVAL_MS);
			}
		} else {
			// Single run with its own confirmation
			const deletedCount = await runOnce(token, limit, type, minLikes, dryRun, logger, skipConfirmation);

			if (deletedCount === null) {
				// User cancelled
				return;
			}
		}
	} catch (err) {
		logger.error({
			action: 'fatal_error',
			error: err.message,
			code: err.code || undefined,
		});
		process.exit(1);
	}
}

// ─── Single deletion run ─────────────────────────────────────

/**
 * Execute one deletion pass: fetch → confirm → delete → summarize.
 *
 * @returns {Promise<number|null>} number of items deleted, or null if user cancelled
 */
async function runOnce(token, limit, type, minLikes, dryRun, logger, askConfirmation = false) {
	const label = type === 'all' ? 'items' : type;

	// Fetch items
	const replies = await fetchReplies(token, limit, logger, { type, minLikes });
	logger.count('fetched', replies.length);

	if (replies.length === 0) {
		logger.info({ action: 'complete', message: `No ${label} found. Nothing to delete.` });
		return 0;
	}

	// Preview
	logger.info({
		action: 'preview',
		found: replies.length,
		dryRun,
		message: dryRun ? `DRY-RUN mode — no ${label} will be deleted.` : `About to permanently delete ${replies.length} ${label}.`,
	});

	// Confirmation prompt (single-run only, loop confirms upfront)
	if (!dryRun && askConfirmation) {
		const confirmed = await confirm(`\n⚠  You are about to permanently delete ${replies.length} ${label}. Continue? (y/N) `);
		if (!confirmed) {
			logger.info({ action: 'aborted', message: 'User cancelled the operation.' });
			return null;
		}
	}

	// Delete
	const rateLimiter = createRateLimiter(logger);
	const result = await deleteReplies(replies, token, rateLimiter, logger, { dryRun });

	// Summary
	logger.info({
		action: 'result',
		deleted: result.deleted.length,
		skipped: result.skipped.length,
		failed: result.failed.length,
		rateLimitRemaining: rateLimiter.remaining,
	});

	logger.summary();

	if (result.failed.length > 0) {
		process.exit(1);
	}

	return result.deleted.length;
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Interactive yes/no confirmation prompt.
 * Resolves `true` only on "y" or "yes".
 */
function confirm(question) {
	return new Promise((resolve) => {
		const rl = createInterface({ input: process.stdin, output: process.stdout });
		rl.question(question, (answer) => {
			rl.close();
			resolve(/^y(es)?$/i.test(answer.trim()));
		});
	});
}

/**
 * Promise-based sleep.
 */
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
