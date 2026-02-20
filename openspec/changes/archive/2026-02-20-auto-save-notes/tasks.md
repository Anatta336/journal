## 1. Remove manual save infrastructure

- [x] 1.1 Delete the `hasUnsavedChanges` ref and `checkUnsavedChanges()` function from `EntryEditorPage.vue`
- [x] 1.2 Delete the `isSaveDisabled` computed property
- [x] 1.3 Remove the `onBeforeRouteLeave` guard that shows a confirmation dialog
- [x] 1.4 Remove the `handleBeforeUnload` function and its `addEventListener`/`removeEventListener` calls
- [x] 1.5 Remove the `saving` ref and `saveMessage` ref (replaced by the new timestamp indicator)

## 2. Add auto-save debounce logic

- [x] 2.1 Add a `debounceTimer` variable (`ReturnType<typeof setTimeout> | null`) in the component script
- [x] 2.2 Add a `scheduleAutoSave()` function that clears any existing timer and sets a new 1000 ms timer calling `save()`
- [x] 2.3 Call `scheduleAutoSave()` at the end of `updateCurrentContent()` (fires on every editor `@update`)
- [x] 2.4 Call `scheduleAutoSave()` at the end of `addTag()` and `removeTag()`
- [x] 2.5 Guard `scheduleAutoSave()`: skip if `currentContent.value.trim()` is empty (new entry, nothing typed)
- [x] 2.6 In `onUnmounted`, clear the debounce timer before the component tears down

## 3. Save on navigation (replace unsaved-changes guard)

- [x] 3.1 Restore `onBeforeRouteLeave` as an async guard that cancels the debounce timer and calls `await save()` before returning
- [x] 3.2 In the route-leave guard, skip the save if on the new-entry page and content is empty, and return immediately

## 4. Save on PWA visibility loss

- [x] 4.1 Add a `handleVisibilityChange()` function that calls `save()` when `document.visibilityState === 'hidden'`
- [x] 4.2 Register `handleVisibilityChange` on `document` in `onMounted` and remove it in `onUnmounted`
- [x] 4.3 Add a `handleBeforeUnload()` function (no `event.preventDefault()`) that calls `save()` as a best-effort fire-and-forget
- [x] 4.4 Register and deregister `handleBeforeUnload` on `window` in `onMounted`/`onUnmounted`

## 5. Last-saved timestamp indicator

- [x] 5.1 Add a `lastSavedAt` ref (`Date | null`, initialised to `null`) and an `isSaving` ref (`boolean`)
- [x] 5.2 Add a `lastSavedText` computed that returns `''` when null, `'Saving…'` when `isSaving`, or `'Last saved HH:MM:SS'` (24 h local time via `toLocaleTimeString`)
- [x] 5.3 Add a `saveError` ref (`boolean`) and set it on catch; clear it on the next successful save
- [x] 5.4 In `save()`: set `isSaving = true` at start, set `lastSavedAt = new Date()` and `isSaving = false` on success, set `saveError = true` and `isSaving = false` on failure
- [x] 5.5 Replace the Save button element in the template with a `<span class="save-indicator">` that renders `lastSavedText`
- [x] 5.6 Add `.save-indicator` CSS: `font-size: 0.75rem`, `opacity: 0.5`, `color: var(--color-text)`; add a `.save-indicator.error` rule using the error colour for the save-failed state

## 6. New-entry auto-save URL update

- [x] 6.1 Confirm that when `save()` runs for a new entry it calls `saveNewEntry()` and then `router.push('/entries/<id>')` — verify this path still works correctly after the refactor (no behaviour change needed, just confirm it's intact)
- [x] 6.2 Add an in-flight guard in `save()`: if `isSaving` is already `true`, return early to prevent concurrent saves on the same new entry

## 7. Clean up template and styles

- [x] 7.1 Remove the `data-testid="save-btn"` button element and any `save-message` span from the template
- [x] 7.2 Delete the `.save-btn`, `.save-btn:hover`, `.save-btn:disabled`, and `.save-message` CSS rules
- [x] 7.3 Add `data-testid="save-indicator"` to the new timestamp span for E2E test access

## 8. Tests

- [x] 8.1 Update any existing Playwright E2E tests that click `[data-testid="save-btn"]` to instead wait for `[data-testid="save-indicator"]` to contain "Last saved"
- [x] 8.2 Update E2E tests that assert a navigation-confirmation dialog to instead assert navigation proceeds without a dialog
- [x] 8.3 Add an E2E test: type in the editor, wait ~1.1 s, assert the save indicator shows "Last saved HH:MM:SS"
- [x] 8.4 Add an E2E test: type in the editor, navigate away immediately, assert no confirmation dialog appears and the entry is persisted
