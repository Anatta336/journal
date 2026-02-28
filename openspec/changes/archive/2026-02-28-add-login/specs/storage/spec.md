## ADDED Requirements

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
