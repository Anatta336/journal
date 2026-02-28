## 1. Database

- [x] 1.1 Add `invalidated_at TEXT` column to the `tokens` table in `initDb()` using `ALTER TABLE` with a duplicate-column guard
- [x] 1.2 Update the token validation query in `app.ts` to include `AND invalidated_at IS NULL`

## 2. Backend — Logout Endpoints

- [x] 2.1 Add `POST /api/auth/logout` route to `auth.ts`: extract token hash from the `Authorization` header, set `invalidated_at` to current UTC datetime on the matching row, return `204`
- [x] 2.2 Add `POST /api/auth/logout/all` route to `auth.ts`: set `invalidated_at` to current UTC datetime on all rows in the `tokens` table, return `204`
- [x] 2.3 Add backend unit tests for both logout endpoints in `auth.test.ts` (success cases, missing/invalid token)

## 3. Frontend — Auth Service

- [x] 3.1 Add `logout()` function to `frontend/src/services/auth.ts`: calls `POST /api/auth/logout`, then calls `clearToken()` and redirects to `/login`
- [x] 3.2 Add `logoutAll()` function to `frontend/src/services/auth.ts`: calls `POST /api/auth/logout/all`, then calls `clearToken()` and redirects to `/login`

## 4. Frontend — Logout UI

- [x] 4.1 Add two small logout buttons to the `.header-right` section of `App.vue`: "Log out" and "Invalidate all tokens"
- [x] 4.2 Implement inline confirmation state for the "Invalidate all tokens" button: clicking it shows a prompt with Confirm/Cancel; Confirm calls `logoutAll()`, Cancel returns to normal state
- [x] 4.3 Style the "Invalidate all tokens" button using `--color-danger` to signal destructive action; keep both buttons visually small (e.g., `font-size: var(--font-size-sm)`)

## 5. E2E Tests

- [x] 5.1 Add E2E test: authenticated user clicks "Log out", is redirected to `/login`, and the token is cleared (subsequent navigation to a protected route stays on `/login`)
- [x] 5.2 Add E2E test: "Invalidate all tokens" button shows confirmation; cancelling does not log out
- [x] 5.3 Add E2E test: "Invalidate all tokens" button — confirming logs out and redirects to `/login`
