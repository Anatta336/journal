## Why

The current `/entries/new` page creates an awkward two-phase flow: the user writes content on one route, saves, then gets redirected to a different route (`/entries/:id`) mid-interaction, interrupting their input and causing jarring UX. Creating the entry immediately on "New Entry" click and navigating straight to the edit page eliminates this transition entirely.

## What Changes

- When the user clicks "New Entry", a new entry is immediately created (with a generated UUID) and the user is navigated directly to `/entries/:id` for that entry.
- The `/entries/new` route and its dedicated "new entry" page are removed.
- The edit page (`/entries/:id`) gains awareness of whether an entry is newly created and empty.
- If the user navigates away from a newly created entry without having entered any content (no text body, no tags), the entry is silently and automatically deleted — as though it was never created.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `entry-management`: The "Create new entry" requirement changes from a dedicated `/entries/new` form-and-save flow to an immediate-creation flow on the `/entries/:id` edit page. The application routing requirement also changes: `/entries/new` is removed. A new silent auto-delete behaviour is introduced for empty new entries on navigation away.

## Impact

- **Routing:** The `/entries/new` route is removed from the Vue Router configuration.
- **Entry list view:** The "New Entry" button/action triggers immediate entry creation and navigation rather than routing to `/entries/new`.
- **Edit page (`EntryEditorPage.vue`):** Must handle the auto-delete-on-abandon behaviour for newly created empty entries.
- **`useJournal` composable / entry creation logic:** Entry creation moves from a save-triggered action to an immediate action at navigation time.
- **No backend or sync protocol changes required.**
