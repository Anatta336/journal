# Implementation Plan: Markdown Journal Entries

This plan outlines the implementation of a Vue 3 TypeScript WYSIWYG markdown editor for journal entries.

## 1. Project Infrastructure Setup

Establish the development environment with Vite.

### Tasks

- Initialize a Vite + Vue 3 + TypeScript project in a `frontend/` directory
- Configure Vitest for unit testing
- Configure Playwright for end-to-end testing
- Add npm scripts: `dev`, `build`, `test:unit`, `test:e2e`

### Evidence of Completion

- `npm run test:unit` executes Vitest and passes with a placeholder test
- `npm run test:e2e` executes Playwright and passes with a placeholder test

---

## 2. Tiptap Editor Integration

Integrate Tiptap as the headless editor framework. Tiptap is chosen over raw ProseMirror because it provides a higher-level Vue 3 integration while still offering full control over markdown handling.

### Tasks

- Install Tiptap core packages:
  - `@tiptap/vue-3` - Vue 3 integration
  - `@tiptap/starter-kit` - Basic extensions (will be customized)
  - `@tiptap/pm` - ProseMirror dependencies
- Create a `JournalEditor.vue` component that initializes the Tiptap editor
- Configure the editor to render markdown styling visually (hiding raw markdown characters)
- Set up content model to store underlying markdown format

### Evidence of Completion

- Unit test: `JournalEditor` component mounts and renders an editable content area
- E2E test: User can type text into the editor and see it displayed

---

## 3. Markdown Storage and Rendering

Configure the editor to maintain markdown as the underlying storage format while displaying styled content.

### Tasks

- Install or create a markdown serializer to convert between Tiptap's document model and markdown
- Consider `@tiptap/extension-markdown` or implement custom serialization
- Implement `getMarkdown()` method to retrieve current content as markdown string
- Ensure the editor displays formatted content (e.g., bold text appears bold, not wrapped in `**`)
- The markdown characters should be hidden from the user in the display

### Evidence of Completion

- Unit test: Setting content with `**bold**` displays styled bold text (not raw characters)
- Unit test: Calling `getMarkdown()` on content with bold text returns `**bold**`
- E2E test: User types text, applies bold formatting, and underlying markdown contains `**`

---

## 4. Formatting Toolbar Component

Build a toolbar with formatting buttons that apply markdown formatting.

### Tasks

- Create `EditorToolbar.vue` component
- Implement toolbar buttons for:
  - **Bold** - wraps selection in `**`
  - **Italic** - wraps selection in `_` or `*`
  - **Code (inline)** - wraps selection in backticks
  - **Code (block)** - creates fenced code block
  - **Bullet list** - creates/toggles bullet list
- Style toolbar using modern CSS within the component (no external framework)
- Wire toolbar actions to Tiptap commands
- Implement active state indication for buttons when cursor is in formatted content

### Evidence of Completion

- Unit test: Each toolbar button triggers the correct Tiptap command
- Unit test: Button active states reflect current cursor position formatting
- E2E test: User selects text, clicks Bold, text appears bold
- E2E test: User clicks Code Block, can type preformatted text

---

## 5. Bullet Point List Mode Behavior

Implement special list mode behavior as specified.

### Tasks

- Configure Tiptap's BulletList extension or create custom extension
- Detect when a line starts with `* ` and automatically convert to list mode
- Implement Enter key behavior in list mode:
  - In non-empty list item: create new list item
  - In empty list item: exit list mode (convert to paragraph)
- Ensure list items are stored as proper markdown (`* item`)

### Evidence of Completion

- Unit test: Typing `* ` at start of line triggers list mode
- Unit test: Pressing Enter in list item with content creates new item
- Unit test: Pressing Enter in empty list item exits list mode
- E2E test: User creates multi-item list, exits by pressing Enter on empty item
- Markdown output correctly contains `* ` prefixed lines

---

## 6. Auto-Escaping of Markdown Characters

Implement automatic escaping of markdown characters when typed directly (not via toolbar).

### Tasks

- Create a Tiptap extension or input rule to intercept special characters
- Characters to escape when typed: `*`, `_`, `` ` ``, `#`, `[`, `]`, etc.
- When user types these characters, store as escaped version (e.g., `\*`)
- Display the unescaped character to the user (markdown renderer shows `*` for `\*`)
- Disable auto-escaping when in code (inline) mode
- Disable auto-escaping when in code (block) mode
- Toolbar formatting should insert unescaped markdown characters

### Evidence of Completion

- Unit test: Typing `*` stores `\*` in markdown, displays `*` to user
- Unit test: Typing `*` while in inline code mode stores literal `*`
- Unit test: Typing `*` while in code block stores literal `*`
- Unit test: Clicking Bold button stores `**` without escaping
- E2E test: User types `we *really* want this`, markdown contains `we \*really\* want this`

---

## 7. Styling and Layout

Apply modern CSS styling to the editor components.

### Tasks

- Style the editor container with appropriate padding, borders, and focus states
- Style the toolbar with button appearance, hover states, active states
- Ensure responsive layout
- Style formatted content (bold, italic, code, lists) appropriately
- Use CSS custom properties for theming flexibility
- All styles should be scoped within Vue components

### Evidence of Completion

- Visual review: Editor has clean, modern appearance
- E2E test: Editor and toolbar render correctly at different viewport sizes
- All styles contained within component `<style>` blocks

---

## 8. Integration Testing

Create comprehensive integration tests to verify all requirements work together.

### Tasks

- E2E test suite covering complete user workflows:
  - Writing a journal entry with mixed formatting
  - Creating and editing bullet lists
  - Typing special characters and verifying they display correctly
  - Using toolbar to format text
- Verify markdown output matches expected format for all scenarios

### Evidence of Completion

- All E2E tests pass
- Test coverage includes each requirement from `requirements.md`

---

## Dependencies Summary

### NPM Packages

- **Vue 3**: Core framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Tiptap**: `@tiptap/vue-3`, `@tiptap/starter-kit`, `@tiptap/pm`
- **Vitest**: Unit testing
- **Playwright**: E2E testing
- **@vue/test-utils**: Vue component testing

---

## File Structure

```
journal/
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── components/
│   │   │   ├── JournalEditor.vue
│   │   │   └── EditorToolbar.vue
│   │   └── extensions/
│   │       └── MarkdownEscape.ts
│   ├── tests/
│   │   └── unit/
│   │       ├── JournalEditor.spec.ts
│   │       └── EditorToolbar.spec.ts
│   └── e2e/
│       └── editor.spec.ts
└── design/
    └── markdown-journal-entries/
        ├── requirements.md
        └── plan.md
```

---

## Implementation Order

1. **Project Infrastructure Setup** - Foundation must be in place first
2. **Tiptap Editor Integration** - Core editor functionality
3. **Markdown Storage and Rendering** - Essential for the WYSIWYG-markdown relationship
4. **Formatting Toolbar Component** - User interface for formatting
5. **Bullet Point List Mode Behavior** - Special list handling
6. **Auto-Escaping of Markdown Characters** - Most complex behavior, builds on previous steps
7. **Styling and Layout** - Polish the interface
8. **Integration Testing** - Verify all requirements are met

Each step should be completed with its associated tests passing before moving to the next step.
