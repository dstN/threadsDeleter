# Architecture

> Technical architecture document for the Threads Deleter CLI.

---

## High-Level System Overview

Threads Deleter is a single-purpose CLI tool that authenticates against the
Meta Threads Graph API, fetches the authenticated user's most recent replies,
and deletes them in a controlled, sequential manner.

```
┌─────────────────────────────────────────────────────────────┐
│  CLI Layer (cli.js + commander)                             │
│  Parses args → validates → orchestrates workflow            │
├─────────────────────────────────────────────────────────────┤
│  Service Layer                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ replyService │  │deleteService │  │ rateLimiter  │      │
│  │  fetch &     │  │  sequential  │  │  local 100/  │      │
│  │  filter      │→ │  delete loop │← │  day cap     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│  API Layer (threadsClient.js)                               │
│  HTTP client → native fetch → Threads Graph API             │
├─────────────────────────────────────────────────────────────┤
│  Utilities                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  validators  │  │   backoff    │  │   logger     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
   Threads Graph API (graph.threads.net)
```

---

## Design Principles

1. **Separation of Concerns** — Each module has a single responsibility.
2. **Fail-Safe by Default** — Errors halt execution; there are no silent partial deletions.
3. **No Global Mutable State** — All state is scoped to function parameters or closures.
4. **Security First** — Tokens never appear in logs; validation happens before mutation.
5. **Idempotent Operations** — Duplicate IDs within a run are detected and skipped.
6. **Predictable Flow** — Deletions are sequential, not parallel, for debuggability.

---

## Module Responsibilities

| Module             | Responsibility                                                                    |
| ------------------ | --------------------------------------------------------------------------------- |
| `cli.js`           | Argument parsing, workflow orchestration, confirmation prompt, process exit codes |
| `config.js`        | All tunables: API base URL, rate limits, backoff parameters, field lists          |
| `logger.js`        | Structured JSON logging, level filtering, file output, token masking              |
| `threadsClient.js` | Low-level HTTP methods: `validateAccessToken`, `fetchUserThreads`, `deleteThread` |
| `replyService.js`  | Paginate user threads, filter for `is_reply === true`, return reply array         |
| `deleteService.js` | Sequential delete loop with dry-run, dedup, rate-limit, and fail-safe             |
| `rateLimiter.js`   | In-memory counter enforcing the 100/day deletion cap                              |
| `validators.js`    | Input validation for token format and numeric limit range                         |
| `backoff.js`       | Generic exponential backoff with jitter for retryable errors                      |

---

## Dependency Flow Diagram

```
cli.js
 ├── config.js
 ├── logger.js
 ├── utils/validators.js
 ├── api/threadsClient.js
 │    ├── config.js
 │    └── utils/backoff.js
 │         └── config.js
 ├── services/replyService.js
 │    ├── api/threadsClient.js
 │    └── config.js
 ├── services/deleteService.js
 │    └── api/threadsClient.js
 └── services/rateLimiter.js
      └── config.js
```

**Rule:** Dependencies flow downward only. Services never import from `cli.js`.
The API layer never imports from services. Utilities are leaf nodes.

---

## Error Handling Philosophy

| Layer        | Strategy                                                                       |
| ------------ | ------------------------------------------------------------------------------ |
| **API**      | Throws typed errors with `.status` and `.body` for HTTP failures               |
| **Backoff**  | Catches retryable errors (429, 5xx, network) and retries; all others propagate |
| **Services** | Catch errors per-item, log them, then **stop** (fail-safe)                     |
| **CLI**      | Top-level try/catch logs the fatal error and exits with code 1                 |

The guiding principle: **it is better to do nothing than to do the wrong thing**.
If a deletion fails, the user should know exactly what happened and what was
(or was not) deleted.

---

## Rate Limit Strategy

- **API limit:** 100 DELETE requests per account per 24-hour window.
- **Local enforcement:** `rateLimiter.js` tracks deletions in-memory. When the
  cap is reached, the delete loop stops and logs a warning.
- **Backoff for 429s:** If the API returns HTTP 429 despite local tracking
  (e.g. prior runs within the same day), the backoff utility handles the retry.
- **CLI guard:** `--limit` is capped at 100 during input validation.

---

## Idempotency Strategy

1. **Deduplication** — `deleteService.js` maintains a `Set` of processed IDs
   within each run. Duplicates returned by the API are skipped.
2. **API idempotency** — Deleting an already-deleted thread returns an error,
   which the fail-safe catches. This does not produce inconsistent state.
3. **Re-runnable** — Running the tool again simply discovers fewer (or zero)
   replies. No side effects from repeated execution.

---

## Security Considerations

- **Token masking** — The logger replaces the full token with `THAA…1f2Z` in all
  output (console and file).
- **No `.env` auto-loading** — The tool does not use `dotenv` or any library that
  silently reads `.env`. Tokens must be passed explicitly, reducing the risk of
  accidental exposure.
- **`.env` is gitignored** — The `.gitignore` excludes `.env` and `.env.*`.
- **No token storage** — Tokens are held in memory only for the duration of the
  process. They are never written to disk by the tool.
- **Minimal permissions** — Only `threads_basic` and `threads_delete` scopes are needed.

---

## Coding Standards

- **ESM** (`"type": "module"` in `package.json`)
- **async/await** throughout — no callbacks, no `.then()` chains
- **No external dependencies** beyond `commander` (and Node built-ins)
- **Inline JSDoc** on all exported functions
- **Consistent error objects** with `.status`, `.code`, and `.message` fields

---

## Logging Standards

Every log entry is a JSON object with these fields:

| Field       | Required       | Description                        |
| ----------- | -------------- | ---------------------------------- |
| `timestamp` | Yes            | ISO-8601 string                    |
| `level`     | Yes            | `error`, `warn`, `info`, `debug`   |
| `action`    | Yes            | Machine-readable event name        |
| `replyId`   | When available | Threads media ID                   |
| `status`    | When available | `success`, `error`, `would_delete` |
| `error`     | On failures    | Human-readable error message       |

Verbose mode (`--verbose` or `--log-level debug`) adds API response bodies
to the log stream for debugging.

---

## Extension Guidelines

### Adding a new command

1. Define a new `.action()` in `cli.js` using Commander sub-commands.
2. Create a new service under `src/services/`.
3. Reuse `threadsClient.js` for API calls and `backoff.js` for retries.

### Supporting new media types

1. Extend the `THREAD_FIELDS` list in `config.js`.
2. Update the filter logic in `replyService.js`.

### Persistent rate-limit tracking

Replace `rateLimiter.js` with a file-backed or SQLite implementation that
persists the counter across invocations within the same 24-hour window.

---

## Cron / Scheduler Readiness

The tool is designed to run headless when `--yes` is passed:

```bash
# Example crontab entry: delete up to 100 replies daily at 03:00
0 3 * * * /usr/bin/node /path/to/src/cli.js --token "$TOKEN" --yes --output /var/log/threads-deleter.json
```

Exit codes:

- `0` — success (or no replies to delete)
- `1` — any error occurred

The `--output` flag is recommended for cron jobs so logs are persisted.

---

## Testing Strategy Recommendation

| Layer                                 | Approach                                                            |
| ------------------------------------- | ------------------------------------------------------------------- |
| `validators.js`, `backoff.js`         | Unit tests (pure functions, easy to test in isolation)              |
| `threadsClient.js`                    | Integration tests with mocked HTTP (e.g. `msw` or `nock`)           |
| `replyService.js`, `deleteService.js` | Unit tests with a stubbed API client                                |
| `rateLimiter.js`                      | Unit tests (in-memory state, deterministic)                         |
| `cli.js`                              | End-to-end tests invoking the process with `child_process.execFile` |

Recommended test runner: **Node.js built-in test runner** (`node --test`) or **Vitest**.

---

## Future Improvement Roadmap

- [ ] Persistent rate-limit state (file or SQLite) for multi-run daily tracking
- [ ] `--since` / `--until` date filters for targeted deletion windows
- [ ] `--exclude <id,...>` to protect specific replies from deletion
- [ ] Unit and integration test suite
- [ ] CI/CD pipeline (GitHub Actions) with lint + test gates
- [ ] Configurable concurrency (parallel deletions with semaphore)
- [ ] JSON report export with reply text, timestamps, and deletion status
- [ ] npm package publishing for global `npx threads-deleter` usage
- [ ] Token refresh automation (long-lived → refreshed)
