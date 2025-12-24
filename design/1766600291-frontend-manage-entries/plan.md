# Plan - Frontend Manage Entries

Build a frontend that integrates with the backend API to manage journal entries, including listing, creating, editing, and deleting entries.

## 1. Backend: Test Data Isolation

Update the backend to support a `TESTING` environment variable to isolate test data from production data.

- Modify `backend/src/services/storage.ts` to determine the base data directory based on the `TESTING` environment variable.
    - If `process.env.TESTING === 'true'`, use `data-test/entries` instead of `data/entries`.
- Ensure `ensureStorageDirectories` creates the appropriate directories.
- Update `backend/package.json` or test scripts if necessary to ensure `TESTING=true` is set during tests.

**Evidence of completion:**
- Running backend with `TESTING=true` creates and uses `data-test/` directory.
- Unit tests for storage service can be updated to verify this behavior.

## 2. Frontend: Routing and Project Setup

Install and configure `vue-router` to handle navigation between the entry list and editor.

- Install `vue-router`.
- Create `frontend/src/router/index.ts`:
    - `/` -> Redirect to `/entries`.
    - `/entries` -> `EntryList.vue`.
    - `/entries/new` -> `EntryEditorPage.vue` (mode: new).
    - `/entries/:id` -> `EntryEditorPage.vue` (mode: edit).
- Update `frontend/src/main.ts` to use the router.
- Update `frontend/src/App.vue` to replace `<JournalEditor />` with `<router-view />`.
- Add basic layout/navigation if needed (though requirements focus on "Back to List" links).

**Evidence of completion:**
- Navigating to `http://localhost:5173/` redirects to `/entries`.
- Manual navigation to `/entries/new` shows the (initially empty) editor page.

## 3. Frontend: Entry List Page (`/entries`)

Implement the page to list all journal entries.

- Create `frontend/src/views/EntryList.vue`.
- Fetch entries from `GET http://localhost:3013/entries`.
- Sort entries by `creationDate` descending (newest first).
- Format `creationDate` as `DD/Mon/YYYY` (e.g., `03/Jan/2025`) using English 3-letter month abbreviations.
- Display each entry with its formatted date.
- Add a "New Entry" button that navigates to `/entries/new`.
- Add a "Delete" button for each entry:
    - Show a native `confirm()` dialog.
    - On confirmation, send `DELETE /entries/:id`.
    - On success, remove the entry from the local list.
    - On failure, show a persistent error message near the Delete button.

**Evidence of completion:**
- `EntryList.vue` displays entries in the correct order and date format.
- Deleting an entry removes it from the list after confirmation.
- Error message appears if deletion fails.

## 4. Frontend: Entry Editor Page (`/entries/new` and `/entries/:id`)

Implement a unified editor page for creating and editing entries.

- Create `frontend/src/views/EntryEditorPage.vue`.
- Integrate `JournalEditor.vue`.
- **New Entry Mode (`/entries/new`):**
    - "Save" button: Disabled if content is empty or whitespace-only.
    - "Back to List" link: Navigates to `/entries`.
    - On Save: `POST /entries`, then redirect to `/entries/:id` using the returned ID.
- **Edit Entry Mode (`/entries/:id`):**
    - Fetch entry content on mount: `GET /entries/:id`.
    - "Save" button: Disabled if no changes have been made OR content is empty/whitespace-only.
    - "Back to List" link: Navigates to `/entries`.
    - On Save: `PUT /entries/:id`.
    - On Success: Show "Saved" message for 3 seconds below the Save button.
    - On Failure: Show persistent error message below the Save button.

**Evidence of completion:**
- Creating a new entry redirects to the edit page.
- Editing an entry saves changes and shows the "Saved" message.
- Save button is correctly enabled/disabled based on content and changes.

## 5. Frontend: Unsaved Changes Warning

Prevent users from accidentally losing unsaved work.

- In `EntryEditorPage.vue`, track if there are unsaved changes.
- Use `onBeforeRouteLeave` (Vue Router) to show a confirmation dialog if the user navigates away within the app.
- Use the `beforeunload` window event to warn the user if they try to refresh or close the tab.

**Evidence of completion:**
- Attempting to navigate away from a modified entry triggers a warning.
- Refreshing the page with unsaved changes triggers a browser warning.

## 6. E2E Testing

Add Playwright tests to ensure all requirements are met and remain functional.

- Create `frontend/e2e/manage-entries.spec.ts`.
- Implement tests for:
    - **Listing:** Verify entries are displayed, sorted correctly, and dates are formatted.
    - **Creation:** Create a new entry, verify redirect, and check it appears in the list.
    - **Editing:** Modify an entry, save it, verify the "Saved" message, and check persistence.
    - **Validation:** Verify Save button states (disabled for empty/no changes).
    - **Deletion:** Delete an entry with confirmation and verify it's gone.
    - **Unsaved Changes:** Verify the warning appears when navigating away with changes.
- Ensure tests use `TESTING=true` for the backend and clean up test data.

**Evidence of completion:**
- `npm run test:e2e` passes all tests.
