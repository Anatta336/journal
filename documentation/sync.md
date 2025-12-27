# Synchronization

This document describes how data is synchronized between the frontend (PWA) and backend server.

## Overview

The sync system allows users to work offline with their journal entries, automatically synchronizing changes when connectivity is restored. The server acts as the source of truth for conflict resolution.

## Sync Triggers

Synchronization occurs:
- Automatically after each entry save (if online)
- Every 5 minutes while online
- When the browser goes back online after being offline
- Manually via the "Sync Now" button in Settings

## Hash-Based Change Detection

To minimize data transfer, the system uses SHA-256 hashes for change detection.

### Entry Hash

Each entry has a hash calculated from:
- The Markdown content
- Normalized metadata (sorted tags)

This hash is stored in the entry's frontmatter.

### Global Hash

A global hash represents the entire collection state:
1. Sort all entry IDs alphabetically
2. Concatenate their individual hashes in that order
3. Hash the resulting string

If the global hash matches between client and server, no sync is needed.

## Sync Protocol

### Step 1: Compare Global Hashes

```
GET /api/sync/status → { globalHash: "abc123..." }
```

If the client's global hash matches the server's, and the client has no pending changes, sync is complete.

### Step 2: Fetch Manifest

```
GET /api/sync/manifest → [{ id, hash, lastUpdated }, ...]
```

The manifest lists all entries with their hashes and timestamps.

### Step 3: Determine Changes

The client compares the manifest against local entries:

| Scenario | Action |
|----------|--------|
| Server entry not local | Download from server |
| Local entry not on server | If synced status, delete locally. If pending, upload to server |
| Hashes differ, server newer | Download from server |
| Hashes differ, local newer | Upload to server |
| Entry marked for deletion | Delete on server |

### Step 4: Apply Changes

**Uploads and deletions** are sent in a batch:
```
POST /api/sync/batch
{
  updates: [{ id, content, creationDate, lastUpdated, hash, tags }, ...],
  deletions: ["uuid1", "uuid2", ...]
}
```

**Downloads** fetch individual entries:
```
GET /api/sync/entries/:id → { id, content, creationDate, lastUpdated, hash, tags }
```

## Conflict Resolution

When both client and server have modified an entry, the version with the most recent `lastUpdated` timestamp wins. The entire entry from the winner overwrites the loser.

This applies even if it means:
- Overwriting local changes with server data
- Restoring a deleted entry if the server version is newer

Conflict resolution is silent - no user notification.

## Entry States

Local entries have a `syncStatus` field:

| Status | Meaning |
|--------|---------|
| `synced` | Matches server version |
| `pending` | Has local changes not yet synced |
| `error` | Sync attempt failed |

## Deletions

Deletions are "soft deletes" on both sides:
- **Frontend**: Entry is marked with `trashed: true` and `syncStatus: pending`
- **Backend**: File is moved to `.trash/` directory

During sync, trashed entries are sent to the server for deletion, then hard-deleted locally.

## Background Sync

For browsers supporting the Web Background Sync API, the app registers for background sync when changes are made offline. This allows changes to sync even if the user closes the tab.

For browsers without this API (e.g., Safari), changes sync when the app is next opened.

## Force Refresh

The Settings page provides a "Force Refresh" button that:
1. Fetches the complete manifest from the server
2. Downloads every entry from the server (with progress indicator)
3. Overwrites all local entries
4. Deletes local entries not present on the server

This is a destructive operation that discards all local changes. It requires confirmation and is disabled when offline.

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sync/status` | GET | Get global hash |
| `/api/sync/manifest` | GET | Get all entry hashes and timestamps |
| `/api/sync/entries/:id` | GET | Get single entry content |
| `/api/sync/batch` | POST | Upload changes and deletions |

## Implementation

- Frontend sync logic: [frontend/src/services/sync.ts](../frontend/src/services/sync.ts)
- Frontend hash utilities: [frontend/src/utils/hash.ts](../frontend/src/utils/hash.ts)
- Backend sync routes: [backend/src/routes/sync.ts](../backend/src/routes/sync.ts)
- Backend storage: [backend/src/services/storage.ts](../backend/src/services/storage.ts)
