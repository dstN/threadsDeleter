/**
 * Centralized configuration for Threads Deleter.
 *
 * All tunables (API, rate limits, backoff, OAuth, web server)
 * live here so they can be adjusted without touching business logic.
 */

// ─── Threads API ─────────────────────────────────────────────
export const API_BASE_URL = 'https://graph.threads.net/v1.0';
export const API_VERSION = 'v1.0';

// ─── Deletion limits ────────────────────────────────────────
export const MAX_DELETIONS_PER_DAY = 100;
export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 100;
export const PAGE_SIZE = 25;

// ─── Backoff ─────────────────────────────────────────────────
export const BACKOFF = {
	initialDelayMs: 1_000,
	factor: 2,
	maxRetries: 5,
	maxDelayMs: 60_000,
};

// ─── Thread fields requested from the API ───────────────────
export const THREAD_FIELDS = ['id', 'text', 'timestamp', 'media_type', 'is_reply', 'replied_to', 'root_post'].join(',');

// ─── Loop mode ───────────────────────────────────────────────
export const LOOP_INTERVAL_MS = 1441 * 60 * 1000; // 24h + 1m

// ─── OAuth 2.0 ───────────────────────────────────────────────
export const OAUTH = {
	clientId: process.env.THREADS_CLIENT_ID || process.env.THREADS_APP_ID || process.env.META_APP_ID || '',
	clientSecret:
		process.env.THREADS_CLIENT_SECRET || process.env.THREADS_APP_SECRET || process.env.META_APP_SECRET || '',
	redirectUri: process.env.THREADS_REDIRECT_URI || 'http://localhost:3000/auth/callback',
	authorizationUrl: 'https://threads.net/oauth/authorize',
	tokenUrl: 'https://graph.threads.net/oauth/access_token',
	scopes: ['threads_basic', 'threads_read_replies', 'threads_content_publish', 'threads_manage_insights'],
};

// ─── Web server ──────────────────────────────────────────────
export const WEB = {
	port: parseInt(process.env.PORT || '3000', 10),
	sessionSecret: process.env.SESSION_SECRET || 'threads-deleter-dev-secret',
};
