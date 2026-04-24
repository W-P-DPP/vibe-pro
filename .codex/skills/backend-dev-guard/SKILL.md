---
name: backend-dev-guard
description: Enforce this repository's backend engineering guardrails. Use for Node/Express backend work, API design, module layering, controller/service/repository/entity/dto changes, database/cache/config/logging/error handling, shared-server infrastructure, tests, refactors, and backend code review in super-pro. Always inspect the current code first, then apply this skill's layered architecture, shared infrastructure, typed config, secure logging, and validation requirements.
---

# Backend Dev Guard

## Purpose

Use this skill for backend work in this repository. The goal is not only to make code work, but to keep the system internally consistent, observable, secure, testable, and easy to extend.

This repository treats `packages/shared-server` as the home for reusable backend infrastructure. Business services should be thin adapters around shared infrastructure, not places where each server copies its own app factory, logger, Redis client, Axios client, config loader, response middleware, or batching utilities.

Read `references/backend-conventions.md` when the task touches module boundaries, API contracts, persistence, config, logging, cache, HTTP clients, auth, tests, or architecture review.

## Required Workflow

1. Inspect the current implementation before designing or editing.
2. Identify the task category: business module, API contract, persistence, cache, config, logging, external client, app infrastructure, auth, tests, or refactor.
3. Preserve existing public behavior unless the user explicitly asks for a behavior change.
4. Prefer improving the touched area instead of copying existing weak patterns.
5. Define layer boundaries and DTOs before writing implementation.
6. Add or update tests that match the changed behavior.
7. Run the smallest meaningful validation first, then broader build/test checks when infrastructure is touched.
8. In the final response, state what was centralized, what behavior stayed compatible, and what verification ran.

## Architecture Rules

- Use `router -> controller -> service -> repository -> entity` for backend business modules.
- Keep HTTP objects (`req`, `res`) in router/controller only.
- Keep ORM, SQL, Redis, filesystem persistence, and third-party SDK details out of controllers.
- Keep repository methods explicit and typed; do not pass loose dictionaries across layers.
- Use DTO files for request, response, command, query, and view-model shapes.
- Do not add meaningless empty layer files; each layer must have a clear responsibility.
- Do not create new global utilities inside a business service when they belong in `packages/shared-server`.

## Shared Infrastructure First

Before adding or modifying backend infrastructure, check whether an existing shared primitive exists in `packages/shared-server`:

- `createHttpApp`, `createResponseMiddleware`, `createErrorMiddleware`, `createRequestLoggerMiddleware`
- `createWinstonLogger`
- `loadServerConfig`, `getDatabaseConfig`, `loadProfileEnv`
- `SharedRedisService`, `buildRedisUrl`
- `SharedAxiosService`, `formatAxiosLogPayload`
- `BatchProcessor`
- `sanitizeLogValue`

Rules:

- New reusable infrastructure must go into `packages/shared-server` first.
- App-specific files should be thin adapters that inject local config, routers, auth middleware, or logger instances.
- Do not duplicate Express setup, logger setup, Redis setup, Axios interceptors, response envelope logic, error middleware, or config loading in each server.
- If a shared primitive is missing, add it with tests in `packages/shared-server`, then wire services to it.
- Keep shared primitives business-agnostic and free of concrete app imports.

## Config Rules

- Use typed config loading through `loadServerConfig` and database resolution through `getDatabaseConfig`.
- Do not directly `require('../config.json')` in business or infrastructure code.
- Missing `config.json` must not crash tests or non-production tooling; fall back to safe defaults.
- Environment variables may override deploy-time settings, especially secrets and database/Redis URLs.
- Never commit real secrets, tokens, database passwords, private keys, or production credentials.
- Production database schema changes must be auditable and migration-based; do not depend on TypeORM `synchronize: true` in production.

## Logging And Observability Rules

- Logs must not expose passwords, tokens, cookies, authorization headers, private keys, or full large payloads.
- Use `sanitizeLogValue` before logging request bodies, response bodies, error response data, or audit params.
- Large logged payloads must be truncated.
- Request logs should be generated via `createRequestLoggerMiddleware`.
- Winston setup should be generated via `createWinstonLogger`.
- Errors returned to clients must be Chinese, stable, and not leak raw stack traces or database/SDK internals.
- Avoid `console.log` in runtime request paths; use the shared logger.

## Performance Rules

- Keep request hot paths short.
- Do not write per-request audit data synchronously from middleware when it can be batched.
- Use `BatchProcessor` for non-critical side effects such as operation logs.
- Avoid full table scans, unbounded list APIs, and large unpaginated responses.
- Avoid logging full response bodies or large request payloads.
- External clients must have explicit timeout config.

## API And Auth Rules

- Default new backend APIs to JWT protection unless explicitly anonymous.
- Anonymous endpoints must be obvious in router/controller design, not hidden inside a global whitelist.
- Keep route prefixes explicit in service entrypoints such as `/site-menu`, `/user`, `/agent`.
- Preserve existing route naming conventions unless the task explicitly includes route migration.
- Response envelopes must stay stable: `code`, `msg`, `data`, `timestamp`.
- Success and error messages returned to callers should default to Simplified Chinese.

## Testing Rules

- Shared infrastructure changes require unit tests in `packages/shared-server`.
- Service behavior changes require unit tests.
- Repository or API behavior changes require integration tests when feasible.
- Config, logging, Redis, Axios, and batching helpers must have focused tests for defaults, sanitization, truncation, and error paths.
- After infrastructure changes, run:
  - `pnpm --filter @super-pro/shared-server build`
  - `pnpm --filter @super-pro/shared-server test`
  - relevant server builds such as `pnpm --filter @super-pro/server build`

## Review Checklist

- No copied infrastructure that belongs in `packages/shared-server`.
- No direct `config.json` access outside app config adapters.
- No sensitive values in logs.
- No raw low-level errors exposed to clients.
- No controller-owned business or persistence logic.
- No untyped cross-layer payloads.
- No production reliance on unsafe database sync.
- Tests cover new shared primitives and changed behavior.
