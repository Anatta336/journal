## Context

Authentication currently issues bearer tokens that remain valid until they expire (`TOKEN_EXPIRY_DAYS`, default 10 days). There is no way to actively invalidate a token. The `tokens` table stores `hash`, `created_at`, `ip`, and `user_agent` — no invalidation state.

The frontend stores the token in `localStorage` and already has `clearToken()` and `handleUnauthorized()` helpers in `frontend/src/services/auth.ts`. The global header in `App.vue` is the natural location for logout controls, as it is already the home for session-scoped UI (settings link, sync/connection status).

## Goals / Non-Goals

**Goals:**
- Allow the user to invalidate the current session token via a backend endpoint
- Allow the user to invalidate all tokens at once (recovery scenario)
- Surface both actions as small buttons in the app header
- Require confirmation before invalidating all tokens
- Clear the frontend token and redirect to `/login` on logout

**Non-Goals:**
- Token listing or session management UI (not needed for a single-user app)
- Automatic logout after inactivity
- Server-sent events or push notification on remote token invalidation

## Decisions

### Invalidation via `invalidated_at` column (not deletion)

Adding a nullable `invalidated_at TEXT` column to the `tokens` table rather than deleting rows on logout. This preserves audit history and avoids the need to handle race conditions between expiry checks and deletes.

**Alternative considered:** Delete the row on logout. Simpler, but loses the audit trail and makes "invalidate all" indistinguishable from a database wipe.

### Two separate backend endpoints

`POST /api/auth/logout` invalidates only the calling token. `POST /api/auth/logout/all` invalidates every row in the `tokens` table. Both require a valid bearer token (standard auth middleware applies).

**Alternative considered:** A single endpoint with a query param or body flag. Rejected — separate endpoints are cleaner and reduce the risk of accidental mass invalidation.

### Token identification at logout

To invalidate the calling token, the endpoint hashes the raw token from the `Authorization` header (same SHA-256 approach used at login) and sets `invalidated_at` on the matching row.

### Database migration via `ALTER TABLE … ADD COLUMN IF NOT EXISTS`

SQLite supports `ALTER TABLE tokens ADD COLUMN invalidated_at TEXT` without locking. The `initDb()` function in `db.ts` will attempt this via a conditional `CREATE TABLE` + `ALTER TABLE` pattern so existing deployments are upgraded automatically on restart.

### Confirmation UI: inline state in Vue component (not browser `confirm()`)

A small in-component confirmation state (e.g., a "Are you sure?" prompt that appears inline beside the button) gives consistent styling with the rest of the app. Browser-native `confirm()` is synchronous, blocks the JS thread, and cannot be styled.

### Logout buttons location: global app header

Both buttons are placed in the `App.vue` header (inside `.header-right`) rather than in a specific view. This makes them accessible from any page and keeps them alongside other session-aware indicators (settings, sync status).

## Risks / Trade-offs

- **Migration on existing DB**: The `ALTER TABLE` approach is safe for SQLite but must be guarded to avoid "duplicate column" errors on a fresh start. → Guard with a try/catch or check `PRAGMA table_info(tokens)` before running.
- **Token in header after invalidation**: If the user's browser caches the page while offline and then comes back online with an invalidated token, the next sync will return `401`, triggering `handleUnauthorized()` which already clears and redirects. → No extra handling needed.
- **Logout/all while offline**: The "invalidate all" button requires a network request. It should fail gracefully with an error message if offline. → Handle the fetch error and show feedback.

## Migration Plan

1. Backend startup (`initDb()`): run `ALTER TABLE tokens ADD COLUMN invalidated_at TEXT` (with duplicate-column guard). Existing rows get `NULL`, meaning not invalidated — correct behaviour.
2. Token validation hook updated to add `AND invalidated_at IS NULL` to the lookup query.
3. No frontend migration needed — `clearToken()` already exists.
4. Rollback: the column is nullable with no constraints; removing the endpoints and reverting the validation query restores prior behaviour without touching data.
