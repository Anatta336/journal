## Purpose

A tagging system for organising journal entries. Each entry can have zero or more tags.
Tags are managed per-entry in the editor, displayed as badge elements in the entry list,
and used to filter the list. The global set of known tags is derived dynamically from all
entries and cached in IndexedDB — there is no separate tags store.

## Requirements

### Requirement: Tag format and validation

Tags SHALL only contain alphanumeric characters and hyphens, and SHALL be at most 20
characters long. Tags SHALL be case-insensitive for purposes of uniqueness and filtering.
These constraints SHALL be enforced on both the frontend (preventing invalid input) and
the backend (Zod schema validation).

#### Scenario: Invalid characters rejected
- **WHEN** a user attempts to create a tag containing a space, comma, or other non-alphanumeric/hyphen character
- **THEN** the input is rejected and no tag is created

#### Scenario: Exceeding max length rejected
- **WHEN** a user attempts to create a tag longer than 20 characters
- **THEN** the input is rejected

#### Scenario: Backend rejects invalid tags
- **WHEN** a `POST /api/entries` or `PUT /api/entries/:id` request contains a tag violating the format rules
- **THEN** the backend returns a 400 error

---

### Requirement: Tag storage in frontmatter

Entry tags SHALL be stored as a native YAML array in the entry's frontmatter under the
`tags` key. An entry with no tags has no `tags` field (or an empty array).

#### Scenario: Tags persisted in frontmatter
- **GIVEN** an entry saved with tags `["work", "project-x"]`
- **THEN** the corresponding `.md` file contains a `tags` section in its YAML frontmatter

---

### Requirement: Case-insensitive uniqueness and display casing

Tags SHALL be treated as case-insensitive for uniqueness and filtering. For display, the
casing of the first occurrence encountered across all entries SHALL be used. When adding a
tag that matches an existing tag case-insensitively, the existing tag's casing SHALL be
used instead of the newly typed casing.

#### Scenario: Duplicate tag with different casing is normalised
- **GIVEN** an existing tag `Work` across entries
- **WHEN** a user tries to add the tag `work` to an entry
- **THEN** the tag `Work` (original casing) is added instead of `work`

#### Scenario: Entries have unique tags
- **WHEN** a user attempts to add a tag to an entry that already has that tag (case-insensitively)
- **THEN** the duplicate is not added

---

### Requirement: Tag management in entry editor

The entry editor SHALL allow adding and removing tags at the top of the editor page.
A text input SHALL be used for both searching existing tags and typing new ones. Typing in
the input SHALL filter the dropdown of existing tags. Pressing Enter or selecting an option
SHALL add the tag. Selected tags SHALL be shown as badge elements with an "×" removal button.

#### Scenario: Existing tags suggested in dropdown
- **WHEN** the user types in the tag input
- **THEN** matching existing tags are shown in a dropdown

#### Scenario: Create new tag
- **WHEN** the user types a valid tag name that does not match any existing tag
- **THEN** a "Create {tagName}" option is available in the dropdown

#### Scenario: Adding a tag via Enter
- **WHEN** the user types a tag name and presses Enter
- **THEN** the tag is added to the entry and appears as a badge

#### Scenario: Removing a tag
- **WHEN** the user clicks the "×" on a tag badge
- **THEN** the tag is removed from the entry

---

### Requirement: Tags displayed in entry list

Each entry in the entry list SHALL display its tags as small badge-styled elements. A
reasonable number of tags (10–20) SHALL be displayed gracefully using a wrapping flexbox
layout.

#### Scenario: Tags shown as badges
- **WHEN** an entry has tags
- **THEN** each tag is displayed as a small badge next to the entry's content preview

---

### Requirement: Tag-based filtering in entry list

The entry list SHALL provide a Filters panel that allows filtering entries by one or more
tags. Only entries that have ALL selected tags SHALL be shown (AND logic). Selecting no
tags shows all entries.

#### Scenario: Filters panel toggle
- **WHEN** the user clicks the "Filters" button
- **THEN** a scrollable list of all available tags is shown

#### Scenario: Closing the filters panel does not clear selected filters
- **WHEN** the user closes the Filters panel
- **THEN** any previously selected tags remain active as filters

#### Scenario: Filtering applies immediately
- **WHEN** the user selects or deselects a tag in the Filters panel
- **THEN** the entry list updates immediately to show only matching entries

#### Scenario: AND logic for multiple tags
- **GIVEN** the user has selected tags "work" and "alpha"
- **THEN** only entries that have BOTH "work" and "alpha" are shown

#### Scenario: No filters shows all entries
- **WHEN** no tags are selected in the Filters panel
- **THEN** all entries are displayed

#### Scenario: Remove all filters button
- **WHEN** at least one tag filter is active
- **THEN** a "Remove all filters" button is visible above the tag list

#### Scenario: Unselected tags shown with reduced opacity
- **WHEN** the Filters panel is open
- **THEN** tags that are not currently selected are displayed with partial opacity

---

### Requirement: Dynamic global tag list

The global list of all known tags SHALL be derived from all active entries in IndexedDB.
It SHALL be refreshed whenever an entry is created, updated (including changes from sync),
or deleted. There is no persistent global tags store.

#### Scenario: New tag appears globally after creation
- **WHEN** an entry is saved with a new tag
- **THEN** the new tag appears in the global tag list available for filtering and autocomplete

#### Scenario: Tag disappears when last entry using it is deleted
- **WHEN** the only entry using a particular tag is deleted
- **THEN** that tag no longer appears in the global tag list
