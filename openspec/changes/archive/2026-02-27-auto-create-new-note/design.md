## Context

Currently, "New Entry" navigates to `/entries/new`, which uses the same `EntryEditorPage` component as the edit view but detected via `route.name === 'entry-new'`. The entry is not created until the user saves: `saveNewEntry` is called from `EntryEditorPage.save()`, which then redirects to `/entries/:id`. This redirect fires mid-session (after the first auto-save debounce), disrupting editor state.

The `onBeforeRouteLeave` guard already has a partially relevant check: it skips saving when `isNewEntry && content is empty`, but the full abandon-delete behaviour has never been implemented.

The auto-save system (debounce 1s, visibility change, beforeunload) is already in place and works correctly for existing entries. It already guards against saving empty content via `if (currentContent.value.trim() === '') return`.

## Goals / Non-Goals

**Goals:**
- Create the entry immediately when the user clicks "New Entry", before any editing
- Navigate directly to `/entries/:id` — no intermediate `/entries/new` route
- Silently delete a new entry if the user leaves without entering any content or tags
- Remove the `/entries/new` route entirely

**Non-Goals:**
- Changing the auto-save timing or mechanism for existing entries
- Adding undo/redo or trash-recovery for silently deleted new entries
- Changing the backend API or sync protocol

## Decisions

### 1. Entry creation moves to the "New Entry" click handler

**Decision:** `EntryList.vue` creates the entry immediately on button click and navigates to `/entries/${id}?new=1`, rather than navigating to `/entries/new` and deferring creation to first save.

**Rationale:** The creation must happen before navigation so the edit page has a real `id` to work with from the start. Creating in the click handler is the simplest place — no new composable or service abstraction needed.

**Alternative considered:** Create on mount in `EntryEditorPage` when no `id` is present. Rejected because it mixes entry lifecycle logic into a page whose job is editing, and complicates the component's initialisation path.

### 2. "New entry" state communicated via route query parameter `?new=1`

**Decision:** The newly-created entry is navigated to with `?new=1` query param. `EntryEditorPage` reads `route.query.new === '1'` to set an `isNewlyCreated` flag.

**Rationale:** The flag needs to survive a page refresh (the entry is empty in IndexedDB and should still be deleteable on navigate-away). Encoding it in the URL is the simplest durable mechanism, requiring no extra store or IndexedDB field.

**Alternative considered:** A reactive store variable (e.g. `newEntryId`). Rejected because it is lost on page refresh and adds shared mutable state.

**Alternative considered:** An `isNew` flag in the IndexedDB entry schema. Rejected because it requires a schema migration and leaks UI state into the data layer.

### 3. Auto-delete on navigate-away via `onBeforeRouteLeave`

**Decision:** In `EntryEditorPage`, the existing `onBeforeRouteLeave` hook is extended: if `isNewlyCreated` is true, and the entry has no non-whitespace content and no tags at the time of navigation, silently call `removeEntry(entryId)` before allowing navigation.

**Rationale:** This is the correct lifecycle hook for this check. The delete is silent — no confirmation dialog, no error shown on failure (the entry was never "real" to the user).

**Definition of "empty":** content is empty/whitespace-only AND tags array is empty. If the user added tags only (no body text), the entry is kept, as the user has expressed intent.

**Failure handling:** If the delete fails (e.g. offline, IndexedDB error), navigation still proceeds. The orphaned entry is harmless — it will appear in the list but can be deleted normally. Errors are logged to the console only.

### 4. Auto-save does not fire for empty-content new entries

The existing `scheduleAutoSave` guard (`if (currentContent.value.trim() === '') return`) already prevents empty content from being auto-saved. No change needed here.

## Risks / Trade-offs

- **Race: auto-save fires just before navigate-away** → Auto-save only fires if content is non-empty. Empty entries never trigger auto-save. No race.
- **User adds tags, no body, navigates away** → Entry is kept (has tags = not empty). This matches the requirement.
- **Delete fails silently** → Entry is orphaned in the list. Low probability; user can delete manually. Acceptable trade-off given the entry has no content.
- **`/entries/new` bookmarks/links become invalid** → The route is removed. Navigating to it will fall through to a 404 or root redirect depending on router config. This is acceptable; `/entries/new` was never a shareable URL.

## Migration Plan

1. Remove the `/entries/new` route from `router/index.ts`.
2. Update `EntryList.vue`: `navigateToNew()` becomes `async createAndNavigateToNew()`, calling `saveNewEntry('', [])` (or a new `createEmptyEntry()` helper) then `router.push`.
3. Update `EntryEditorPage.vue`:
   - Remove `isNewEntry` computed (based on `route.name === 'entry-new'`).
   - Add `isNewlyCreated` computed from `route.query.new === '1'`.
   - Update `onBeforeRouteLeave` to delete if new+empty.
   - Remove the branch in `save()` that redirects after `saveNewEntry`.
4. `useJournal` / `sync`: expose a way to create an entry with empty content, or pass empty string to the existing `saveNewEntry`. Verify `createEntry('')` is valid end-to-end.
