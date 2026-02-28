## Why

The journal app currently has no access control, meaning anyone who can reach the backend can read and modify entries. Adding password-based authentication protects the single user's private data.

## What Changes

- A login screen is shown before the app loads if the user is not authenticated
- The user enters a password (no username) to log in; a random bearer token is returned on success
- All backend API endpoints (except the login endpoint) reject requests without a valid bearer token
- Multiple active tokens are supported simultaneously (e.g. different devices/browsers)
- Each token records its creation datetime, originating IP, and user agent
- The password (hashed) and all active tokens are stored in a new SQLite database on the backend
- **BREAKING**: All existing API endpoints now require `Authorization: Bearer <token>` header

## Capabilities

### New Capabilities

- `authentication`: Login endpoint, bearer token issuance, token validation middleware, and session management. Covers the password hash storage and token lifecycle.

### Modified Capabilities

- `storage`: Backend gains a SQLite database layer (in addition to the existing file-based entry storage). The database is scoped to support future expansion (e.g. vector embeddings) beyond authentication data.
- `sync`: Sync endpoints must validate bearer tokens like all other API routes.

## Impact

- **Backend**: New SQLite dependency (e.g. `better-sqlite3`). New `auth` module with middleware applied globally. New `/auth/login` endpoint exempt from token validation. Database initialisation on server startup.
- **Frontend**: New login view shown when unauthenticated. Token stored in `localStorage` (or similar). Token included as `Authorization` header in all API and sync requests.
- **E2E tests**: Test setup must obtain a valid token before interacting with the API; the test environment will need a known password configured.
- **Existing API surface**: All routes (`/entries`, `/sync/*`, etc.) gain auth enforcement — **breaking** for any unauthenticated callers.
