## MODIFIED Requirements

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

## ADDED Requirements

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
  user to `/login`
- **Invalidate all tokens**: displays an inline confirmation prompt before proceeding;
  on confirmation calls `POST /api/auth/logout/all`, clears the local token, and redirects
  to `/login`; on cancellation returns to the normal header state without taking action

Both buttons SHALL be visually small and unobtrusive. The "Invalidate all tokens" button
SHALL be styled to indicate a destructive action (e.g., using `--color-danger`).

#### Scenario: Log out button clears session and redirects
- **GIVEN** the user is authenticated and on any non-login page
- **WHEN** the user clicks "Log out"
- **THEN** `POST /api/auth/logout` is called, the local token is cleared, and the user is redirected to `/login`

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
