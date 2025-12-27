# Progressive Web Application

The Journal frontend is a Progressive Web Application (PWA) that works offline and can be installed on devices.

## Offline Capability

### Local Storage

All journal entries are stored locally in the browser using IndexedDB. The app fetches the complete content of all entries (not just metadata) to ensure full offline availability.

See [frontend/src/services/db.ts](../frontend/src/services/db.ts) for the IndexedDB implementation.

### Service Worker

The PWA uses a service worker (configured via `vite-plugin-pwa`) to cache application assets. This allows the app to load even without network connectivity.

### Offline Workflow

Users can:
- View all entries while offline
- Create new entries while offline
- Edit existing entries while offline
- Delete entries while offline

All changes are queued locally and synchronized when connectivity is restored.

## Status Indicator

The app header displays connectivity status:
- **Online** - Connected to network
- **Offline** - No network connectivity
- **Syncing...** - Sync operation in progress

## Installation

The PWA can be installed on devices (particularly Android) for an app-like experience:
- Add to home screen functionality
- Full-screen display
- Offline access

The manifest is defined in [frontend/public/manifest.json](../frontend/public/manifest.json).

## Synchronization

The app automatically synchronizes with the server:
- After each entry save (when online)
- Every 5 minutes while online
- When coming back online
- Manually via Settings page

See [Sync](sync.md) for detailed synchronization protocol.

## Background Sync

For browsers supporting the Web Background Sync API:
- Changes made offline are registered for background sync
- Sync occurs even if the user closes the tab

For browsers without this API (e.g., Safari):
- Changes sync when the app is opened
- Changes sync when connectivity is restored while app is open

## Settings Page

The Settings page (`/settings`) provides:

### Sync Controls
- **Last Sync** - Timestamp of last successful sync
- **Sync Now** - Manual sync trigger
- **Force Refresh** - Destructive full refresh from server (see [Sync](sync.md#force-refresh))

### Storage Information
- **Storage Used** - Total storage used by the PWA (IndexedDB + Cache Storage)

## Data Model

Local entries mirror the server format with additional fields:

```typescript
interface LocalEntry {
    id: string
    content: string
    creationDate: string
    lastUpdated: string
    hash?: string
    tags?: string[]
    trashed: boolean      // Soft delete flag
    syncStatus: SyncStatus // 'synced' | 'pending' | 'error'
}
```

The `trashed` flag mirrors the server's `.trash/` directory concept. During sync, trashed entries are deleted on the server then removed locally.

## Security

The PWA relies on device-level security (lock screen, etc.) for data protection. No additional authentication layer is implemented at this stage.

## Routing

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Redirect | Redirects to `/entries` |
| `/entries` | EntryList | List all entries, filter by tags |
| `/entries/new` | EntryEditorPage | Create new entry |
| `/entries/:id` | EntryEditorPage | Edit existing entry |
| `/settings` | SettingsPage | Sync controls and storage info |
