## Purpose

The frontend is a Progressive Web Application that works fully offline and can be installed
on mobile devices (primarily Android). All entry data is stored locally in IndexedDB so the
app is fully functional without a network connection. A service worker caches application
assets. The local data model mirrors the server format with additional sync-related fields.

## Requirements

### Requirement: Full offline capability

The app SHALL be fully usable without a network connection. All journal entries SHALL be
stored in IndexedDB with their complete content (not just metadata) to ensure offline
availability. Users SHALL be able to create, view, edit, and delete entries while offline.
All offline changes SHALL be queued and synchronised when connectivity is restored.

#### Scenario: View entries while offline
- **GIVEN** entries have previously been synced to the local IndexedDB store
- **WHEN** the user opens the app without network connectivity
- **THEN** all entries are displayed normally

#### Scenario: Create entry while offline
- **WHEN** the user creates a new entry while offline
- **THEN** the entry is saved to IndexedDB with `syncStatus: pending` and appears in the list immediately

#### Scenario: Edit entry while offline
- **WHEN** the user edits and saves an existing entry while offline
- **THEN** the updated entry is saved locally with `syncStatus: pending`

#### Scenario: Delete entry while offline
- **WHEN** the user deletes an entry while offline
- **THEN** the entry is marked with `trashed: true` and `syncStatus: pending` locally

---

### Requirement: IndexedDB local data model

The local IndexedDB store SHALL hold entries with the following fields:

| Field | Type | Description |
|---|---|---|
| `id` | string | UUID v4 matching the backend filename |
| `content` | string | Full Markdown content |
| `creationDate` | string | ISO 8601 UTC timestamp |
| `lastUpdated` | string | ISO 8601 UTC timestamp |
| `hash` | string? | SHA-256 hash of content + tags |
| `tags` | string[]? | Tag strings |
| `trashed` | boolean | Soft-delete flag |
| `syncStatus` | string | `synced` \| `pending` \| `error` |

#### Scenario: Trashed entries excluded from UI
- **WHEN** entries are loaded for the entry list view
- **THEN** entries with `trashed: true` are not included in the displayed list

---

### Requirement: Service worker and asset caching

The app SHALL use a service worker (configured via `vite-plugin-pwa`) to cache all static
application assets (JS, CSS, HTML, icons). The app SHALL load from cache even when the
network is unavailable.

#### Scenario: App loads while offline
- **GIVEN** the app has been loaded at least once while online
- **WHEN** the user opens the app without network connectivity
- **THEN** the application shell loads successfully from the service worker cache

---

### Requirement: Connectivity status indicator

The app header SHALL display a visual indicator of the current connectivity and sync state.

| State | Display |
|---|---|
| Online | "Online" indicator |
| Offline | "Offline" indicator |
| Syncing | "Syncing..." status |

#### Scenario: Offline indicator shown when disconnected
- **WHEN** the device loses network connectivity
- **THEN** the header indicator changes to show "Offline"

#### Scenario: Syncing indicator shown during sync
- **WHEN** a sync operation is in progress
- **THEN** the header displays "Syncing..." or equivalent status

---

### Requirement: PWA installability

The app SHALL be installable as a PWA on mobile devices, particularly Android, providing
an app-like experience with a home-screen icon and full-screen display. A web app manifest
SHALL be provided at `frontend/public/manifest.json`.

#### Scenario: Manifest present
- **WHEN** the app is served
- **THEN** a valid web app manifest is accessible, containing app name, icons, and display mode

#### Scenario: Add to home screen
- **GIVEN** the user is on a supported browser (e.g. Chrome on Android)
- **WHEN** the browser prompts or the user selects "Add to Home Screen"
- **THEN** the app can be installed and opens in standalone/full-screen mode
