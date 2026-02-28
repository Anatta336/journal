## Why

The app has no way to end a session — once logged in, a token remains valid until it expires. Adding explicit logout gives the user control over their active sessions, and the ability to revoke all tokens supports recovery scenarios (e.g., logging out a forgotten device).

## What Changes

- New `POST /api/auth/logout` endpoint that invalidates the token used to make the request
- New `POST /api/auth/logout/all` endpoint that invalidates all tokens in the database
- Backend token validation extended to reject invalidated tokens
- New `invalidated` column added to the `tokens` table in SQLite
- Two small logout buttons added to the top-right of the main entry-list page:
  - **Log out**: logs out the current session immediately
  - **Invalidate all tokens**: prompts a confirmation dialogue before revoking all sessions
- On logout, the frontend clears its stored token and redirects to `/login`

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `authentication`: New token invalidation requirements — backend endpoints for single and bulk logout, updated token validation to reject invalidated tokens, and frontend logout UI with confirmation flow.

## Impact

- **Backend:** `backend/src/db.ts` (new `invalidated` column), `backend/src/routes/auth.ts` (new endpoints), `backend/src/services/auth.ts` (updated validation logic)
- **Frontend:** `frontend/src/views/` (logout buttons on main view), `frontend/src/services/auth.ts` (token clearing and redirect on logout), `frontend/src/services/sync.ts` (handle 401 post-logout)
- **Database:** Non-breaking schema migration — adds nullable `invalidated_at` column to existing `tokens` table
