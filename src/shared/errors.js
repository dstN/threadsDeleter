/**
 * Custom error classes for structured error handling.
 *
 * Each error class has a stable `code` property for programmatic
 * matching and a human-readable `message`.
 */

export class AppError extends Error {
	constructor(message, code = 'APP_ERROR', statusCode = 500) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.statusCode = statusCode;
	}
}

export class AuthenticationError extends AppError {
	constructor(message = 'Authentication failed.') {
		super(message, 'AUTH_ERROR', 401);
	}
}

export class ValidationError extends AppError {
	constructor(message = 'Validation failed.') {
		super(message, 'VALIDATION_ERROR', 400);
	}
}

export class RateLimitError extends AppError {
	constructor(message = 'Rate limit exceeded.') {
		super(message, 'RATE_LIMIT_ERROR', 429);
	}
}

export class ApiError extends AppError {
	constructor(message = 'API request failed.', statusCode = 502) {
		super(message, 'API_ERROR', statusCode);
	}
}
