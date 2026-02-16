# Security Policy

## Supported Versions

| Version | Supported         |
| ------- | ----------------- |
| 2.x     | ✅ Active support |
| 1.x     | ⚠️ Critical fixes |
| < 1.0   | ❌ Not supported  |

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Instead, please email [security@example.com](mailto:security@example.com) with:

1. A description of the vulnerability
2. Steps to reproduce
3. Potential impact

We will respond within 48 hours and provide an estimated timeline for a fix.

## Security Measures

- **Token masking**: Access tokens are redacted in all log output (first 4 + last 4 characters only)
- **No global state**: Tokens are never stored in module-level variables
- **CSRF protection**: Web interface uses per-session CSRF tokens
- **Helmet**: HTTP security headers (CSP, XSS, etc.) applied to all web responses
- **Session security**: HTTP-only, same-site cookies with secure flag in production
- **No token persistence**: OAuth tokens are stored in-memory session only (no database)
- **`.env` files**: Excluded from version control via `.gitignore`
