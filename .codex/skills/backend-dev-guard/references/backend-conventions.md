# Backend Conventions Reference

Use this file as the detailed rule source after `backend-dev-guard` is triggered.

## Module Layout

Business domains should use this shape:

```text
src/<domain>/
  <domain>.router.ts
  <domain>.controller.ts
  <domain>.service.ts
  <domain>.repository.ts
  <domain>.dto.ts
  <domain>.entity.ts
```

Small legacy modules may keep the current directory layout, but new or touched logic should still respect the same layer boundaries.

## Layer Responsibilities

`router`

- Declare routes.
- Mount route-level middleware.
- Bind controller functions.
- Do not contain business logic.

`controller`

- Parse HTTP inputs.
- Validate or normalize DTOs.
- Call services.
- Return response envelopes.
- Map known domain errors to HTTP status and Chinese messages.

`service`

- Own business rules and orchestration.
- Coordinate repositories, cache, external clients, and transactions.
- Do not depend on Express `req` or `res`.

`repository`

- Own persistence access.
- Hide ORM/SQL details.
- Return typed entities or DTOs.
- Do not return raw HTTP semantics.

`dto`

- Define request, response, query, command, and view-model types.
- Avoid `any` and loose dictionaries.

`entity`

- Define persistent schema or domain entity shapes.
- Keep database-specific fields and migrations auditable.

## Shared Server Infrastructure

Use these shared primitives before writing app-local infrastructure:

- HTTP app factory: `createHttpApp`
- Response envelope: `createResponseMiddleware`
- Error middleware: `createErrorMiddleware`
- Request logging: `createRequestLoggerMiddleware`
- Winston logging: `createWinstonLogger`
- Typed app config: `loadServerConfig`
- Database config: `getDatabaseConfig`
- Redis wrapper: `SharedRedisService`
- Axios wrapper: `SharedAxiosService`
- Async batching: `BatchProcessor`
- Log sanitization: `sanitizeLogValue`

App-local files such as `utils/Logger.ts`, `utils/Redis.ts`, `utils/Axios.ts`, and `app.ts` should usually be adapters that pass app config into shared primitives.

## Config

- Config loading order should be: safe defaults -> optional `config.json` -> profile env file -> process env overrides.
- Config objects should be typed.
- Missing `config.json` should not break tests.
- Secrets should come from protected config or environment variables.
- Do not read raw `process.env` in random business files. Centralize env parsing.

## Logging

Recommended log fields:

- timestamp
- level
- service
- env
- requestId or traceId when available
- userId when available
- module
- operation
- method
- path
- statusCode
- durationMs

Never log:

- password
- passwordCiphertext
- passwordHash
- token
- accessToken
- refreshToken
- authorization
- cookie
- private keys
- full large payloads

Use sanitization and truncation for request bodies, response bodies, audit params, and external client response data.

## Performance

- Do not add synchronous side effects to request finish handlers when they can be batched.
- Batch audit or operation logs.
- Set external HTTP client timeouts.
- Do not log large payloads.
- Add pagination to list endpoints before they can grow unbounded.
- Prefer indexed queries for high-frequency filters.

## API Contract

Response body shape:

```ts
type ResultVO<T> = {
  code: number
  msg: string
  data?: T
  timestamp: number
}
```

Rules:

- HTTP status expresses protocol semantics.
- `code` expresses business result.
- `msg` should be Chinese by default.
- Do not leak stack traces, SQL errors, ORM internals, or upstream SDK internals.

## Auth

- New APIs default to JWT protection.
- Anonymous APIs must be explicitly mounted before auth middleware or clearly separated in a router.
- Do not hide anonymous endpoint logic in a global whitelist inside auth middleware.

## Database

- Production should not rely on TypeORM `synchronize: true`.
- Schema changes should be migration-based.
- Repository changes that affect persistence should include integration tests when feasible.

## Validation Commands

Use the smallest relevant checks first:

```bash
pnpm --filter @super-pro/shared-server build
pnpm --filter @super-pro/shared-server test
pnpm --filter @super-pro/server build
pnpm --filter @super-pro/agent-server build
pnpm --filter @super-pro/reimburse-server build
```

Run service-specific unit/integration tests when touching behavior in that service.
