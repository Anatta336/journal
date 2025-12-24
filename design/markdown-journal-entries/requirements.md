# Markdown journal entries

We need a Vue 3 TypeScript frontend with a traditional WYSIWYG editor which supports markdown. Characters that form Markdown styling should be hidden from the user. A headless editor framework (such as Tiptap or ProseMirror) should be used to handle the WYSIWYG-to-Markdown mapping.

For this initial feature, the content doesn't need to be saved anywhere. That will be added later.

It should be implemented using a docker-compose.yml file to define a Node 24 (LTS) service that'll run a Vite build. We'll need everything for standard development of Vue using TypeScript, including support for automated tests using Vitest and Playwright.

We should not use any CSS framework or UI component library. Modern CSS should be written within the Vue components.

There should be a toolbar at the top of the text field that support basic formatting. For example selecting text and clicking the Bold button should make it bold by wrapping the raw text in `**` and our Markdown renderer should display it as bold.

The input should recognise lines starting with `*` as being bullet points and enter a "list mode". For example, pressing enter once while typing an entry in a list will create a new entry in the list (rather than just creating a new line of text). Pressing enter when in an empty list item should exit "list mode".

Apart from bullet points, the user typing characters that might be interpreted as Markdown should instead be immediately escaped. For example if the user types `"we *really* want this"` it should be stored as `"we \*really\* want this"`. When characters are added via the formatting buttons, the appropriate Markdown characters should be added without escaping. While the user is typing in both the code (block) and code (inline) mode, the auto-escaping should be disabled.

There is no separate editor view and display view - it's all just the display view. If the user types a character that needs to be escaped (like `*`) it will be stored as `\*` but they will just see `*` which should be the output of the Markdown renderer.

Format options in the toolbar should include:

- bold
- italic
- code (inline)
- code (block) - generic preformatted block is sufficient
- bullet point list

For now that is all that should be supported.
