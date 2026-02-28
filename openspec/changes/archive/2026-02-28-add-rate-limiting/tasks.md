## 1. Dependency

- [x] 1.1 Install `@fastify/rate-limit` in the backend

## 2. Implementation

- [x] 2.1 Register `@fastify/rate-limit` globally in `buildApp()` with `max: 300, timeWindow: '1 minute'`
- [x] 2.2 Add per-route override on `POST /auth/login` with `max: 5, timeWindow: '1 minute'`

## 3. Tests

- [x] 3.1 Add backend unit tests verifying 429 is returned after exceeding the login rate limit
