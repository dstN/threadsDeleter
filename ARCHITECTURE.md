# Architecture

## Overview

Threads Deleter uses a **hexagonal (ports & adapters) architecture** to keep core business logic independent of delivery mechanisms (CLI, web) and external services (Threads API).

```
┌───────────────────────────────────────────────────────┐
│                    Interfaces                          │
│  ┌──────────┐    ┌──────────────────────────────────┐ │
│  │ CLI      │    │ Web (Express)                    │ │
│  │ cli.js   │    │ server.js → routes → controllers │ │
│  └────┬─────┘    └───────────┬──────────────────────┘ │
│       │                      │                         │
│       └──────────┬───────────┘                         │
│                  │                                     │
│       ┌──────────▼──────────┐                          │
│       │      app.js         │   Composition root       │
│       │  (wires everything) │                          │
│       └──────────┬──────────┘                          │
│                  │                                     │
│  ┌───────────────▼───────────────┐                     │
│  │         Core Services         │                     │
│  │  replyService  deleteService  │                     │
│  │  rateLimiter   DeletionReport │                     │
│  └───────────────┬───────────────┘                     │
│                  │                                     │
│  ┌───────────────▼───────────────┐                     │
│  │      Infrastructure           │                     │
│  │  threadsClient (Threads API)  │                     │
│  │  tokenAuthProvider            │                     │
│  │  oauthProvider                │                     │
│  └───────────────────────────────┘                     │
│                                                        │
│  ┌───────────────────────────────┐                     │
│  │      Shared (cross-cutting)   │                     │
│  │  logger  errors  validators   │                     │
│  │  backoff  config              │                     │
│  └───────────────────────────────┘                     │
└───────────────────────────────────────────────────────┘
```

## Dependency Rules

| Layer              | Can import from              | Cannot import from |
| ------------------ | ---------------------------- | ------------------ |
| **Interfaces**     | Core, Infrastructure, Shared | —                  |
| **Core**           | Infrastructure, Shared       | Interfaces         |
| **Infrastructure** | Shared                       | Core, Interfaces   |
| **Shared**         | Config only                  | Everything else    |

## Authentication Strategy

Two auth modes available:

1. **Token mode** (`TokenAuthProvider`) — Direct long-lived access token. Works immediately with CLI and web.
2. **OAuth mode** (`OAuthProvider`) — Authorization Code Flow via `threads.net/oauth/authorize`. Requires Meta app setup.

Both implement the same interface (`getToken()`, `isAuthenticated()`, `getMode()`).

## Error Handling

Custom error hierarchy rooted in `AppError`:

- `AuthenticationError` (401)
- `ValidationError` (400)
- `RateLimitError` (429)
- `ApiError` (502)

All errors carry a stable `code` property for programmatic matching.

## Security

- Token masking in all log output
- Per-session CSRF tokens on the web interface
- Helmet HTTP security headers
- HTTP-only, same-site session cookies
- No persistent token storage (in-memory only)

## Rate Limiting

The Threads API enforces 100 deletions/account/day. The local `rateLimiter` mirrors this cap to fail cheaply before hitting the API. Loop mode sleeps 24h + 1m between runs to respect the window.
