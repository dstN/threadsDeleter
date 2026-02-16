import 'dotenv/config';

/**
 * Application factory — wires dependencies and returns
 * interface-ready objects for both CLI and web.
 *
 * This is the single composition root: all dependency
 * injection happens here, nowhere else.
 */

import { TokenAuthProvider } from './infrastructure/auth/tokenAuthProvider.js';
import { OAuthProvider } from './infrastructure/auth/oauthProvider.js';
import { createLogger } from './shared/logger.js';

/**
 * Create an application context with all dependencies wired.
 *
 * @param {object} opts
 * @param {'token'|'oauth'} [opts.authMode='token']
 * @param {string}  [opts.token]    – access token (for token mode)
 * @param {object}  [opts.loggerOpts] – logger configuration
 * @returns {object}
 */
export function createApp({ authMode = 'token', token, loggerOpts = {} } = {}) {
	const logger = createLogger(loggerOpts);

	let authProvider;
	if (authMode === 'oauth') {
		authProvider = new OAuthProvider();
	} else {
		authProvider = new TokenAuthProvider(token);
	}

	return {
		logger,
		authProvider,
		authMode,
	};
}
