## Context

The journal backend is a Fastify server with no access control. All API and sync endpoints
are publicly accessible to anyone who can reach the server. The single user needs their
private entries protected by a password. The backend currently uses only file-based storage
(`data/entries/`); this change introduces a SQLite database to store authentication state,
built to accommodate future use cases such as vector embeddings for semantic entry search.

## Goals / Non-Goals

**Goals:**
- Require a password to access any backend functionality
- Issue per-session bearer tokens with metadata (IP, user agent, creation time)
- Support multiple simultaneous sessions (e.g. different devices)
- Add a SQLite database layer to the backend, extensible for future features
- Show a login screen in the frontend when unauthenticated

**Non-Goals:**
- Multi-user support or usernames
- Token expiry or automatic revocation
- Account recovery (no email / reset flow)
- Password change UI (password is managed via environment variable)

## Decisions

### SQLite library: `better-sqlite3` + `sqlite-vec`

**Chosen**: `better-sqlite3` with the `sqlite-vec` extension loaded at startup.

`better-sqlite3` is the most mature synchronous SQLite library for Node.js with excellent
TypeScript support and a straightforward API. The synchronous model aligns well with
Fastify's synchronous plugin pattern.

`sqlite-vec` is a vector similarity search extension for SQLite (available as the
`sqlite-vec` npm package, which bundles a precompiled native extension). It provides
`vec_distance_L2`, `vec_distance_cosine`, and KNN search via virtual tables. Loading it at
startup future-proofs the database for embedding-based semantic search without requiring a
separate vector store. `sqlite-vec` is loaded with `db.loadExtension()` using the path
exposed by the `sqlite-vec` package.

**Alternatives considered:**
- `node-sqlite3` (async, older API, less TypeScript-friendly)
- Separate vector database (e.g. Qdrant, Chroma): heavier operational burden for a
  single-user app; SQLite + sqlite-vec keeps the stack minimal

### Password management: environment variable → DB hash

The password is set via the `AUTH_PASSWORD` environment variable. On server startup, if
`AUTH_PASSWORD` is set, its Argon2id hash is computed and stored in (or updated in) the
`auth` table. If `AUTH_PASSWORD` is not set, the server will refuse to start.

This means changing the password requires updating the env var and restarting the server —
acceptable for a single-user personal app. The DB stores the hash so it survives restarts
without the env var being present. When `AUTH_PASSWORD` is set at startup, the hash is
always recomputed and stored — this is acceptable since Argon2id's cost is only paid once
per server start, not per request.

**Alternative considered:** Hash the env var on every login comparison (no DB persistence).
Rejected because the proposal specifically requires the hash to be stored in SQLite, and
storing it allows future password management tooling without changing the startup logic.

### Password hashing: Argon2id

Argon2id is the OWASP-recommended password hashing algorithm (winner of the Password
Hashing Competition). The `argon2` npm package provides a native Node.js binding.

**Alternative considered:** `bcrypt` — well-understood but older; Argon2id offers better
resistance to GPU attacks.

### Token format: random 256-bit hex, SHA-256 hash stored in DB

Tokens are generated with `crypto.randomBytes(32)` encoded as a 64-character hex string.
The token is returned to the client once and never stored in plaintext. The SHA-256 hash
of the token is stored in the `tokens` table. This means a database breach does not
directly expose valid session tokens (analogous to hashing passwords).

**Alternative considered:** JWTs — unnecessary complexity for a single-user app with no
need for claims or stateless verification.

### Token expiry: time-based, configurable via environment variable

Tokens expire a configurable number of days after their `created_at` timestamp. The
expiry period is read from the `TOKEN_EXPIRY_DAYS` environment variable (default: `10`).
Expiry is checked at validation time by comparing `created_at + TOKEN_EXPIRY_DAYS` against
the current UTC time — no separate expiry column is needed in the database, and changing
the env var takes effect immediately for all subsequent requests.

Expired tokens are rejected with `401 Unauthorized` and are not automatically deleted from
the database (they can accumulate and be purged manually or by a future cleanup job).

**Alternative considered:** storing an explicit `expires_at` column — rejected because
deriving expiry from `created_at` at validation time is simpler and allows the expiry
window to be changed without a DB migration.

### Auth enforcement: Fastify `onRequest` hook

A global `onRequest` hook validates the `Authorization: Bearer <token>` header. The login
endpoint (`POST /api/auth/login`) is exempted by path check inside the hook. Fastify's
hook system makes this straightforward without a separate middleware library.

**Alternative considered:** Route-level `preHandler` on each route — too fragile (easy to
accidentally omit on new routes).

### Frontend token storage: `localStorage`

The bearer token is stored in `localStorage` under the key `auth_token`. This is
acceptable for a single-user personal app where XSS risk is low (no user-generated
content rendered as HTML, no third-party scripts). The token is included in every API
request as an `Authorization: Bearer <token>` header in the existing fetch wrappers.

**Alternative considered:** `httpOnly` cookie — would require same-origin or CORS
cookie configuration and complicates the PWA/offline architecture; localStorage is
simpler here.

### Database location: `data/journal.db` (test: `data-test/journal.db`)

Mirrors the existing pattern for entry storage directories. The database file is created
automatically on startup if it does not exist.

## Risks / Trade-offs

- **No automatic token cleanup**: Expired tokens remain in the DB and accumulate over
  time. → Mitigation: document that the `tokens` table can be pruned manually; a cleanup
  job is a future enhancement.
- **localStorage XSS surface**: If a XSS vulnerability were introduced, the token could
  be stolen. → Mitigation: keep the app free of third-party scripts and avoid rendering
  untrusted HTML.
- **Breaking change**: All existing clients (E2E tests, curl scripts) must be updated to
  include a bearer token. → Mitigation: update test setup to authenticate before any
  API calls; document the breaking change clearly in the proposal.
- **Argon2 native compilation**: `argon2` requires a native build, which adds complexity
  to the install step on some environments. → Mitigation: verify CI/CD build environment
  supports native addons; consider fallback to `bcrypt` if build issues arise.

## Migration Plan

1. Install `better-sqlite3`, `sqlite-vec`, and `argon2` in the backend.
2. Set `AUTH_PASSWORD` env var in local `.env` file and any deployment environment.
3. Deploy backend — SQLite DB is created automatically on startup; the hash is stored.
4. Update frontend to show login screen and persist token; update all fetch calls to send
   the auth header.
5. Update E2E test setup to POST to `/api/auth/login` before each test suite, cache the
   token, and attach it to all subsequent requests.

**Rollback:** Remove the `onRequest` hook and the auth module. No data migration needed
for entry files (the SQLite DB is separate and can be deleted).

## Open Questions

- Should there be a `/api/auth/logout` endpoint to revoke the current token? (Not
  specified in the proposal but useful for a clean session end.)
- Should the test environment skip auth entirely (no `AUTH_PASSWORD` check) or use a
  fixed test password? → Fixed test password (`TEST_AUTH_PASSWORD` env var or hardcoded)
  is safer to keep auth code paths exercised in tests.
