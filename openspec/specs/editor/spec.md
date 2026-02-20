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

### Requirement: Unsaved-changes guard

The editor page SHALL warn the user before navigating away or closing the tab when there
are unsaved changes in the editor.

#### Scenario: Navigating away with unsaved changes triggers warning
- **WHEN** the user has modified an entry and attempts to navigate to another route
- **THEN** a confirmation dialog is shown asking whether to discard changes

#### Scenario: Closing the tab with unsaved changes triggers browser warning
- **WHEN** the user has modified an entry and attempts to close the tab or refresh
- **THEN** the browser's `beforeunload` warning is triggered
