import { createRateLimiter } from '../../src/core/services/rateLimiter.js';

const noopLogger = {
	info: () => {},
	warn: () => {},
	error: () => {},
	debug: () => {},
	count: () => {},
};

describe('createRateLimiter', () => {
	test('allows deletions up to the limit', () => {
		const limiter = createRateLimiter(noopLogger, 3);

		expect(limiter.canProceed()).toBe(true);
		expect(limiter.remaining).toBe(3);

		limiter.record();
		limiter.record();
		limiter.record();

		expect(limiter.canProceed()).toBe(false);
		expect(limiter.used).toBe(3);
		expect(limiter.remaining).toBe(0);
	});

	test('throws RateLimitError when recording beyond limit', () => {
		const limiter = createRateLimiter(noopLogger, 1);
		limiter.record();

		expect(() => limiter.record()).toThrow('Daily deletion limit reached');
	});

	test('reports correct remaining count', () => {
		const limiter = createRateLimiter(noopLogger, 5);
		limiter.record();
		limiter.record();

		expect(limiter.used).toBe(2);
		expect(limiter.remaining).toBe(3);
	});
});
