# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_No unreleased changes._

## [2.1.0] - 2026-02-16

### Added

- **Vercel Support** — Added `vercel.json` and `api/index.js` for serverless deployment.
- **Meta Compliance** — Added `POST /auth/deauthorize` and `POST /auth/data-deletion` callbacks with `signed_request` validation.
- **Zero-Cookie Architecture** — Refactored web interface to use `SessionStorage` and hidden form fields instead of server-side sessions/cookies.
- **Privacy Improvements** — Updated Privacy Policy to reflect "No Cookie" status.

### Changed

- **UI Polish** — Hidden manual "Access Token" input on login page (OAuth is now the primary method).
- **Stateless Auth** — Removed `express-session` dependency.
- **Documentation** — Added `DEPLOYMENT.md` and updated `OAUTH_SETUP.md` with "HTTPS Hack" and Vercel instructions.

## [2.0.0] - 2026-02-15

### Added

- **Hexagonal architecture** — Refactored entire codebase into `core/`, `infrastructure/`, `shared/`, and `interfaces/` layers.
- **Web interface** — Express-based dashboard with login, deletion controls, and results page.
- **OAuth 2.0 support** — Authorization Code Flow for Threads API (`OAuthProvider`).
- **Token auth provider** — `TokenAuthProvider` class implementing the `AuthProvider` interface.
- **DeletionReport** domain object for structured, immutable deletion results.
- **Custom error classes** — `AuthenticationError`, `ValidationError`, `RateLimitError`, `ApiError`.
- **CSRF protection** on web interface with per-session tokens.
- **Helmet** HTTP security headers on all web responses.
- **EJS templates** — Dark-themed, responsive views (login, dashboard, results, error).
- **Docker support** — Multi-stage `Dockerfile` + `docker-compose.yml`.
- **GitHub Actions CI** — Lint, test, and syntax check across Node 18/20/22.
- **ESLint** + **Prettier** + **EditorConfig** for consistent code style.
- **Jest unit tests** for `rateLimiter`, `validators`, and `DeletionReport`.
- `CONTRIBUTING.md` contribution guidelines.
- `SECURITY.md` security policy.
- `npm run start:web` script to launch the web server.

### Changed

- **BREAKING:** All module paths changed due to hexagonal architecture refactor.
- CLI entry point moved from `src/cli.js` to `src/interfaces/cli/cli.js`.
- Config moved from `src/config.js` to `src/config/config.js` with OAuth + web settings.
- `package.json` bin entry updated to new CLI path.
- `package.json` version bumped to `2.0.0`.

## [1.1.0] - 2026-02-15

### Added

- `--type <posts|replies|all>` option to control what gets deleted (default: `replies`).
- `--min-likes <number>` threshold to only delete items with fewer likes (uses Insights API).
- `--loop` mode to keep running every ~24h (1441 min) until nothing is left to delete.
- Automatic `.env` loading via `dotenv` — `THREADS_ACCESS_TOKEN` is read from `.env` when `--token` is omitted.

### Fixed

- **Critical:** Switched reply fetching from `GET /me/threads` (which only returns top-level posts) to the correct `GET /me/replies` endpoint.

### Changed

- `--token` is now optional when `THREADS_ACCESS_TOKEN` is set in `.env`.
- Verbose output no longer dumps raw API response bodies; shows compact summaries instead.

## [1.0.0] - 2026-02-15

### Added

- CLI tool to delete the latest replies from a Threads profile.
- `--token`, `--limit`, `--dry-run`, `--verbose`, `--log-level`, `--output`, `--yes` options.
- Cursor-based pagination to fetch up to 100 replies.
- Reply-only filtering using `is_reply` and `replied_to` fields.
- Sequential deletion with fail-safe (abort on first error).
- Exponential backoff with jitter for HTTP 429 and transient errors.
- In-memory rate limiter enforcing the 100-deletions/day API cap.
- Idempotent deduplication of reply IDs within a run.
- Structured JSON logging with token masking.
- Interactive confirmation prompt (skippable with `--yes`).
- File-based log output via `--output`.
- `README.md` with full usage documentation.
- `ARCHITECTURE.md` with design overview, module map, and roadmap.
- `.env.example` with placeholder configuration.
- `.gitignore` preconfigured for Node.js projects.
