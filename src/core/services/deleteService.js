import { deleteThread } from '../../infrastructure/threads/threadsClient.js';

/**
 * Service responsible for deleting a batch of replies while
 * respecting the rate limiter and providing idempotent, fail-safe
 * behavior.
 *
 * Design principles:
 *   – Deletions are sequential (no parallel deletes) to make
 *     behavior predictable and debuggable.
 *   – Each deletion is recorded before the API call so partial
 *     failures are visible.
 *   – Dry-run mode logs what *would* happen without touching the API.
 *   – If any deletion fails, the process stops immediately
 *     (fail-safe: no silent partial deletions).
 */

/**
 * Delete an array of reply objects.
 *
 * @param {object[]}  replies     – array with at least { id } per item
 * @param {string}    token       – Threads access token
 * @param {object}    rateLimiter – from createRateLimiter()
 * @param {object}    logger
 * @param {object}    [opts]
 * @param {boolean}   [opts.dryRun=false]
 * @returns {Promise<{deleted: string[], skipped: string[], failed: {id: string, error: string}[]}>}
 */
export async function deleteReplies(replies, token, rateLimiter, logger, { dryRun = false } = {}) {
	const deleted = [];
	const skipped = [];
	const failed = [];

	/** Track IDs we've already handled (idempotency within a run) */
	const seen = new Set();

	for (const reply of replies) {
		const { id } = reply;

		// ── Idempotency guard ────────────────────────────────────
		if (seen.has(id)) {
			logger.debug({ action: 'skip_duplicate', replyId: id });
			skipped.push(id);
			logger.count('skipped');
			continue;
		}
		seen.add(id);

		// ── Rate-limit guard ─────────────────────────────────────
		if (!rateLimiter.canProceed()) {
			logger.warn({
				action: 'rate_limit_stop',
				replyId: id,
				message: 'Daily deletion cap reached. Stopping.',
			});
			skipped.push(id);
			logger.count('skipped');
			break;
		}

		// ── Dry-run mode ─────────────────────────────────────────
		if (dryRun) {
			logger.info({
				action: 'dry_run_delete',
				replyId: id,
				status: 'would_delete',
				text: reply.text?.slice(0, 80) || '',
			});
			deleted.push(id);
			logger.count('deleted');
			continue;
		}

		// ── Actual deletion ──────────────────────────────────────
		try {
			logger.info({ action: 'deleting', replyId: id });

			const result = await deleteThread(id, token, logger);

			if (result?.success) {
				rateLimiter.record();
				deleted.push(id);
				logger.count('deleted');
				logger.info({ action: 'deleted', replyId: id, status: 'success' });
			} else {
				throw new Error(`Unexpected response: ${JSON.stringify(result)}`);
			}
		} catch (err) {
			failed.push({ id, error: err.message });
			logger.count('failed');
			logger.error({
				action: 'delete_failed',
				replyId: id,
				status: 'error',
				error: err.message,
			});

			// Fail-safe: stop on first real error
			logger.error({
				action: 'abort',
				message: 'Stopping after first failure to prevent silent partial deletions.',
				deletedSoFar: deleted.length,
			});
			break;
		}
	}

	return { deleted, skipped, failed };
}
