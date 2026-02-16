import express from 'express';
import helmet from 'helmet';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import 'dotenv/config';
import { WEB } from '../../config/config.js';
import { createLogger } from '../../shared/logger.js';
import { createRoutes } from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Create and configure the Express application.
 */
export function createServer() {
	const app = express();
	const logger = createLogger({ logLevel: 'info' });

	// ─── Security ──────────────────────────────────────────────
	app.use(
		helmet({
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
					fontSrc: ["'self'", 'https://fonts.gstatic.com'],
					scriptSrc: ["'self'", "'unsafe-inline'"],
				},
			},
		}),
	);

	// ─── Sessions ──────────────────────────────────────────────
	// Removed for stateless operation (No Cookies)
	// State is passed via POST parameters and sessionStorage.

	// ─── Body parsing ──────────────────────────────────────────
	app.use(express.urlencoded({ extended: false }));
	app.use(express.json());

	// ─── View engine ───────────────────────────────────────────
	app.set('view engine', 'ejs');
	app.set('views', path.join(__dirname, 'views'));

	// ─── Static files ──────────────────────────────────────────
	app.use(express.static(path.join(__dirname, 'public')));

	// ─── Routes ────────────────────────────────────────────────
	app.use('/', createRoutes(logger));

	// ─── Error handler ─────────────────────────────────────────
	app.use((err, req, res, _next) => {
		logger.error({ action: 'http_error', error: err.message, path: req.path });
		res.status(err.statusCode || 500).render('error', {
			title: 'Error',
			message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
		});
	});

	return { app, logger };
}

// ─── Start when run directly ─────────────────────────────────
const isMain = process.argv[1] && fileURLToPath(import.meta.url).includes(path.basename(process.argv[1]));

if (isMain) {
	const { app, logger } = createServer();

	const server = app.listen(WEB.port, () => {
		logger.info({
			action: 'server_start',
			port: WEB.port,
			url: `http://localhost:${WEB.port}`,
		});
		console.log(`\n🚀 Threads Deleter running at http://localhost:${WEB.port}\n`);
	});

	// Graceful shutdown
	const shutdown = (signal) => {
		logger.info({ action: 'shutdown', signal });
		server.close(() => process.exit(0));
		setTimeout(() => process.exit(1), 5000);
	};

	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
}
