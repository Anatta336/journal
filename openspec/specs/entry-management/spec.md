## Purpose

Core user-facing workflows for creating, viewing, editing, and deleting journal entries.
This covers the entry list page, the entry editor page, routing, and the frontend API
integration. The primary views are `EntryList.vue` and `EntryEditorPage.vue`, backed by
the `useJournal` composable which reads from and writes to the local IndexedDB store.

## Requirements

### Requirement: Application routing

The application SHALL define the following client-side routes:

| Route | Behaviour |
|---|---|
| `/` | Redirect to `/entries` |
| `/entries` | Entry list view |
| `/entries/:id` | Edit existing entry |
| `/settings` | Settings page |

#### Scenario: Root redirect
- **WHEN** the user navigates to `/`
- **THEN** they are redirected to `/entries`

---

### Requirement: Entry list view

The `/entries` route SHALL display all non-deleted entries sorted by `creationDate`
descending (newest first). Each entry in the list SHALL show its creation date, a
rendered content preview, its tags, and a pending-sync indicator when applicable.

#### Scenario: Entries displayed newest first
- **WHEN** the entry list is rendered
- **THEN** entries are ordered with the most recently created entry at the top

#### Scenario: Creation date formatting
- **WHEN** an entry is displayed in the list
- **THEN** its `creationDate` is formatted as `DD/MMM/YYYY` (e.g. `03/Jan/2025`) in the user's local timezone

#### Scenario: Pending-sync indicator
- **WHEN** an entry has `syncStatus` of `pending`
- **THEN** a visual indicator (●) is shown alongside it in the list

#### Scenario: Loading state during initial sync
- **WHEN** the entry list is empty and a sync is in progress
- **THEN** a loading state is displayed

---

### Requirement: Content preview in entry list

Each entry in the list SHALL show a rendered HTML preview of the first 500 characters of
its Markdown content, with a maximum height limit. If the content overflows the height
limit a gradient fade-out SHALL appear at the bottom of the preview.

#### Scenario: Preview renders Markdown as HTML
- **WHEN** an entry is shown in the list
- **THEN** its preview content is rendered as HTML (bold appears bold, lists appear as lists, etc.)

#### Scenario: Overflow fade-out only shown when content is truncated
- **WHEN** an entry's preview content does not overflow the height limit
- **THEN** no gradient fade-out is shown

#### Scenario: Overflow fade-out shown when content is truncated
- **WHEN** an entry's preview content overflows the height limit
- **THEN** a gradient fade-out appears at the bottom of the preview

---

### Requirement: Create new entry

When the user initiates creating a new entry, the application SHALL immediately create a new entry in local storage and navigate the user directly to `/entries/:id` for that entry. The entry SHALL be created with empty content and no tags. No intermediate `/entries/new` page SHALL exist.

#### Scenario: New entry created immediately on action
- **WHEN** the user clicks the "New Entry" button
- **THEN** a new entry is created immediately in local storage and the user is navigated to `/entries/:id` for the new entry

#### Scenario: Edit page opens ready to type
- **WHEN** the user is navigated to `/entries/:id` for a newly created entry
- **THEN** the editor is focused and ready to accept input without any further user action required

---

### Requirement: Auto-delete abandoned new entry

When a user navigates away from a newly created entry without having entered any content or tags, the application SHALL silently delete that entry. The deletion SHALL require no confirmation and SHALL produce no visible error to the user. If the deletion fails, the application SHALL allow navigation to proceed and log the error, but SHALL NOT display an error message.

An entry is considered "newly created" if it was created in the current navigation session and the user has not yet saved any content to it. An entry is considered "abandoned and empty" if its content is empty or whitespace-only AND it has no tags at the time of navigation.

#### Scenario: Empty new entry deleted on navigate away
- **WHEN** the user navigates away from a newly created entry
- **AND** the entry has no content (empty or whitespace-only) and no tags
- **THEN** the entry is silently deleted and does not appear in the entry list

#### Scenario: New entry with tags is not deleted on navigate away
- **WHEN** the user navigates away from a newly created entry
- **AND** the entry has no content but has at least one tag
- **THEN** the entry is kept and appears in the entry list

#### Scenario: New entry with content is not deleted on navigate away
- **WHEN** the user navigates away from a newly created entry
- **AND** the entry has non-whitespace content
- **THEN** the entry is kept and appears in the entry list

#### Scenario: Delete failure does not block navigation
- **WHEN** the user navigates away from an abandoned new entry
- **AND** the deletion fails
- **THEN** navigation proceeds and no error message is shown to the user

---

### Requirement: Edit existing entry

The `/entries/:id` route SHALL load the entry's content into the Markdown editor and allow
the user to modify and save it. The Save button SHALL be disabled when there are no changes
or when the content is empty/whitespace-only. A temporary "Saved" success message SHALL
appear for 3 seconds after a successful save. A persistent error message SHALL be shown on
a failed save until the next save attempt.

#### Scenario: Entry content loaded into editor
- **WHEN** the user navigates to `/entries/:id`
- **THEN** the editor is pre-populated with the entry's existing Markdown content

#### Scenario: Save button disabled when no changes exist
- **WHEN** the user has not modified the entry
- **THEN** the Save button is disabled

#### Scenario: Save button disabled for empty content
- **WHEN** the user clears the editor content to empty/whitespace
- **THEN** the Save button is disabled

#### Scenario: "Saved" message on success
- **WHEN** the user saves an entry successfully
- **THEN** a "Saved" message appears below the Save button and disappears after 3 seconds

#### Scenario: Persistent error message on failure
- **WHEN** a save attempt fails
- **THEN** a persistent error message is shown below the Save button until the next save attempt

---

### Requirement: Delete entry

The entry list SHALL provide a Delete action for each entry. Clicking Delete SHALL show a
native `confirm()` dialog before proceeding. On successful deletion the entry SHALL be
removed from the list. On failure a persistent error message SHALL appear near the Delete
button for that entry.

#### Scenario: Confirmation required before deletion
- **WHEN** the user clicks the Delete button for an entry
- **THEN** a native confirmation dialog is shown before any deletion occurs

#### Scenario: Entry removed from list after successful deletion
- **WHEN** the user confirms deletion
- **THEN** the entry is removed from the entry list view

#### Scenario: Error message shown on deletion failure
- **WHEN** the deletion request fails
- **THEN** a persistent error message is displayed near the Delete button for that entry
