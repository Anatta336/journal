## Purpose

Password-based authentication for the journal backend. A single password protects all API
endpoints. Successful authentication issues a bearer token stored in the browser's
`localStorage` and sent with every subsequent request. The backend validates tokens via a
SQLite database. The frontend shows a login screen when no valid token is present.

## Requirements

### Requirement: Password-based login

The backend SHALL expose a `POST /api/auth/login` endpoint that accepts a JSON body with
a `password` field. If the password matches the stored Argon2id hash, the endpoint SHALL
generate a new bearer token, persist it with metadata, and return it to the caller. If the
password does not match, the endpoint SHALL return `401 Unauthorized`. The login endpoint
SHALL be exempt from bearer token validation. The login endpoint SHALL enforce a per-IP
rate limit of 5 requests per minute; requests exceeding this limit SHALL receive
`429 Too Many Requests` before any password verification occurs.

#### Scenario: Successful login returns token
- **WHEN** `POST /api/auth/login` is called with the correct password
- **THEN** the response status is `200` and the body contains a `token` string

#### Scenario: Wrong password is rejected
- **WHEN** `POST /api/auth/login` is called with an incorrect password
- **THEN** the response status is `401`

#### Scenario: Missing password field is rejected
- **WHEN** `POST /api/auth/login` is called without a `password` field
- **THEN** the response status is `400`

#### Scenario: Login endpoint does not require a bearer token
- **WHEN** `POST /api/auth/login` is called without an `Authorization` header
- **THEN** the request is not rejected for missing auth (only for wrong password or rate limit)

#### Scenario: Excessive login attempts are rejected with 429
- **WHEN** a client sends more than 5 `POST /api/auth/login` requests within a 60-second window
- **THEN** the response status is `429` and a `Retry-After` header is present

---

### Requirement: Bearer token validation

All backend API endpoints except `POST /api/auth/login` SHALL require a valid bearer token
in the `Authorization: Bearer <token>` header. A token is valid if its SHA-256 hash exists
in the `tokens` table of the SQLite database AND its `created_at` timestamp is within the
expiry window AND its `invalidated_at` column is NULL. Requests without a valid, unexpired,
and non-invalidated token SHALL receive `401 Unauthorized`.

The expiry window is configured via the `TOKEN_EXPIRY_DAYS` environment variable (default:
`10`). Expiry is evaluated at validation time by comparing `created_at + TOKEN_EXPIRY_DAYS`
against the current UTC time.

#### Scenario: Valid token grants access
- **GIVEN** a bearer token that exists in the database, was issued within the expiry window, and has not been invalidated
- **WHEN** any protected endpoint is called with `Authorization: Bearer <token>`
- **THEN** the request is processed normally

#### Scenario: Expired token is rejected
- **GIVEN** a bearer token whose `created_at` is older than `TOKEN_EXPIRY_DAYS` days
- **WHEN** any protected endpoint is called with that token
- **THEN** the response status is `401`

#### Scenario: Missing Authorization header is rejected
- **WHEN** a protected endpoint is called without an `Authorization` header
- **THEN** the response status is `401`

#### Scenario: Invalid token is rejected
- **WHEN** a protected endpoint is called with a token that is not in the database
- **THEN** the response status is `401`

#### Scenario: Malformed Authorization header is rejected
- **WHEN** a protected endpoint is called with an `Authorization` header that is not in
  `Bearer <token>` format
- **THEN** the response status is `401`

#### Scenario: Invalidated token is rejected
- **GIVEN** a bearer token whose `invalidated_at` column is set to a non-NULL value
- **WHEN** any protected endpoint is called with that token
- **THEN** the response status is `401`

---

### Requirement: Multiple active sessions

The system SHALL support multiple simultaneously valid bearer tokens. Each login call
generates a new, independent token. Existing tokens remain valid when a new token is
issued.

#### Scenario: Two logins produce two independent tokens
- **WHEN** `POST /api/auth/login` is called twice with the correct password
- **THEN** two different token strings are returned and both are independently valid for
  accessing protected endpoints

---

### Requirement: Token metadata

Every issued token SHALL have associated metadata recorded at creation time:
- `created_at`: ISO 8601 UTC datetime of token creation
- `ip`: IP address of the request that created the token
- `user_agent`: `User-Agent` header value of the request that created the token (empty
  string if not present)

The metadata is stored in the SQLite database alongside the token's SHA-256 hash and is
not returned to the client.

#### Scenario: Token metadata is stored on login
- **WHEN** a successful login is performed from a known IP and User-Agent
- **THEN** the `tokens` table contains a row with `ip` and `user_agent` matching the
  request and `created_at` set to a current UTC datetime

---

### Requirement: Password configuration

The backend SHALL read the `AUTH_PASSWORD` environment variable on startup. If the
variable is set, the Argon2id hash of its value SHALL be computed and stored in (or
updated in) the `auth` table of the SQLite database. If `AUTH_PASSWORD` is not set and
no password hash exists in the database, the server SHALL refuse to start.

In the test environment (`TESTING=true` or `NODE_ENV=test`), the backend SHALL use a
fixed test password (configured via `AUTH_PASSWORD` or a known default) so that E2E tests
can authenticate.

#### Scenario: Server starts with AUTH_PASSWORD set
- **GIVEN** `AUTH_PASSWORD` is set to a non-empty string
- **WHEN** the backend starts
- **THEN** the server starts successfully and the password hash is stored in the database

#### Scenario: Server refuses to start without a password
- **GIVEN** `AUTH_PASSWORD` is not set and the `auth` table is empty
- **WHEN** the backend starts
- **THEN** the server exits with an error indicating no password is configured

#### Scenario: Password updated on restart with new env var
- **GIVEN** a password hash is already stored in the database
- **AND** `AUTH_PASSWORD` is set to a new value
- **WHEN** the backend starts
- **THEN** the stored hash is updated to the hash of the new password

---

### Requirement: Frontend login screen

The frontend SHALL display a login screen when no valid token is stored locally. The login
screen SHALL present a password input field and a submit button. On successful login the
token SHALL be persisted in `localStorage` and the user SHALL be redirected to the main
app. On failure a clear error message SHALL be shown.

#### Scenario: Unauthenticated user sees login screen
- **GIVEN** no token is stored in `localStorage`
- **WHEN** the user navigates to the app
- **THEN** the login screen is displayed instead of the main app

#### Scenario: Correct password logs the user in
- **WHEN** the user enters the correct password and submits
- **THEN** the token is stored in `localStorage` and the main app is shown

#### Scenario: Wrong password shows error
- **WHEN** the user enters an incorrect password and submits
- **THEN** an error message is shown and the user remains on the login screen

#### Scenario: Token sent with every API request
- **GIVEN** a token is stored in `localStorage`
- **WHEN** the frontend makes any API or sync request
- **THEN** the request includes `Authorization: Bearer <token>` header

#### Scenario: 401 response clears token and shows login screen
- **GIVEN** a token is stored in `localStorage`
- **WHEN** the backend responds with `401` to any request
- **THEN** the stored token is cleared and the login screen is shown

---

### Requirement: Logout current session

The backend SHALL expose a `POST /api/auth/logout` endpoint that requires a valid bearer
token. When called, it SHALL set the `invalidated_at` column on the matching token row to
the current UTC datetime. The endpoint SHALL return `204 No Content` on success.

#### Scenario: Logout invalidates the calling token
- **GIVEN** a valid bearer token
- **WHEN** `POST /api/auth/logout` is called with that token
- **THEN** the response status is `204` and subsequent requests using the same token receive `401`

#### Scenario: Logout requires authentication
- **WHEN** `POST /api/auth/logout` is called without a valid bearer token
- **THEN** the response status is `401`

---

### Requirement: Invalidate all tokens

The backend SHALL expose a `POST /api/auth/logout/all` endpoint that requires a valid
bearer token. When called, it SHALL set `invalidated_at` to the current UTC datetime on
every row in the `tokens` table. The endpoint SHALL return `204 No Content` on success.

#### Scenario: Logout-all invalidates every token
- **GIVEN** multiple valid bearer tokens exist
- **WHEN** `POST /api/auth/logout/all` is called with any valid token
- **THEN** the response status is `204` and all previously valid tokens return `401`

#### Scenario: Logout-all requires authentication
- **WHEN** `POST /api/auth/logout/all` is called without a valid bearer token
- **THEN** the response status is `401`

---

### Requirement: Logout UI

The frontend SHALL display two small logout buttons in the app header (visible on all pages
except the login screen):

- **Log out**: calls `POST /api/auth/logout`, clears the local token, and redirects the
  user to `/login`. If the server is unreachable, the local token is cleared and the
  redirect proceeds anyway.
- **Invalidate all tokens**: displays an inline confirmation prompt before proceeding;
  on confirmation calls `POST /api/auth/logout/all`, clears the local token, and redirects
  to `/login`; on cancellation returns to the normal header state without taking action.
  If the server is unreachable, an error message is shown and the local token is preserved.

Both buttons SHALL be visually small and unobtrusive. The "Invalidate all tokens" button
SHALL be styled to indicate a destructive action (e.g., using `--color-danger`).

#### Scenario: Log out button clears session and redirects
- **GIVEN** the user is authenticated and on any non-login page
- **WHEN** the user clicks "Log out"
- **THEN** `POST /api/auth/logout` is called, the local token is cleared, and the user is redirected to `/login`

#### Scenario: Log out proceeds locally even when offline
- **GIVEN** the user is authenticated and the server is unreachable
- **WHEN** the user clicks "Log out"
- **THEN** the local token is cleared and the user is redirected to `/login`

#### Scenario: Invalidate all tokens shows confirmation
- **GIVEN** the user is authenticated
- **WHEN** the user clicks "Invalidate all tokens"
- **THEN** an inline confirmation prompt is shown without immediately taking action

#### Scenario: Confirming invalidate-all clears all sessions and redirects
- **GIVEN** the inline confirmation is visible
- **WHEN** the user confirms the action
- **THEN** `POST /api/auth/logout/all` is called, the local token is cleared, and the user is redirected to `/login`

#### Scenario: Cancelling invalidate-all does nothing
- **GIVEN** the inline confirmation is visible
- **WHEN** the user cancels
- **THEN** no request is made and the header returns to its normal state

#### Scenario: Invalidate all tokens shows error when offline
- **GIVEN** the inline confirmation is visible and the server is unreachable
- **WHEN** the user confirms the action
- **THEN** an error message is shown, the local token is preserved, and the user remains on the current page
