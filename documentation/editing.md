# Editing

This document describes how the journal entry editor works.

## User Experience

The journal uses a WYSIWYG (What You See Is What You Get) editing approach. Users see formatted text directly as they type - there is no separate "edit mode" and "preview mode". The underlying storage format is Markdown, but users interact with rich text.

### Formatting Options

The editor toolbar provides the following formatting options:

- **Bold** - wraps selected text with `**`
- **Italic** - wraps selected text with `_`
- **Inline code** - wraps selected text with backticks
- **Code block** - creates a fenced code block
- **Bullet list** - creates unordered lists with `*`

### List Behaviour

When typing in a list:
- Starting a line with `*` enters list mode
- Pressing Enter creates a new list item
- Pressing Enter on an empty list item exits list mode

## Technical Implementation

The editor is built using **Tiptap**, a headless rich text editor framework built on ProseMirror. Tiptap handles the bidirectional conversion between the visual representation and Markdown storage.

See [frontend/src/components/JournalEditor.vue](../frontend/src/components/JournalEditor.vue) for the editor component implementation.

### Markdown Character Escaping

A key challenge is handling characters that have special meaning in Markdown (like `*`, `_`, `` ` ``, etc.) when the user types them as literal text rather than formatting.

**The Problem:**
If a user types `we *really* want this`, they likely mean the asterisks as literal characters, not as emphasis markers.

**The Solution:**
The editor automatically escapes Markdown special characters when typed directly. These are stored as escaped sequences (e.g., `\*`) in the Markdown file but displayed as the literal character to the user.

This is implemented via a custom ProseMirror plugin and mark:

- `EscapedChar` mark: Tracks which characters have been escaped
- `MarkdownEscape` extension: A ProseMirror plugin that intercepts typed special characters and applies the escape mark

See [frontend/src/extensions/MarkdownEscape.ts](../frontend/src/extensions/MarkdownEscape.ts) for the implementation.

**Exceptions:**
- Characters typed inside inline code or code blocks are not escaped (escaping is unnecessary there)
- Characters inserted via the formatting toolbar are not escaped (they are intentional formatting)

### Markdown Serialization

When saving, the editor:
1. Traverses the document looking for text with the `escapedChar` mark
2. Prepends `\` to those characters
3. Serializes the result as Markdown

When loading, the editor:
1. Parses the Markdown
2. Detects escaped characters (sequences like `\*`)
3. Applies the `escapedChar` mark to display them as literal characters

## Tags

Entries can have tags attached to them. Tags appear above the editor content and are managed separately from the Markdown content. See [Frontmatter](frontmatter.md) for how tags are stored.

Tags are:
- Case-insensitive for matching and uniqueness
- Limited to alphanumeric characters and hyphens
- Maximum 20 characters
- Stored as a YAML array in frontmatter

The entry list page allows filtering by tags. The filter requires all selected tags to match (AND logic).
