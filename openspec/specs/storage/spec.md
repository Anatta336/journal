## Purpose

How journal entries are persisted on the backend server. Entries are stored as plain
Markdown files with YAML frontmatter in a `data/entries/` directory. The backend storage
service (`backend/src/services/storage.ts`) manages all file I/O, UUID generation,
frontmatter serialisation via gray-matter, and soft deletion via a `.trash/` subdirectory.

## Requirements

### Requirement: File-based entry storage

Each journal entry SHALL be stored as a single `.md` file in `data/entries/`, named after
the entry's UUID v4 identifier. The backend SHALL automatically create `data/entries/` and
`data/entries/.trash/` on startup if they do not exist. When `TESTING=true` or
`NODE_ENV=test` is set, `data-test/entries/` SHALL be used instead to isolate test data.

#### Scenario: Active entry file location
- **GIVEN** an active journal entry with id `abc123`
- **THEN** it is stored at `data/entries/abc123.md`

#### Scenario: Test environment uses separate directory
- **GIVEN** the backend is started with `TESTING=true`
- **THEN** entries are read from and written to `data-test/entries/` instead of `data/entries/`

#### Scenario: Directories created on startup
- **GIVEN** `data/entries/` does not exist
- **WHEN** the backend starts
- **THEN** `data/entries/` and `data/entries/.trash/` are created automatically

---

### Requirement: YAML frontmatter format

Every entry file SHALL begin with a YAML frontmatter block delimited by `---`. The
frontmatter SHALL contain `creationDate`, `lastUpdated`, an optional `hash`, and an
optional `tags` array. Dates SHALL be stored in ISO 8601 UTC format.

#### Scenario: New entry frontmatter
- **WHEN** a new entry is created
- **THEN** the file contains frontmatter with `creationDate` and `lastUpdated` set to the current UTC time in ISO 8601 format

#### Scenario: Updating lastUpdated on save
- **WHEN** an existing entry is updated
- **THEN** the `lastUpdated` field in frontmatter is updated to reflect the save time

#### Scenario: Backfilling creationDate from filesystem
- **GIVEN** an existing `.md` file that has no `creationDate` in its frontmatter
- **WHEN** the backend reads that file
- **THEN** `creationDate` is populated from the file's filesystem creation time and written back to the frontmatter

#### Scenario: Malformed files are skipped
- **GIVEN** a `.md` file in `data/entries/` with invalid or missing YAML frontmatter
- **WHEN** entries are listed
- **THEN** the malformed file is silently skipped and does not appear in the list

---

### Requirement: Soft delete (trash)

Deleting an entry SHALL move the file from `data/entries/` to `data/entries/.trash/`
retaining the original filename. No API for restoring trashed entries is provided;
recovery is performed manually by moving files back.

#### Scenario: Delete moves file to trash
- **WHEN** a DELETE request is made for an existing entry
- **THEN** the entry's `.md` file is moved to `data/entries/.trash/` and the original path no longer exists

#### Scenario: Trashed entries are not included in listing
- **WHEN** entries are listed via the API
- **THEN** entries in the `.trash/` directory are not returned

---

### Requirement: Entry CRUD API

The backend SHALL expose a REST API for journal entry operations at `/api/entries`.

| Endpoint | Method | Description |
|---|---|---|
| `/api/entries` | GET | List all active entries with metadata and content preview |
| `/api/entries` | POST | Create a new entry; returns the created entry with generated ID |
| `/api/entries/:id` | GET | Return the full content and metadata of one entry |
| `/api/entries/:id` | PUT | Update content and/or tags of an entry |
| `/api/entries/:id` | DELETE | Soft-delete (move to trash); returns 204 |

#### Scenario: List returns entries sorted by creation date
- **WHEN** `GET /api/entries` is called
- **THEN** entries are returned sorted by `creationDate` descending (newest first)

#### Scenario: Create generates a UUID
- **WHEN** `POST /api/entries` is called with valid content
- **THEN** a new entry is created with a server-generated UUID v4 id

#### Scenario: Get returns 404 for unknown id
- **WHEN** `GET /api/entries/:id` is called with a non-existent id
- **THEN** the response status is 404

#### Scenario: Update returns 404 for unknown id
- **WHEN** `PUT /api/entries/:id` is called with a non-existent id
- **THEN** the response status is 404

#### Scenario: Delete returns 204 on success
- **WHEN** `DELETE /api/entries/:id` is called for an existing entry
- **THEN** the response status is 204 and the file is moved to trash

#### Scenario: CORS allows frontend origin
- **WHEN** the frontend at `http://localhost:5173` makes a request to the API
- **THEN** the response includes appropriate CORS headers permitting the request

---

### Requirement: SQLite database initialisation

The backend SHALL initialise a SQLite database on startup using `better-sqlite3` with the
`sqlite-vec` extension loaded. The database file SHALL be located at `data/journal.db`.
When `TESTING=true` or `NODE_ENV=test` is set, the database SHALL be located at
`data-test/journal.db` to isolate test state. The database file and its parent directory
SHALL be created automatically if they do not exist. All schema migrations (table creation)
SHALL be applied via `CREATE TABLE IF NOT EXISTS` statements at startup.

The `sqlite-vec` extension SHALL be loaded immediately after the database connection is
opened so that vector operations are available for all subsequent queries.

#### Scenario: Database file created on first startup
- **GIVEN** no database file exists at `data/journal.db`
- **WHEN** the backend starts
- **THEN** the file is created and all required tables are initialised

#### Scenario: Test environment uses separate database
- **GIVEN** the backend is started with `TESTING=true`
- **WHEN** the database is initialised
- **THEN** `data-test/journal.db` is used instead of `data/journal.db`

#### Scenario: sqlite-vec extension is available
- **GIVEN** the backend has started successfully
- **WHEN** a query uses a `sqlite-vec` function (e.g. `vec_length`)
- **THEN** the query executes without error

#### Scenario: Schema is idempotent
- **GIVEN** the backend has been started and stopped previously
- **WHEN** the backend starts again
- **THEN** tables are not recreated and existing data is preserved
