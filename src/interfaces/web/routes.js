import { Router } from 'express';
import * as ctrl from './controllers.js';

/**
 * Define all web routes.
 *
 * @param {object} logger
 * @returns {Router}
 */
export function createRoutes(logger) {
	const router = Router();

	// Stateless architecture: Auth state is passed via body/query
	// No session middleware or CSRF token generation needed here.

	// ─── Public routes ─────────────────────────────────────────
	router.get('/', ctrl.loginPage);
	router.post('/auth/token', ctrl.tokenLogin);
	router.get('/auth/login', ctrl.oauthLogin);
	router.get('/auth/callback', ctrl.oauthCallback(logger));
	router.get('/auth/logout', ctrl.logout);
	router.get('/privacy', (req, res) => res.render('privacy'));
	router.get('/tos', (req, res) => res.render('tos'));

	// Meta Compliance Callbacks
	router.post('/auth/deauthorize', ctrl.deauthorizeCallback(logger));
	router.post('/auth/data-deletion', ctrl.dataDeletionCallback(logger));
	router.get('/deletion-status/:code', ctrl.deletionStatusPage);

	// ─── Auth-protected routes ─────────────────────────────────
	// Note: Authentication is now handled per-route via token extraction
	// from body/query, not via session middleware.

	router.get('/dashboard', ctrl.dashboardLoader); // Loader checks client storage
	router.post('/dashboard', ctrl.dashboard(logger)); // Actual dashboard (POST only)
	router.post('/preview', ctrl.previewItems(logger));
	router.post('/delete', ctrl.executeDelete(logger));

	// No explicit GET /results route needed as it's rendered from delete action

	return router;
}
