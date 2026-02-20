## Purpose

A WYSIWYG editor that lets users write and format journal entries as rich text while storing
the underlying content as Markdown. Users see formatted output at all times — there is no
separate "edit" and "preview" mode. The editor is built on Tiptap (ProseMirror) and lives in
`frontend/src/components/JournalEditor.vue`.

## Requirements

### Requirement: WYSIWYG Markdown editing

The editor SHALL display formatted text to the user while storing content internally as
Markdown. Markdown syntax characters SHALL NOT be visible to the user during normal editing.

#### Scenario: Bold text renders visually
- **WHEN** an entry contains `**bold**` in its Markdown source
- **THEN** the editor displays the word "bold" rendered in bold, not the raw `**` characters

#### Scenario: Loading an entry populates the editor
- **WHEN** an entry's Markdown content is provided to the editor
- **THEN** the editor renders it as formatted rich text

#### Scenario: Retrieving Markdown from the editor
- **WHEN** `getMarkdown()` is called on the editor
- **THEN** it returns the current content serialised as Markdown

---

### Requirement: Formatting toolbar

The editor SHALL provide a toolbar with buttons for the following formatting options:
bold, italic, inline code, code block, and bullet list. Each button SHALL toggle the
corresponding Markdown formatting for the selected text or current cursor position.
Active formatting options SHALL be visually highlighted in the toolbar.

#### Scenario: Applying bold via toolbar
- **WHEN** the user selects text and clicks the Bold toolbar button
- **THEN** the selected text is rendered bold and the underlying Markdown wraps it in `**`

#### Scenario: Applying italic via toolbar
- **WHEN** the user selects text and clicks the Italic toolbar button
- **THEN** the selected text is rendered in italics and the underlying Markdown wraps it in `_`

#### Scenario: Applying inline code via toolbar
- **WHEN** the user selects text and clicks the inline-code toolbar button
- **THEN** the selected text is rendered in a monospace style and the underlying Markdown wraps it in backticks

#### Scenario: Creating a code block via toolbar
- **WHEN** the user clicks the code-block toolbar button
- **THEN** a fenced code block is inserted and the user can type preformatted text inside it

#### Scenario: Active state indication
- **WHEN** the cursor is positioned inside bold text
- **THEN** the Bold toolbar button appears active/highlighted

---

### Requirement: Bullet list behaviour

The editor SHALL support unordered bullet lists. Typing `* ` at the start of a line SHALL
automatically enter list mode. Special Enter-key behaviour SHALL apply while in list mode.

#### Scenario: Entering list mode by typing
- **WHEN** the user types `* ` at the start of a line
- **THEN** the line is converted to a bullet-list item

#### Scenario: Enter creates new list item
- **WHEN** the cursor is in a non-empty bullet-list item and the user presses Enter
- **THEN** a new empty bullet-list item is created on the next line

#### Scenario: Enter on empty item exits list mode
- **WHEN** the cursor is in an empty bullet-list item and the user presses Enter
- **THEN** the empty list item is removed and a regular paragraph is created below

#### Scenario: Markdown serialisation of lists
- **WHEN** the editor contains a bullet list
- **THEN** `getMarkdown()` returns each list item prefixed with `* `

---

### Requirement: Automatic escaping of typed Markdown characters

The editor SHALL automatically escape Markdown special characters (`*`, `_`, `` ` ``, etc.)
when the user types them directly as literal text (i.e. not via the formatting toolbar).
The escaped character SHALL be stored as `\*` etc. in Markdown but displayed as the literal
character to the user. Auto-escaping SHALL be disabled inside inline code and code blocks.

#### Scenario: Typing an asterisk is escaped
- **WHEN** the user types `*` in a regular paragraph
- **THEN** it is stored as `\*` in the Markdown source and displayed as `*` to the user

#### Scenario: Typing inside inline code is not escaped
- **WHEN** the cursor is inside an inline code span and the user types `*`
- **THEN** the `*` is stored as a literal `*` without a backslash

#### Scenario: Typing inside a code block is not escaped
- **WHEN** the cursor is inside a fenced code block and the user types `*`
- **THEN** the `*` is stored as a literal `*` without a backslash

#### Scenario: Toolbar insertions are not escaped
- **WHEN** the user applies bold formatting via the toolbar
- **THEN** the `**` delimiters are stored unescaped in the Markdown source

#### Scenario: Escaped characters round-trip correctly
- **WHEN** an entry containing `we \*really\* want this` is loaded into the editor
- **THEN** the user sees `we *really* want this` (literal asterisks, no bold formatting)

---

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
