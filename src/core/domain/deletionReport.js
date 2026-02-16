/**
 * Domain object representing the result of a deletion batch.
 *
 * Provides a structured, immutable summary of what happened
 * during a deletion run — useful for both CLI output and
 * web response rendering.
 */
export class DeletionReport {
	/**
	 * @param {object} data
	 * @param {string[]}   data.deleted  – IDs successfully deleted
	 * @param {string[]}   data.skipped  – IDs skipped (rate limit, duplicate)
	 * @param {{id: string, error: string}[]} data.failed – IDs that failed with errors
	 * @param {object}     [data.meta]   – additional metadata
	 */
	constructor({ deleted = [], skipped = [], failed = [], meta = {} } = {}) {
		this.deleted = Object.freeze([...deleted]);
		this.skipped = Object.freeze([...skipped]);
		this.failed = Object.freeze([...failed]);
		this.meta = Object.freeze({ ...meta });
		this.timestamp = new Date().toISOString();
	}

	/** Total items processed */
	get total() {
		return this.deleted.length + this.skipped.length + this.failed.length;
	}

	/** Whether the run completed with zero failures */
	get success() {
		return this.failed.length === 0;
	}

	/** Plain object for JSON serialization */
	toJSON() {
		return {
			timestamp: this.timestamp,
			deleted: this.deleted.length,
			skipped: this.skipped.length,
			failed: this.failed.length,
			total: this.total,
			success: this.success,
			meta: this.meta,
		};
	}
}
