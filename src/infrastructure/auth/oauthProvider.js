import { OAUTH } from '../../config/config.js';
import { AuthenticationError } from '../../shared/errors.js';

/**
 * OAuth 2.0 Authorization Code Flow provider for Threads API.
 *
 * Manages client credentials, authorization URL generation, and
 * in-memory access token storage. Designed to be extended with
 * persistent storage (database, Redis) in the future.
 *
 * AuthProvider interface:
 *   - getToken()         → string
 *   - isAuthenticated()  → boolean
 *   - getMode()          → 'token' | 'oauth'
 */
export class OAuthProvider {
	#accessToken = null;
	#userId = null;

	/**
	 * Generate the authorization URL to redirect the user to.
	 *
	 * @param {string} [state] – optional CSRF state parameter
	 * @returns {string}
	 */
	getAuthorizationUrl(state) {
		if (!OAUTH.clientId || !OAUTH.clientSecret) {
			throw new Error('Missing THREADS_CLIENT_ID or THREADS_CLIENT_SECRET in environment variables.');
		}

		const params = new URLSearchParams({
			client_id: OAUTH.clientId,
			redirect_uri: OAUTH.redirectUri,
			scope: OAUTH.scopes.join(','),
			response_type: 'code',
		});

		if (state) params.set('state', state);

		return `${OAUTH.authorizationUrl}?${params.toString()}`;
	}

	/**
	 * Exchange an authorization code for an access token.
	 *
	 * @param {string} code – authorization code from the callback
	 * @returns {Promise<{ accessToken: string, userId: string }>}
	 */
	async exchangeCode(code) {
		// 1. Exchange code for short-lived token
		const res = await fetch(OAUTH.tokenUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: OAUTH.clientId,
				client_secret: OAUTH.clientSecret,
				grant_type: 'authorization_code',
				redirect_uri: OAUTH.redirectUri,
				code,
			}).toString(),
		});

		const data = await res.json();

		if (!res.ok || data.error) {
			throw new AuthenticationError(data.error_message || data.error || 'OAuth token exchange failed');
		}

		const shortLivedToken = data.access_token;
		const userId = data.user_id?.toString() || null;

		// 2. Exchange short-lived token for long-lived token (60 days)
		try {
			const longRes = await fetch(
				`https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=${OAUTH.clientSecret}&access_token=${shortLivedToken}`,
			);
			const longData = await longRes.json();

			if (longRes.ok && longData.access_token) {
				this.#accessToken = longData.access_token;
			} else {
				// Fallback to short-lived if exchange fails
				console.warn('Failed to get long-lived token, using short-lived one:', longData.error);
				this.#accessToken = shortLivedToken;
			}
		} catch (err) {
			console.warn('Error fetching long-lived token, using short-lived one:', err);
			this.#accessToken = shortLivedToken;
		}

		this.#userId = userId;

		return {
			accessToken: this.#accessToken,
			userId: this.#userId,
		};
	}

	/**
	 * Set the access token directly (e.g. after loading from a session).
	 *
	 * @param {string} token
	 */
	setToken(token) {
		this.#accessToken = token;
	}

	/** @returns {string} */
	getToken() {
		return this.#accessToken;
	}

	/** @returns {boolean} */
	isAuthenticated() {
		return Boolean(this.#accessToken);
	}

	/** @returns {'oauth'} */
	getMode() {
		return 'oauth';
	}

	/** @returns {string|null} */
	getUserId() {
		return this.#userId;
	}

	/** Clear stored credentials (logout). */
	clear() {
		this.#accessToken = null;
		this.#userId = null;
	}
}
