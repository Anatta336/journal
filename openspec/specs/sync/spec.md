## Purpose

The synchronisation system keeps the frontend's IndexedDB copy of entries consistent with
the backend's file-based store. It uses SHA-256 content hashes to minimise data transfer,
supports offline operation, and resolves conflicts by preferring the version with the most
recent `lastUpdated` timestamp. Implementation lives in `frontend/src/services/sync.ts`
(frontend) and `backend/src/routes/sync.ts` + `backend/src/services/storage.ts` (backend).

## Requirements

### Requirement: Hash-based change detection

Each entry SHALL have a SHA-256 hash stored in its frontmatter. The hash SHALL be computed
from the entry's Markdown content concatenated with a JSON-stringified sorted array of its
tags (`content + JSON.stringify(tags.sort())`). An entry with no tags SHALL produce the same
hash as one with an empty tags array. A global hash SHALL be computed by sorting all active
entry IDs alphabetically, concatenating their individual hashes, and hashing the result.

#### Scenario: Tag-only change is detected
- **GIVEN** an entry whose content has not changed but whose tags have been modified
- **WHEN** the hash is recalculated
- **THEN** the new hash differs from the previous one

#### Scenario: Tag order does not affect hash
- **GIVEN** an entry with tags `["work", "alpha"]`
- **WHEN** the hash is calculated with tags in different orderings
- **THEN** the hash is identical regardless of the tag order provided

#### Scenario: No tags equals empty tags array
- **GIVEN** two otherwise identical entries, one with `tags: undefined` and one with `tags: []`
- **THEN** both produce the same hash

#### Scenario: Global hash reflects collection state
- **WHEN** any entry is added, updated, or deleted
- **THEN** the global hash changes

---

### Requirement: Sync protocol

The frontend sync process SHALL follow a four-step protocol: compare global hashes, fetch
the server manifest if they differ, reconcile differences, and apply changes in batch.

#### Scenario: No sync needed when global hashes match
- **GIVEN** the client global hash matches the server's reported global hash
- **AND** there are no locally pending changes
- **WHEN** sync runs
- **THEN** no further API calls are made

#### Scenario: Manifest fetched when hashes differ
- **GIVEN** the client global hash does not match the server's
- **WHEN** sync runs
- **THEN** `GET /api/sync/manifest` is called to retrieve per-entry hashes and timestamps

#### Scenario: Server-only entry is downloaded
- **GIVEN** an entry exists on the server but not locally
- **WHEN** sync runs
- **THEN** the entry is fetched from the server and saved locally with `syncStatus: synced`

#### Scenario: Pending local entry is uploaded
- **GIVEN** a local entry with `syncStatus: pending` that is not on the server
- **WHEN** sync runs
- **THEN** the entry is included in the batch upload to the server

#### Scenario: Server wins conflict resolution
- **GIVEN** both client and server have different versions of the same entry
- **AND** the server version has a more recent `lastUpdated` timestamp
- **WHEN** sync runs
- **THEN** the server version overwrites the local version

#### Scenario: Client wins conflict resolution
- **GIVEN** both client and server have different versions of the same entry
- **AND** the local version has a more recent `lastUpdated` timestamp
- **WHEN** sync runs
- **THEN** the local version is uploaded to the server

#### Scenario: Synced local entry deleted when absent from server
- **GIVEN** a local entry with `syncStatus: synced` that no longer appears in the server manifest
- **WHEN** sync runs
- **THEN** the local entry is deleted

#### Scenario: Trashed local entry is sent for server deletion
- **GIVEN** a local entry with `trashed: true` and `syncStatus: pending`
- **WHEN** sync runs
- **THEN** the entry ID is included in the `deletions` array of the batch request

---

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

---

### Requirement: Sync triggers

Synchronisation SHALL be triggered automatically after each entry save, every 5 minutes
while online, and when the browser regains connectivity after being offline. A manual
"Sync Now" trigger SHALL also be available from the Settings page.

#### Scenario: Sync after save
- **WHEN** the user saves an entry and the app is online
- **THEN** a sync is initiated shortly after the save

#### Scenario: Periodic sync
- **WHEN** the app has been online for 5 minutes since the last sync
- **THEN** a sync is automatically initiated

#### Scenario: Sync on reconnect
- **WHEN** the browser transitions from offline to online
- **THEN** a sync is initiated

---

### Requirement: Entry sync status

Each locally stored entry SHALL have a `syncStatus` field indicating whether it is
in sync with the server.

| Status | Meaning |
|---|---|
| `synced` | Local copy matches the server version |
| `pending` | Local changes have not yet been synced |
| `error` | The most recent sync attempt for this entry failed |

#### Scenario: Status set to pending on local edit
- **WHEN** the user saves an entry
- **THEN** the entry's `syncStatus` is set to `pending` until a successful sync completes

#### Scenario: Status set to synced after successful sync
- **WHEN** a sync successfully uploads or confirms an entry
- **THEN** the entry's `syncStatus` is set to `synced`

---

### Requirement: Background sync

When the Web Background Sync API is available, the app SHALL register a background sync
task after making offline changes, allowing changes to sync even if the user closes the
tab. For browsers without this API, sync SHALL be attempted when the app is next opened
or when connectivity is restored while the app is open.

#### Scenario: Background sync registration
- **GIVEN** the browser supports the Web Background Sync API
- **WHEN** a change is saved while offline
- **THEN** a background sync is registered to send the change when connectivity is restored

#### Scenario: Fallback for unsupported browsers
- **GIVEN** the browser does not support the Web Background Sync API (e.g. Safari)
- **WHEN** the app is opened after previously saving changes offline
- **THEN** a sync is attempted on app load
