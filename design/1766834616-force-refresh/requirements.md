# Force Refresh
In the Settings page, add a **"Force Refresh"** button that performs a full refresh of all journal entries from the server, regardless of local hashes.

Behavior and requirements:

- **Confirmation & destructive behavior:** When clicked, show a confirmation dialog that explicitly warns local unsynced changes will be overwritten and local entries not present on the server will be deleted. The server is treated as the source of truth and Force Refresh is destructive by default.
- **Fetch strategy:** Fetch the server manifest (`/sync/manifest`) and then fetch every entry listed (via `/sync/batch` or `/sync/entries/:id`). Overwrite local copies with the server versions.
- **Deleted entries:** Remove any local entries that are not present on the server manifest (i.e., deletions on server are propagated locally).
- **UI feedback:** Disable the Force Refresh button while the operation runs and when the app is offline. Show a progress indicator (e.g., "Fetched 23/237 entries") updated incrementally, and show a success or failure notification when complete. Consider making the operation cancellable (optional enhancement).
- **Offline behaviour:** The button must be disabled when offline and should surface a message indicating network connectivity is required.
- **Performance:** Use the existing batch endpoint where possible, perform fetches with controlled concurrency, and stream progress to the UI so large data sets do not block the main thread.

Tests and acceptance criteria:

- Add unit tests for the sync service to validate forced refresh behaviour (overwrites, deletions, error handling).
- Add Playwright e2e tests to verify the Settings page contains the button, the confirmation dialog appears, a forced refresh overwrites locally-modified entries, removes server-deleted entries, shows progress, handles errors, and that the button is disabled when offline.
