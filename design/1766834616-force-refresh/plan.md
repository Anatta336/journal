# Plan: Force Refresh Feature

This plan outlines the implementation of the "Force Refresh" feature, allowing users to reset their local journal data to match the server's state.

## 1. Frontend - Sync Service Updates

We need to implement the core logic for the force refresh operation in `frontend/src/services/sync.ts`.

-   **Implement `forceRefresh` function:**
    -   **Signature:** `export async function forceRefresh(onProgress?: (current: number, total: number) => void): Promise<void>`
    -   **Pre-checks:**
        -   Check if the app is offline (`!navigator.onLine`). Throw an error if so.
        -   Check if a sync is already in progress.
    -   **Execution Flow:**
        1.  Set `isSyncing` to `true` and notify listeners.
        2.  **Fetch Manifest:** Call `getServerManifest()` to get the server's truth.
        3.  **Identify Deletions:**
            -   Get all local entries using `getAllEntriesIncludingTrashed()`.
            -   Identify local IDs that are NOT present in the server manifest.
            -   Hard delete these entries using `hardDeleteEntry()`.
        4.  **Fetch and Overwrite Entries:**
            -   Iterate through the server manifest.
            -   Fetch each entry using `getServerEntry(id)`.
            -   **Concurrency:** Implement a simple concurrency control (e.g., limit to 5 parallel requests) to avoid overwhelming the browser/network.
            -   **Save:** Convert the server entry to `LocalEntry` format (ensure `syncStatus` is 'synced') and save using `saveEntry()`.
            -   **Progress:** Call `onProgress` callback after each successful fetch/save.
        5.  **Finalize:**
            -   Update the global sync state (last sync time, global hash).
            -   Set `isSyncing` to `false` and notify listeners.

## 2. Frontend - Composable Updates

Update `frontend/src/composables/useJournal.ts` to expose the new functionality to components.

-   **Expose `forceRefresh`:**
    -   Create a wrapper around the sync service's `forceRefresh`.
    -   Manage a reactive `refreshProgress` state (e.g., `ref({ current: 0, total: 0 })`).
    -   Pass a callback to the service to update this state.
    -   Reload entries (`loadEntries`) after a successful refresh.
-   **Return values:** Return `forceRefresh` and `refreshProgress` from the composable.

## 3. Frontend - Settings Page UI

Update `frontend/src/views/SettingsPage.vue` to include the UI for this feature.

-   **Add "Force Refresh" Section:**
    -   Add a new button "Force Refresh" in the Synchronization section.
    -   **State:** Disable the button if `isSyncing` is true or if the app is offline.
-   **Confirmation Dialog:**
    -   When clicked, show a confirmation dialog (using `window.confirm` or a simple custom modal if preferred, but `window.confirm` meets the requirement for a "confirmation dialog").
    -   Message: Warn about destructive behavior (overwriting local changes, deleting local-only entries).
-   **Progress Feedback:**
    -   Show a progress indicator when the operation is active (e.g., "Refreshing: 23/100").
    -   Disable the button during the operation.
-   **Result Notification:**
    -   Show a success message ("Refresh complete") or error message upon completion.

## 4. Testing

### Unit Tests (`frontend/src/services/sync.spec.ts`)
-   Create a new test file or update existing `sync.test.ts` (if it exists, otherwise create `frontend/tests/unit/services/sync.spec.ts`).
-   **Test Cases:**
    -   **Offline:** Should throw error if offline.
    -   **Deletions:** Verify local entries not in manifest are deleted.
    -   **Updates:** Verify local entries are overwritten with server data.
    -   **Progress:** Verify the progress callback is called with correct values.
    -   **Concurrency:** (Optional) Verify multiple requests are handled correctly.

### E2E Tests (`frontend/e2e/force-refresh.spec.ts`)
-   Create a new E2E test file `frontend/e2e/force-refresh.spec.ts`.
-   **Test Scenarios:**
    -   **Setup:** Seed the server with known entries. Create some local-only entries and modify some synced entries locally.
    -   **Action:** Go to Settings, click Force Refresh, accept confirmation.
    -   **Verification:**
        -   Local-only entries should be gone.
        -   Locally modified entries should be reverted to server state.
        -   Server entries should be present.
        -   Progress indicator should appear (if test runs slow enough to catch it).
        -   Button should be disabled during sync.
