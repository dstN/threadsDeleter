import { validateToken, validateLimit } from '../../src/shared/validators.js';

describe('validateToken', () => {
	test('throws for empty string', () => {
		expect(() => validateToken('')).toThrow('access token');
	});

	test('throws for short string', () => {
		expect(() => validateToken('abc')).toThrow('access token');
	});

	test('throws for null/undefined', () => {
		expect(() => validateToken(null)).toThrow('access token');
		expect(() => validateToken(undefined)).toThrow('access token');
	});

	test('accepts valid token', () => {
		expect(() => validateToken('a_valid_long_lived_token_12345')).not.toThrow();
	});
});

describe('validateLimit', () => {
	test('returns valid integer', () => {
		expect(validateLimit('50')).toBe(50);
		expect(validateLimit(1)).toBe(1);
		expect(validateLimit(100)).toBe(100);
	});

	test('throws for zero', () => {
		expect(() => validateLimit(0)).toThrow('--limit');
	});

	test('throws for values above max', () => {
		expect(() => validateLimit(101)).toThrow('--limit');
	});

	test('throws for non-numeric', () => {
		expect(() => validateLimit('abc')).toThrow('--limit');
	});

	test('throws for negative values', () => {
		expect(() => validateLimit(-1)).toThrow('--limit');
	});

	test('throws for decimals', () => {
		expect(() => validateLimit(3.5)).toThrow('--limit');
	});
});
