## Context

The backend currently has no brute-force protection on `POST /auth/login`. Argon2id slows each individual attempt but unlimited concurrent requests can still exhaust resources or allow dictionary attacks over time. `@fastify/rate-limit` is the standard Fastify plugin for this and integrates cleanly with the existing app.

## Goals / Non-Goals

**Goals:**
- Protect `POST /auth/login` with a strict per-IP limit (5 req/min)
- Apply a general per-IP limit to all other routes (300 req/min) as a baseline abuse guard
- Return `429 Too Many Requests` with a `Retry-After` header when limits are exceeded

**Non-Goals:**
- Distributed rate limiting across multiple instances (single-instance app, in-memory store is sufficient)
- Per-user limits (single-user app; IP-based is appropriate)
- Frontend UI changes for 429 responses (the login form will surface the error naturally)

## Decisions

**Use `@fastify/rate-limit` with route-level override**

`@fastify/rate-limit` supports a global default limit plus per-route overrides via `config.rateLimit`. Register the plugin globally with `max: 300`, then override `POST /auth/login` with `max: 5`. This is the officially supported pattern and avoids conditional logic in a hook.

**In-memory store (default)**

The default store is in-memory, which is correct for a single-process deployment. No Redis or external dependency needed.

**Key by IP**

`keyGenerator` defaults to `request.ip`. Fastify's `request.ip` respects the `trustProxy` setting. The app does not currently set `trustProxy`, so this will use the direct connection IP. If nginx is in front, `trustProxy` should be enabled to read `X-Forwarded-For` — noted as a risk below.

## Risks / Trade-offs

- **IP behind proxy**: If nginx sits in front of Fastify without `trustProxy: true`, `request.ip` will always be the nginx loopback address, making the rate limit shared across all users. Mitigation: enable `trustProxy` in the Fastify instance when a reverse proxy is present.
- **In-memory state lost on restart**: Rate limit counters reset on server restart. Acceptable for a personal single-user app.

## Migration Plan

1. Install `@fastify/rate-limit`
2. Register globally in `buildApp()` with `max: 300, timeWindow: '1 minute'`
3. Add route-level override on `POST /auth/login` with `max: 5, timeWindow: '1 minute'`
4. No data migration or rollback strategy needed — purely additive
