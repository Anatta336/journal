## Context

All save logic lives in `frontend/src/views/EntryEditorPage.vue`. It has:
- A `save()` function that writes to IndexedDB via `saveNewEntry` / `saveExistingEntry`
- A manual Save button bound to `save()`
- An `onBeforeRouteLeave` guard that prompts the user if `hasUnsavedChanges`
- A `beforeunload` listener that triggers the browser warning if `hasUnsavedChanges`

The editor fires an `@update` event on every Tiptap transaction, which calls
`updateCurrentContent()`. That is the hook point for debounced auto-save.

Tags are also part of the saved payload. Tag changes (add/remove) call `checkUnsavedChanges()`
but do not fire `@update`, so they need their own auto-save trigger.

## Goals / Non-Goals

**Goals:**
- Auto-save content and tags to IndexedDB with ~1 s debounce after the last change
- Save immediately when the user navigates away from the editor (route change)
- Save immediately when the PWA loses visibility (`visibilitychange → hidden`) or
  `beforeunload` fires, covering tab close and app switching on mobile
- Replace the Save button with a "Last saved HH:MM:SS" timestamp in faded text
- Remove the unsaved-changes navigation prompt and `beforeunload` browser warning

**Non-Goals:**
- Server sync — auto-save writes to IndexedDB only; the existing sync cycle is unchanged
- Conflict resolution — single-user app, no concurrent editors
- Offline queue changes — `syncStatus` handling is already correct in the existing save path
- Undo/redo or version history

## Decisions

### Debounce with plain setTimeout

Use a module-level `let debounceTimer: ReturnType<typeof setTimeout> | null` inside the
component. On every content or tag change, clear the existing timer and set a new 1000 ms one.
On component unmount, clear the timer and flush any pending save synchronously.

**Alternative considered**: A lodash `debounce` wrapper. Rejected — adds a dependency for
something trivially reimplemented; the existing codebase has no lodash.

### Save-on-leave via onBeforeRouteLeave (async)

Vue Router's `onBeforeRouteLeave` guard supports async functions. Cancel the debounce timer
and `await save()` before returning `true`. This ensures the current state is persisted before
the route changes, for both new and existing entries.

**Alternative considered**: Show a confirmation if there are pending changes. Rejected — the
whole point is to make saving invisible to the user.

### New-entry auto-save navigates to the created entry's URL

When auto-save fires for a new entry it calls `saveNewEntry()`, gets back an entry with an ID,
and calls `router.push('/entries/<id>')` — identical to the existing manual save path. This
avoids creating duplicate entries from successive auto-saves on the same new-entry page.

An in-flight save flag (`saving`) prevents a second auto-save from starting while the first is
still writing.

### visibilitychange for PWA close/switch

Register a `visibilitychange` listener alongside the existing `beforeunload` listener.
When `document.visibilityState === 'hidden'`, flush the debounce and call `save()`.

`beforeunload` is synchronous — IndexedDB writes cannot be awaited inside it. The
`visibilitychange` event fires slightly earlier and allows async work. For browsers/platforms
that skip `visibilitychange` (rare), the `beforeunload` save is a best-effort fire-and-forget
that may not complete but at least attempts the write.

Remove the `hasUnsavedChanges` check from `beforeunload`; there is nothing left to warn about.

### Last-saved timestamp format: HH:MM:SS (local time)

A `lastSavedAt` ref holds a `Date | null`. Displayed via a computed string using
`toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })`.

While a save is in flight, display "Saving…" instead. On error, display "Save failed" in
the error colour (existing CSS variable). `lastSavedAt` is not persisted across page loads —
it resets to `null` on mount (shown as nothing until the first auto-save completes).

## Risks / Trade-offs

- **New entry, empty content**: Auto-save must not create an empty entry. Guard: only fire
  auto-save if `currentContent.value.trim()` is non-empty. If the user navigates away from a
  blank new-entry page, skip the save entirely.
- **Rapid navigation**: If the user creates a new entry, types, and immediately navigates
  away before auto-save fires, `onBeforeRouteLeave` will save and route to the entries list
  (not to the new entry URL). This is acceptable.
- **visibilitychange reliability on iOS Safari**: iOS may freeze JS before `visibilitychange`
  completes. This is a known platform limitation; no mitigation beyond best-effort.
- **IndexedDB write frequency**: 1 s debounce keeps write frequency acceptable. Typical
  typing produces ~1 write/second at most, identical in cost to the existing manual save.

## Migration Plan

No data migration required. The change is purely frontend. Deploy as a normal frontend build.
Rollback: revert the commit; no DB schema change to undo.
