# Implementation Plan - Progressive Web Application

This plan outlines the steps to transform the Journal application into a Progressive Web Application (PWA) with full offline capabilities and robust synchronization.

## 1. Backend: Sync API & Hashing Support

We need to update the backend to support the synchronization protocol, which relies on content hashing and global state comparison.

- [ ] **Update Entry Interface & Storage:**
    - Update `Entry` and `EntryMetadata` interfaces in `backend/src/services/storage.ts` to include an optional `hash` string.
    - Update `saveEntry` to persist the `hash` provided by the client into the file's frontmatter.
    - *Evidence:* Unit tests in `storage.test.ts` verifying `hash` is saved and retrieved correctly.

- [ ] **Implement Global Hash Calculation:**
    - Add a function `calculateGlobalHash` in `storage.ts`.
    - This function should:
        1. Read all active entries.
        2. Sort them by ID alphabetically.
        3. Concatenate their `hash` values.
        4. Compute a SHA-256 hash of the concatenated string.
    - *Evidence:* Unit tests with a known set of entries verifying the global hash output.

- [ ] **Create Sync Endpoints:**
    - Create a new route file `backend/src/routes/sync.ts`.
    - `GET /sync/status`: Returns the current server-side global hash.
    - `GET /sync/manifest`: Returns a list of all active entries with `{ id, hash, lastUpdated }`.
    - `POST /sync/batch`: Accepts a JSON body with:
        - `updates`: Array of full entry objects (including content and frontmatter) to save.
        - `deletions`: Array of IDs to delete (move to trash).
    - Register these routes in `backend/src/app.ts`.
    - *Evidence:* Integration tests in `backend/src/routes/sync.test.ts` verifying correct responses and side effects (files created/deleted).

## 2. Frontend: PWA Configuration

Enable PWA capabilities using Vite's PWA plugin.

- [ ] **Install & Configure `vite-plugin-pwa`:**
    - Install `vite-plugin-pwa`.
    - Update `frontend/vite.config.ts` to include the PWA plugin.
    - Configure the Web App Manifest (name, short_name, theme_color, icons).
    - Configure `workbox` options:
        - `globPatterns`: `['**/*.{js,css,html,ico,png,svg}']` to cache assets.
        - `runtimeCaching`: Define strategies for API calls (though we will mostly handle data via custom sync logic, caching assets is crucial).
    - *Evidence:* Build the frontend (`npm run build`) and verify `dist/manifest.webmanifest` and service worker files are generated. Run a Lighthouse audit to confirm PWA installability.

## 3. Frontend: Local Storage (IndexedDB)

Implement a robust local storage layer to serve as the single source of truth for the UI.

- [ ] **Implement Database Service:**
    - Install `idb` (a lightweight wrapper for IndexedDB).
    - Create `frontend/src/services/db.ts`.
    - Define a schema with an `entries` object store.
    - Store fields: `id`, `content`, `frontmatter` (title, date), `lastUpdated`, `hash`, `trashed` (boolean), `syncStatus` ('synced', 'pending', 'error').
    - Implement methods: `initDB`, `getAllEntries`, `getEntry`, `saveEntry`, `deleteEntry` (soft delete), `hardDeleteEntry`.
    - *Evidence:* Unit tests for `db.ts` verifying CRUD operations.

## 4. Frontend: Synchronization Logic

Implement the core logic for syncing data between IndexedDB and the Backend.

- [ ] **Implement Hashing Utility:**
    - Create `frontend/src/utils/hash.ts`.
    - Implement `calculateEntryHash(content: string): Promise<string>` using the Web Crypto API (SHA-256).
    - Implement `calculateGlobalHash(entries: Entry[]): Promise<string>`.
    - *Evidence:* Unit tests verifying hash output matches expected SHA-256 values.

- [ ] **Implement Sync Service:**
    - Create `frontend/src/services/sync.ts`.
    - Implement `sync()` function:
        1. **Check Connectivity:** If offline, abort.
        2. **Global Hash Check:** Fetch server global hash. Compare with local global hash (calculated from non-trashed, synced entries).
        3. **Manifest Diff:** If hashes differ, fetch server manifest.
        4. **Resolve:**
            - Identify entries to download (server has newer `lastUpdated`).
            - Identify entries to upload (local has newer `lastUpdated` or is pending).
            - Identify entries to delete (server missing entry that is local & synced, or local is trashed).
        5. **Batch Update:** Send uploads/deletes to `POST /sync/batch`.
        6. **Download:** Fetch full content for outdated local entries.
    - Implement `Background Sync` registration (if supported) to trigger `sync()` on connectivity restoration.
    - *Evidence:* Unit tests mocking the API and DB to verify sync logic flows (e.g., conflict resolution favors `lastUpdated`).

## 5. Frontend: UI Updates & Integration

Update the user interface to reflect the PWA status and integrate the new storage/sync layer.

- [ ] **Update Store/State Management:**
    - Update the existing Vue store or composables (e.g., `useJournal`) to read/write from `db.ts` instead of calling API directly.
    - Ensure `saveEntry` calculates the hash and updates the local DB.
    - Trigger `sync()` after local saves and periodically (every 5 mins).

- [ ] **Header & Sync Status:**
    - Update `frontend/src/App.vue` (or main layout) to include a Header.
    - Add indicators:
        - **Online/Offline:** Listen to `window.addEventListener('online'/'offline')`.
        - **Syncing:** Show a spinner or text when `sync()` is running.
    - Add a link to the Settings page.

- [ ] **Settings Page:**
    - Create `frontend/src/views/Settings.vue`.
    - Add "Sync Now" button.
    - Display "Last Sync Time".
    - Display "Storage Used" (using `navigator.storage.estimate()`).
    - Add route `/settings` in `frontend/src/router/index.ts`.

- [ ] **Entry List & Editor:**
    - Update `EntryList.vue` to show a loading state if empty and syncing.
    - Ensure `EntryEditor` saves work offline and queues it for sync.

## 6. Testing & Verification

- [ ] **E2E Testing:**
    - Create `frontend/e2e/pwa.spec.ts`.
    - Test offline capability:
        1. Load app.
        2. Go offline (simulate network).
        3. Create entry.
        4. Go online.
        5. Verify entry is synced to backend.
    - Test conflict resolution:
        1. Create entry on client A.
        2. Update entry on client B (newer timestamp).
        3. Sync client A.
        4. Verify client A gets client B's version.

- [ ] **Manual Verification:**
    - Verify "Add to Home Screen" works on Android/Mobile.
    - Verify app works when the backend is stopped (Offline mode).
