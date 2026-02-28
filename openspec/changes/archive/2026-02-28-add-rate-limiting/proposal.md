## Why

The login endpoint has no brute-force protection: an attacker can submit unlimited password guesses limited only by Argon2's cost. A tiered rate limit closes this gap and provides general API abuse protection for all other routes.

## What Changes

- Add `@fastify/rate-limit` plugin to the backend
- Apply a strict limit of **5 requests per minute** to `POST /auth/login`, keyed by IP
- Apply a relaxed limit of **300 requests per minute** to all other routes, keyed by IP
- Clients that exceed a limit receive `429 Too Many Requests` with a `Retry-After` header

## Capabilities

### New Capabilities
- `rate-limiting`: Server-side rate limiting rules for the API, including per-route limits and 429 response behaviour

### Modified Capabilities
- `authentication`: The login endpoint now returns `429` when the per-IP limit is exceeded

## Impact

- **Backend**: `backend/src/app.ts` — register `@fastify/rate-limit`; `backend/package.json` — new dependency
- **Tests**: Backend unit tests and E2E tests may need to account for rate limit headers
- **No frontend changes required** — the existing `handleUnauthorized` flow does not need to handle 429 (the login form will surface the error naturally)
