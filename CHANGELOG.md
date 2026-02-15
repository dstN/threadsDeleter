# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_No unreleased changes._

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
