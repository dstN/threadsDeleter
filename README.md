# Threads Deleter

> Enterprise-grade CLI & web tool to bulk-delete posts, replies, or both from your Threads profile using the official Meta Threads API.

---

## Features

| Feature                     | Description                                                        |
| --------------------------- | ------------------------------------------------------------------ |
| **Dual interface**          | CLI tool + web dashboard — same core logic, two entry points       |
| **Type targeting**          | Delete posts, replies, or all — you choose with `--type`           |
| **Like threshold**          | Only delete items below a like count with `--min-likes`            |
| **OAuth + Token auth**      | Direct access token or OAuth 2.0 Authorization Code Flow           |
| **Cursor-based pagination** | Walks through your thread history to find up to 100 items          |
| **Rate-limit aware**        | Hard local cap of 100 deletions/day (matches API limit)            |
| **Exponential backoff**     | Automatic retry with jitter for HTTP 429 and transient errors      |
| **Dry-run mode**            | Preview what _would_ be deleted without touching the API           |
| **Idempotent**              | Duplicate IDs within a run are skipped automatically               |
| **Fail-safe**               | Stops immediately on the first error — no silent partial deletions |
| **Structured logging**      | JSON log lines with timestamp, action, ID, and status              |
| **Token masking**           | Access tokens are redacted in all log output                       |
| **DotEnv support**          | Reads `THREADS_ACCESS_TOKEN` from `.env` automatically             |
| **Loop mode**               | `--loop` keeps running every ~24h until the profile is empty       |
| **Stateless Privacy**       | **No cookies**, no database. Tokens live in your browser session   |
| **Vercel Ready**            | Optimized for serverless deployment (Vercel, AWS Lambda, etc.)     |
| **Meta Compliance**         | Includes Data Deletion and Deauthorize callback endpoints          |
| **Docker ready**            | Multi-stage Dockerfile + docker-compose included                   |

---

## Installation

```bash
git clone https://github.com/dstN/threadsDeleter.git
cd threadsDeleter
npm install
```

### Prerequisites

- **Node.js ≥ 18** (uses native `fetch`)
- A valid **long-lived Threads access token** with scopes:
  - `threads_basic`
  - `threads_read_replies`
  - `threads_delete`
  - `threads_manage_insights` _(only needed for `--min-likes`)_
- For OAuth: A Meta app with `THREADS_CLIENT_ID` and `THREADS_CLIENT_SECRET`

---

## Quick Start

### Option 1: CLI

```bash
# Using .env
cp .env.example .env    # Fill in THREADS_ACCESS_TOKEN
node src/interfaces/cli/cli.js --dry-run

# Using explicit token
node src/interfaces/cli/cli.js --token "YOUR_TOKEN" --dry-run
```

### Option 2: Web Dashboard

```bash
cp .env.example .env    # Fill in at least SESSION_SECRET
npm run start:web       # Opens at http://localhost:3000
```

### Option 3: Docker

```bash
cp .env.example .env
docker compose up --build
```

---

## CLI Usage

```
Usage: threads-deleter [options]

Options:
  --token <string>         Threads API access token (or set THREADS_ACCESS_TOKEN in .env)
  --type <type>            What to delete: posts, replies, or all (default: replies)
  --limit <number>         Max items to delete (1–100, default: 100)
  --min-likes <number>     Only delete items with fewer likes than this threshold
  --loop                   Keep running every ~24h until nothing is left to delete
  --dry-run                Preview deletions without actually deleting
  --verbose                Enable verbose (debug-level) logging
  --log-level <level>      Log level: info | debug | warn | error (default: info)
  --output <file>          Write structured log to a file
  --yes                    Skip confirmation prompt
  -V, --version            Output the version number
  -h, --help               Display help for command
```

### Examples

```bash
# Delete the latest 100 replies (default type)
node src/interfaces/cli/cli.js --dry-run

# Delete only top-level posts
node src/interfaces/cli/cli.js --type posts --dry-run

# Delete everything (posts + replies)
node src/interfaces/cli/cli.js --type all --dry-run

# Delete replies with fewer than 5 likes
node src/interfaces/cli/cli.js --min-likes 5 --dry-run

# Loop mode — delete 100/day until the profile is clean
node src/interfaces/cli/cli.js --type all --loop --yes
```

---

## Safety Notes

- **Confirmation prompt** — Unless `--yes` is passed, the CLI asks before deleting.
- **Fail-safe** — If any deletion fails, the process stops immediately.
- **Token validation** — The token is verified against `GET /me` before mutations.
- **No token leakage** — Tokens are masked in all log output.
- **CSRF protection** — Web interface uses per-session CSRF tokens.

---

## Project Structure

```
src/
  app.js                                 # Composition root
  config/
    config.js                            # All configuration
  shared/
    logger.js                            # Structured JSON logger
    errors.js                            # Custom error classes
    validators.js                        # Input validation
    backoff.js                           # Exponential backoff
  core/
    domain/
      deletionReport.js                  # Deletion result domain object
    services/
      replyService.js                    # Fetch posts/replies/all
      deleteService.js                   # Sequential deletion
      rateLimiter.js                     # Daily deletion counter
  infrastructure/
    threads/
      threadsClient.js                   # Threads API HTTP client
    auth/
      tokenAuthProvider.js               # Direct token auth
      oauthProvider.js                   # OAuth 2.0 flow
  interfaces/
    cli/
      cli.js                            # CLI entry point
    web/
      server.js                          # Express server
      routes.js                          # Route definitions
      controllers.js                     # Request handlers
      views/                             # EJS templates
```

---

## Development

```bash
npm test        # Run unit tests
npm run lint    # ESLint check
npm run check   # Node.js syntax check
npm run dry-run # CLI dry-run with verbose logging
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and [ARCHITECTURE.md](ARCHITECTURE.md) for design details.

---

## License

[MIT](LICENSE)
