## Purpose

A dedicated Settings page (`/settings`) accessible via the app header that provides sync
controls, storage information, and destructive maintenance operations. Implemented in
`frontend/src/views/SettingsPage.vue`.

## Requirements

### Requirement: Settings page routing and access

The Settings page SHALL be accessible at `/settings` and SHALL be reachable via a link in
the application header.

#### Scenario: Header link navigates to settings
- **WHEN** the user clicks the Settings link in the app header
- **THEN** the user is navigated to `/settings`

---

### Requirement: Sync controls

The Settings page SHALL display the timestamp of the last successful synchronisation and
provide a "Sync Now" button to trigger a manual sync.

#### Scenario: Last sync time displayed
- **WHEN** the user opens the Settings page after at least one successful sync
- **THEN** the timestamp of the last successful sync is shown

#### Scenario: Manual sync trigger
- **WHEN** the user clicks the "Sync Now" button
- **THEN** a sync is initiated and the page shows syncing status feedback

---

### Requirement: Storage usage display

The Settings page SHALL display the total storage used by the PWA origin, covering both
IndexedDB data and Cache Storage assets, using `navigator.storage.estimate()`.

#### Scenario: Storage usage shown
- **WHEN** the user opens the Settings page
- **THEN** the total storage used by the PWA is displayed

---

### Requirement: Force Refresh

The Settings page SHALL provide a "Force Refresh" button that overwrites all local entry
data with the server's current state. This is a destructive operation: local unsynced
changes are discarded and local entries absent from the server are deleted. The button
SHALL be disabled when offline.

#### Scenario: Confirmation required
- **WHEN** the user clicks "Force Refresh"
- **THEN** a confirmation dialog explicitly warns that local changes will be overwritten and local-only entries will be deleted

#### Scenario: Force Refresh discards local changes
- **GIVEN** the user has a locally modified entry with `syncStatus: pending`
- **WHEN** the user confirms Force Refresh
- **THEN** the local entry is overwritten with the server's version

#### Scenario: Server deletions propagated on Force Refresh
- **GIVEN** the user has a local entry that no longer exists on the server
- **WHEN** the user confirms Force Refresh
- **THEN** the local entry is deleted

#### Scenario: Progress indicator shown during Force Refresh
- **WHEN** a Force Refresh is in progress
- **THEN** an incremental progress indicator (e.g. "Fetched 23/100 entries") is displayed

#### Scenario: Button disabled during operation
- **WHEN** a Force Refresh is in progress
- **THEN** the Force Refresh button is disabled to prevent concurrent operations

#### Scenario: Button disabled when offline
- **WHEN** the app is offline
- **THEN** the Force Refresh button is disabled

#### Scenario: Success notification on completion
- **WHEN** a Force Refresh completes successfully
- **THEN** a success notification is shown to the user

#### Scenario: Error notification on failure
- **WHEN** a Force Refresh fails
- **THEN** an error notification is shown to the user
