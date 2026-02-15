# Threads Deleter

> Production-grade CLI tool to bulk-delete posts, replies, or both from your Threads profile using the official Meta Threads API.

---

## Features

| Feature                     | Description                                                        |
| --------------------------- | ------------------------------------------------------------------ |
| **Type targeting**          | Delete posts, replies, or all — you choose with `--type`           |
| **Like threshold**          | Only delete items below a like count with `--min-likes`            |
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
| **File output**             | Optionally write the full log to a file for auditing               |

---

## Installation

```bash
# Clone the repository
git clone https://github.com/dstN/threadsDeleter.git
cd threadsDeleter

# Install dependencies
npm install
```

### Prerequisites

- **Node.js ≥ 18** (uses native `fetch`)
- A valid **long-lived Threads access token** with scopes:
  - `threads_basic`
  - `threads_delete`

---

## Environment Setup

1. Copy the example env file:

   ```bash
   cp .env.example .env
   ```

2. Fill in your `THREADS_ACCESS_TOKEN`.

The CLI loads `.env` automatically via `dotenv`. You can simply run:

```bash
node src/cli.js --dry-run
```

Or pass the token explicitly to override:

```bash
node src/cli.js --token "YOUR_TOKEN" --dry-run
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
node src/cli.js --dry-run

# Delete only top-level posts
node src/cli.js --type posts --dry-run

# Delete everything (posts + replies)
node src/cli.js --type all --dry-run

# Delete replies with fewer than 5 likes
node src/cli.js --min-likes 5 --dry-run

# Delete 50 replies, skip confirmation
node src/cli.js --limit 50 --yes

# Override token from .env
node src/cli.js --token "$TOKEN" --dry-run --verbose

# Write full debug log to a file
node src/cli.js --verbose --output deletion-log.json

# Loop mode — delete 100 replies/day until the profile is clean
node src/cli.js --type all --loop --yes
```

---

## Dry-Run Mode

When `--dry-run` is passed, the tool:

1. Validates your token against the API.
2. Fetches replies normally.
3. Logs each reply as `"would_delete"` **without** calling the DELETE endpoint.
4. Prints a summary.

This is safe to run as many times as you like — it will never modify your data.

---

## Safety Notes

- **Confirmation prompt** — Unless `--yes` is passed, the CLI asks for explicit
  confirmation before deleting anything.
- **Fail-safe** — If any individual deletion fails, the process stops immediately.
  No further deletions are attempted.
- **Token validation** — The token is verified against `GET /me` before any
  mutations are performed.
- **No token leakage** — Tokens are masked in all log output (only the first
  and last 4 characters are shown).

---

## Rate Limit

The Threads API enforces a hard limit of **100 deletions per account per day**.

This tool enforces that limit locally:

- A counter tracks deletions within each run.
- Once the limit is reached, additional replies are skipped and the process stops gracefully.
- The `--limit` flag cannot exceed 100.

If you need to delete more than 100 replies, run the tool again the next day.

---

## Output Format

All log output is **structured JSON**, one entry per line:

```json
{ "timestamp": "2026-02-15T20:00:00.000Z", "level": "info", "action": "deleted", "replyId": "18234567890", "status": "success" }
```

Key fields:

| Field       | Description                                                              |
| ----------- | ------------------------------------------------------------------------ |
| `timestamp` | ISO-8601 timestamp                                                       |
| `level`     | `info`, `debug`, `warn`, or `error`                                      |
| `action`    | What happened (`deleted`, `dry_run_delete`, `fetch_replies_start`, etc.) |
| `replyId`   | The Threads media ID being acted upon                                    |
| `status`    | Outcome (`success`, `would_delete`, `error`)                             |
| `error`     | Error message (only on failures)                                         |

When `--output <file>` is used, the same JSON lines are written to the file.

---

## Development

```bash
# Run the tool locally
node src/cli.js --help

# Preview with debug output
node src/cli.js --token "$TOKEN" --dry-run --verbose

# Project structure
src/
  cli.js                  # CLI entry point + commander setup
  config.js               # Centralized configuration
  logger.js               # Structured logger with token masking
  api/
    threadsClient.js      # Low-level Threads API HTTP client
  services/
    replyService.js       # Fetch posts/replies/all with optional like filtering
    deleteService.js      # Sequential deletion with fail-safe
    rateLimiter.js        # In-memory daily deletion counter
  utils/
    validators.js         # Input validation (token, limit)
    backoff.js            # Exponential backoff with jitter
```

---

## Contribution Guidelines

1. **Fork** the repository and create a feature branch.
2. Follow the existing code style (ESM, async/await, no global state).
3. Add inline comments for non-obvious logic.
4. Test your changes locally with `--dry-run` before submitting.
5. Submit a pull request with a clear description of the change.

---

## License

[MIT](LICENSE)
