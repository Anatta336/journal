## ADDED Requirements

### Requirement: Password-based login

The backend SHALL expose a `POST /api/auth/login` endpoint that accepts a JSON body with
a `password` field. If the password matches the stored Argon2id hash, the endpoint SHALL
generate a new bearer token, persist it with metadata, and return it to the caller. If the
password does not match, the endpoint SHALL return `401 Unauthorized`. The login endpoint
SHALL be exempt from bearer token validation.

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
- **THEN** the request is not rejected for missing auth (only for wrong password)

---

### Requirement: Bearer token validation

All backend API endpoints except `POST /api/auth/login` SHALL require a valid bearer token
in the `Authorization: Bearer <token>` header. A token is valid if its SHA-256 hash exists
in the `tokens` table of the SQLite database AND its `created_at` timestamp is within the
expiry window. Requests without a valid or unexpired token SHALL receive `401 Unauthorized`.

The expiry window is configured via the `TOKEN_EXPIRY_DAYS` environment variable (default:
`10`). Expiry is evaluated at validation time by comparing `created_at + TOKEN_EXPIRY_DAYS`
against the current UTC time.

#### Scenario: Valid token grants access
- **GIVEN** a bearer token that exists in the database and was issued within the expiry window
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
