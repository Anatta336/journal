## MODIFIED Requirements

### Requirement: Sync API endpoints

The backend SHALL expose the following sync endpoints under `/api/sync`:

| Endpoint | Method | Description |
|---|---|---|
| `/api/sync/status` | GET | Returns `{ globalHash }` reflecting the current collection state |
| `/api/sync/manifest` | GET | Returns an array of `{ id, hash, lastUpdated }` for all active entries |
| `/api/sync/entries/:id` | GET | Returns the full content and metadata for a single entry |
| `/api/sync/batch` | POST | Accepts `{ updates: [...], deletions: [...] }` to apply bulk changes |

All sync endpoints SHALL require a valid bearer token (see `authentication` capability).
Requests without a valid token SHALL receive `401 Unauthorized`.

#### Scenario: Status returns current global hash
- **WHEN** `GET /api/sync/status` is called with a valid bearer token
- **THEN** the response contains a `globalHash` string

#### Scenario: Manifest lists all active entries
- **WHEN** `GET /api/sync/manifest` is called with a valid bearer token
- **THEN** every active (non-trashed) entry appears in the list with its `id`, `hash`, and `lastUpdated`

#### Scenario: Batch update persists entries
- **WHEN** `POST /api/sync/batch` is called with a valid bearer token and an entry in `updates`
- **THEN** the entry is saved to disk and its hash is stored in frontmatter

#### Scenario: Batch deletion moves entries to trash
- **WHEN** `POST /api/sync/batch` is called with a valid bearer token and an entry id in `deletions`
- **THEN** the corresponding file is moved to the `.trash/` directory

#### Scenario: Unauthenticated sync request is rejected
- **WHEN** any sync endpoint is called without a valid `Authorization: Bearer <token>` header
- **THEN** the response status is `401`
