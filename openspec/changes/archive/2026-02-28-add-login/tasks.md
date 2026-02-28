## 1. Backend: Dependencies and Database

- [x] 1.1 Install `better-sqlite3`, `@types/better-sqlite3`, `sqlite-vec`, and `argon2` in the backend
- [x] 1.2 Create `backend/src/db.ts` — opens/creates the SQLite database, loads `sqlite-vec` extension, runs `CREATE TABLE IF NOT EXISTS` for `auth` and `tokens` tables
- [x] 1.3 Add database file paths to `.gitignore` (`data/journal.db`, `data-test/journal.db`)
- [x] 1.4 Initialise the database in the Fastify server startup (`backend/src/index.ts`) so it is available before routes are registered

## 2. Backend: Password Initialisation

- [x] 2.1 Create `backend/src/services/auth.ts` — exports `initPassword(password: string)` (hash + upsert into `auth` table) and `verifyPassword(candidate: string): Promise<boolean>`
- [x] 2.2 On server startup, read `AUTH_PASSWORD` env var; if set, call `initPassword`; if not set and `auth` table is empty, exit with a clear error message

## 3. Backend: Auth Endpoint

- [x] 3.1 Create `backend/src/routes/auth.ts` — registers `POST /api/auth/login` with Zod body validation (`{ password: string }`)
- [x] 3.2 Implement login handler: verify password, generate `crypto.randomBytes(32).toString('hex')` token, store SHA-256 hash + `created_at`, `ip`, `user_agent` in `tokens` table, return `{ token }`
- [x] 3.3 Register the auth route in the main Fastify app, ensuring it is added **before** the global auth hook so it remains exempt

## 4. Backend: Auth Middleware

- [x] 4.1 Add a global `onRequest` hook in `backend/src/index.ts` that reads the `Authorization: Bearer <token>` header, hashes the token with SHA-256, looks it up in the `tokens` table, checks that `created_at` is within `TOKEN_EXPIRY_DAYS` days of now, and returns `401` if the token is missing or expired
- [x] 4.2 Exempt `POST /api/auth/login` from the hook (check `request.url` and `request.method` inside the hook)

## 5. Backend: Test Environment

- [x] 5.1 Ensure the test environment (`TESTING=true` / `NODE_ENV=test`) uses `data-test/journal.db` for the SQLite database
- [x] 5.2 Document (in `AGENTS.md` or a `.env.example`) that `AUTH_PASSWORD` and `TOKEN_EXPIRY_DAYS` (default `10`) must/can be set to run the backend; add a default test password for E2E tests (e.g. via `AUTH_PASSWORD=testpassword` in the E2E test setup)

## 6. Frontend: API Layer

- [x] 6.1 Create `frontend/src/services/auth.ts` — exports `getToken(): string | null`, `setToken(token: string): void`, `clearToken(): void` (using `localStorage`)
- [x] 6.2 Update all `fetch` calls in `frontend/src/services/` (API service and sync service) to include `Authorization: Bearer <token>` header from `getToken()`
- [x] 6.3 Add a global response interceptor (or wrapper) that calls `clearToken()` and redirects to login when any fetch returns `401`

## 7. Frontend: Login View

- [x] 7.1 Create `frontend/src/views/LoginView.vue` — password input, submit button, error message display; calls `POST /api/auth/login`, stores token on success, shows error on failure
- [x] 7.2 Add a `/login` route in Vue Router (`frontend/src/router/index.ts`)
- [x] 7.3 Add a navigation guard to Vue Router: if no token in localStorage, redirect to `/login`; if on `/login` with a valid token, redirect to `/`

## 8. E2E Tests

- [x] 8.1 Update Playwright test setup (`playwright.config.ts` or a global setup file) to start the backend with `AUTH_PASSWORD` set
- [x] 8.2 Add a Playwright helper/fixture that logs in via the API and attaches the token to requests (or logs in via the UI before each suite as needed)
- [x] 8.3 Add E2E tests for the login flow: correct password → app shown; wrong password → error shown; unauthenticated access → redirect to login

## 9. Documentation

- [x] 9.1 Update `AGENTS.md` to document the SQLite database, its location, and the `AUTH_PASSWORD` env var requirement
