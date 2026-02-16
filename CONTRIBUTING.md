# Contributing to Threads Deleter

Thank you for your interest in contributing!

## Getting Started

1. **Fork** the repository and clone it locally.
2. Run `npm install` to install all dependencies.
3. Copy `.env.example` to `.env` and add your test credentials.

## Development Workflow

```bash
# Run the CLI
node src/interfaces/cli/cli.js --help

# Start the web server
node src/interfaces/web/server.js

# Run tests
npm test

# Lint
npm run lint
```

## Code Style

- **ESM** (`import`/`export`) — no CommonJS
- **Async/await** — no raw promises or callbacks
- **Tabs** for indentation, **single quotes**
- Follow the existing patterns in each layer

## Architecture Rules

1. **Core** (`src/core/`) must not import from `interfaces/` or `infrastructure/`
2. **Infrastructure** (`src/infrastructure/`) must not import from `interfaces/`
3. **Interfaces** (`src/interfaces/`) can import from everything
4. **Shared** (`src/shared/`) can be imported from anywhere

## Pull Request Guidelines

1. Create a feature branch from `master`
2. Write descriptive commit messages
3. Add tests for new functionality
4. Run `npm test` and `npm run lint` before submitting
5. Include a clear PR description

## Reporting Issues

- Use GitHub Issues
- Include reproduction steps and environment details
- For security vulnerabilities, see [SECURITY.md](SECURITY.md)
