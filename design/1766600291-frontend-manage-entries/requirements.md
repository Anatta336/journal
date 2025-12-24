# Frontend Manage Entries
Build a frontend that integrates with the backend API to manage journal entries.

Add routes on the frontend and behaviour details:

- `/` - Redirect to `/entries`.

- `/entries` - List all journal entries on a single-page list (no pagination or search for now). For each entry show the **creation date only** formatted in a human-friendly `DD/Mon/YYYY` format (e.g., `13/Dec/2025`). Do not display the backend `preview` field.
  - **Actions:**
    - **New Entry:** Button to navigate to `/entries/new`.
    - **View/Edit:** Navigates to `/entries/:id`.
    - **Delete:** Show a native `confirm()` confirmation dialog before sending the request. On success remove the entry from the list. No success message is required. On failure show a persistent error message as close as possible to the Delete button for that entry.
  - **Sorting:** Entries should be shown newest-first (creationDate descending).

- `/entries/new` - Form to create a new journal entry. The page shows the markdown editor, a **Save** button, and a **Back to List** link. The Save button is disabled when the content is empty. Treat whitespace-only content as empty (trim before validating). On save, POST to `/entries`, then redirect to the newly-created entry's edit page at `/entries/:id` using the returned `id` from the API.

- `/entries/:id` - View/edit a single journal entry. Entries are always displayed in the markdown editor with no separate read-only view. The editor should be editable immediately and include a **Save** button that issues `PUT /entries/:id` and a **Back to List** link. The Save button should be disabled when there are no changes or when the content is empty (after trimming). On successful save show a temporary success message with the copy **"Saved"** below the Save button for **3 seconds**. On failure show an error message below the Save button that persists until the next save attempt.
  - **Unsaved changes:** If there are unsaved edits, warn users when they attempt to navigate away from either `/entries/new` or `/entries/:id` (including internal route changes and browser-level events like closing the tab or refreshing).

Testing:
- Add Playwright E2E tests under `frontend/e2e/` to cover the main user flows: listing entries, creating a new entry and redirecting to edit, editing and saving an entry (including disabled Save when no changes and showing success/error messages), and deleting an entry with confirmation.
- Use the Playwright MCP server for tests per project guidelines. Tests should manage their own test data (create/cleanup entries via the API).
- To support test data isolation, the backend should accept a test flag (the `TESTING` environment variable) which causes it to operate on a separate `./data-test/` directory instead of `./data` during tests.

Notes / Formatting:
- Date formatting: Use `DD/Mon/YYYY` with zero-padded day (e.g., `03/Jan/2025`), English 3-letter month abbreviations, and display times in the user's local timezone (entries remain stored in UTC on the backend).
- The backend API already enforces non-empty content for create/update requests; the frontend should additionally trim and prevent whitespace-only submissions by disabling the Save button.
- Use the backend endpoints described in the project backend routes for implementation and tests.
