## ADDED Requirements

### Requirement: General API rate limiting

All backend API endpoints SHALL enforce a per-IP rate limit of 300 requests per minute. Requests that exceed this limit SHALL receive `429 Too Many Requests`. The response SHALL include a `Retry-After` header indicating the number of seconds until the limit resets.

#### Scenario: Request within general limit is served normally
- **WHEN** a client sends fewer than 300 requests in a 60-second window to any endpoint
- **THEN** all requests are processed normally and no `429` response is returned

#### Scenario: Request exceeding general limit is rejected
- **WHEN** a client sends more than 300 requests within a 60-second window
- **THEN** the response status is `429` and a `Retry-After` header is present

---

### Requirement: Strict rate limit on login endpoint

The `POST /auth/login` endpoint SHALL enforce a per-IP rate limit of 5 requests per minute, independent of the general API limit.

#### Scenario: Login within limit succeeds
- **WHEN** a client sends 5 or fewer `POST /auth/login` requests within a 60-second window
- **THEN** all requests are processed (result depends on password correctness)

#### Scenario: Login exceeding limit is rejected with 429
- **WHEN** a client sends more than 5 `POST /auth/login` requests within a 60-second window
- **THEN** the response status is `429` and a `Retry-After` header is present
- **AND** the response is returned before any password verification occurs
