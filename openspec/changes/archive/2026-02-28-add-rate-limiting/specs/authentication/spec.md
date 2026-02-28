## MODIFIED Requirements

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
