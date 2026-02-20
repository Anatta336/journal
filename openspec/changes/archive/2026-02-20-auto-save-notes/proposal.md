## Why

The current explicit Save button creates friction and risk of data loss — users must remember
to save, and a stray navigation or tab close can silently discard work. Auto-save eliminates
both problems for a single-user app where there is no concurrent-edit conflict to manage.

## What Changes

- Notes auto-save to IndexedDB while the user types, debounced so saves don't fire on every
  keystroke (target: ~1 s after the last change).
- A note is always saved when the user navigates away from the editor view.
- A note is saved when the PWA loses visibility (`visibilitychange` to `hidden`) or the page
  receives a `beforeunload` event, covering tab close and app switching on mobile.
- The Save button is removed. In its place, a small faded "Last saved HH:MM:SS" timestamp is
  displayed, updating after each successful save to reassure the user.
- The unsaved-changes navigation guard and `beforeunload` warning are removed, since in-progress
  changes are saved automatically before navigation completes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `editor`: The unsaved-changes guard requirement is removed and replaced with auto-save
  requirements (debounced saves, save-on-blur, save-on-visibility-hidden). The Save button
  requirement is replaced with a "Last saved" timestamp indicator requirement.

## Impact

- **`frontend/src/components/JournalEditor.vue`** — primary change site: debounce logic,
  save-on-blur, `visibilitychange` listener, last-saved timestamp display, removal of Save
  button and unsaved-changes guard.
- **IndexedDB write path** — no schema changes; auto-save reuses the existing entry-update
  call, but will be called more frequently (throttled).
- **No backend changes** — saves go to IndexedDB only; server sync is unchanged.
- **No new dependencies** — debouncing implemented with a plain `setTimeout`/`clearTimeout`
  pattern.
