/**
 * Token-based authentication provider.
 *
 * Wraps a direct access token behind the AuthProvider interface
 * so CLI and web can use the same contract regardless of auth method.
 *
 * AuthProvider interface:
 *   - getToken()         → string
 *   - isAuthenticated()  → boolean
 *   - getMode()          → 'token' | 'oauth'
 */
export class TokenAuthProvider {
	#token;

	/**
	 * @param {string} token – long-lived Threads access token
	 */
	constructor(token) {
		this.#token = token;
	}

	/** @returns {string} */
	getToken() {
		return this.#token;
	}

	/** @returns {boolean} */
	isAuthenticated() {
		return Boolean(this.#token && this.#token.length >= 10);
	}

	/** @returns {'token'} */
	getMode() {
		return 'token';
	}
}
