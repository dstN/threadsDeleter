import { DeletionReport } from '../../src/core/domain/deletionReport.js';

describe('DeletionReport', () => {
	test('computes totals correctly', () => {
		const report = new DeletionReport({
			deleted: ['1', '2', '3'],
			skipped: ['4'],
			failed: [{ id: '5', error: 'fail' }],
		});

		expect(report.total).toBe(5);
		expect(report.deleted.length).toBe(3);
		expect(report.skipped.length).toBe(1);
		expect(report.failed.length).toBe(1);
	});

	test('success is true when no failures', () => {
		const report = new DeletionReport({
			deleted: ['1'],
			skipped: [],
			failed: [],
		});

		expect(report.success).toBe(true);
	});

	test('success is false when there are failures', () => {
		const report = new DeletionReport({
			deleted: [],
			skipped: [],
			failed: [{ id: '1', error: 'err' }],
		});

		expect(report.success).toBe(false);
	});

	test('toJSON returns serializable object', () => {
		const report = new DeletionReport({
			deleted: ['1', '2'],
			skipped: ['3'],
			failed: [],
			meta: { type: 'replies', dryRun: true },
		});

		const json = report.toJSON();
		expect(json.deleted).toBe(2);
		expect(json.skipped).toBe(1);
		expect(json.failed).toBe(0);
		expect(json.total).toBe(3);
		expect(json.success).toBe(true);
		expect(json.meta.dryRun).toBe(true);
	});

	test('arrays are frozen (immutable)', () => {
		const report = new DeletionReport({ deleted: ['1'] });
		expect(() => report.deleted.push('2')).toThrow();
	});

	test('defaults to empty arrays', () => {
		const report = new DeletionReport();
		expect(report.total).toBe(0);
		expect(report.success).toBe(true);
	});
});
