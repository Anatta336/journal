## REMOVED Requirements

### Requirement: Unsaved-changes guard

**Reason**: Auto-save ensures content is persisted before navigation or tab close, making
an unsaved-changes prompt unnecessary and disruptive.

**Migration**: Remove the `onBeforeRouteLeave` confirmation dialog and the `beforeunload`
browser warning. Replace with an immediate save-and-proceed behaviour (see ADDED requirements).

---

## ADDED Requirements

### Requirement: Auto-save while editing

The editor page SHALL automatically save the current entry to IndexedDB approximately 1 second
after the user stops making changes. Auto-save SHALL apply to both content changes (typed text,
formatting) and tag changes (adding or removing tags). Auto-save SHALL NOT fire if the current
content is empty.

#### Scenario: Content change triggers debounced save

- **WHEN** the user types or applies formatting in the editor
- **THEN** the entry is saved to IndexedDB no more than 1100 ms after the last change,
  without any explicit user action

#### Scenario: Tag change triggers debounced save

- **WHEN** the user adds or removes a tag
- **THEN** the entry is saved to IndexedDB no more than 1100 ms after the tag change

#### Scenario: Empty new entry is not auto-saved

- **WHEN** the user is on the new-entry page and the editor content is empty
- **THEN** no save is performed

#### Scenario: Rapid typing does not cause excessive saves

- **WHEN** the user types continuously for several seconds
- **THEN** the entry is saved at most once per second (debounced, not on every keystroke)

---

### Requirement: Save on navigation

The editor page SHALL save the current entry immediately when the user navigates away from
the editor route. If the entry is new and content is empty, navigation SHALL proceed without
saving. After a save-on-navigation the entry SHALL be fully persisted before the route changes.

#### Scenario: Navigate away from existing entry saves first

- **WHEN** the user navigates to another route while an existing entry has unsaved changes
  (debounce pending)
- **THEN** the entry is saved to IndexedDB and navigation proceeds without a confirmation prompt

#### Scenario: Navigate away from new entry with content saves and continues

- **WHEN** the user navigates away from the new-entry page while the editor contains content
- **THEN** the entry is saved to IndexedDB and navigation proceeds to the intended destination

#### Scenario: Navigate away from blank new entry skips save

- **WHEN** the user navigates away from the new-entry page while the editor is empty
- **THEN** no entry is created and navigation proceeds immediately

---

### Requirement: Save on PWA visibility loss

The editor page SHALL attempt to save the current entry when the page transitions to a hidden
visibility state (`document.visibilityState === 'hidden'`), covering PWA app-switching and
tab backgrounding on mobile. A best-effort save SHALL also be attempted on `beforeunload`.

#### Scenario: Switching away from PWA triggers save

- **WHEN** the user switches to another app or backgrounds the PWA while the editor has
  pending changes
- **THEN** the entry is saved to IndexedDB before or immediately after the visibility change

#### Scenario: Closing the tab triggers save attempt

- **WHEN** the user closes the browser tab while the editor has pending changes
- **THEN** a save is attempted (best-effort; completion is not guaranteed by the platform)

---

### Requirement: Last-saved timestamp indicator

The editor page SHALL display a "Last saved HH:MM:SS" indicator in small, faded text in place
of the Save button. The time SHALL reflect when the most recent successful auto-save completed,
in local 24-hour time. While a save is in progress the indicator SHALL show "Saving…". If a
save fails the indicator SHALL show "Save failed" using the error colour. The indicator SHALL
show nothing (empty) until the first save of the current session completes.

#### Scenario: Indicator updates after successful save

- **WHEN** an auto-save completes successfully
- **THEN** the indicator displays "Last saved HH:MM:SS" with the current local time

#### Scenario: Indicator shows saving state during write

- **WHEN** a save is in progress
- **THEN** the indicator displays "Saving…"

#### Scenario: Indicator shows error on failure

- **WHEN** a save attempt fails (e.g. IndexedDB write error)
- **THEN** the indicator displays "Save failed" in the error colour

#### Scenario: Indicator is empty on initial load

- **WHEN** the editor page first loads before any auto-save has occurred
- **THEN** the indicator area is empty (no timestamp shown)
