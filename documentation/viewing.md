# Viewing Entries

This document describes how journal entries are displayed and managed in the list view.

## User Experience

The entry list is the primary way users navigate their journal. It provides a high-level overview of all entries, allowing for quick scanning and filtering.

### Entry List

The list displays entries in reverse chronological order (newest first). Each entry in the list shows:
- **Creation Date**: Formatted as DD/MMM/YYYY.
- **Content Preview**: A rendered HTML preview of the first 500 characters of the entry.
- **Tags**: Any tags associated with the entry.
- **Sync Status**: A visual indicator (●) if the entry has pending changes that haven't been synced to the server.

### Content Previews

To help users identify entries without opening them, the list view shows a preview of the entry's content.

**Design Decisions:**
- **Rendered HTML**: The preview is rendered as HTML from the underlying Markdown. This ensures that formatting like bold, italics, and lists are visible in the preview, providing a more accurate representation of the entry.
- **Height Limit**: Previews are limited to a maximum height to keep the list compact and readable.
- **Fade-out Effect**: If an entry's content exceeds the height limit, a gradient fade-out effect is applied at the bottom. This visually indicates that there is more content to read. This only appears if the content actually overflows the height limit. Short entries are displayed in full without any gradient.

### Filtering

Users can filter the entry list by tags to find specific notes.

## Technical Implementation

### Entry Preview Component

The preview is handled by the `EntryPreview` component ([frontend/src/components/EntryPreview.vue](../frontend/src/components/EntryPreview.vue)).

- **Markdown Rendering**: Uses the `marked` library to convert Markdown to HTML.
- **Overflow Detection**: Uses a `ref` to the container element and compares `scrollHeight` with `clientHeight` to determine if the content is truncated.
- **Scoped Styling**: Uses CSS `:deep()` selectors to style the rendered HTML content (paragraphs, headings, lists) within the preview container.

### Entry List View

The main list view is implemented in `EntryList.vue` ([frontend/src/views/EntryList.vue](../frontend/src/views/EntryList.vue)). It manages the overall layout, filtering logic, and deletion of entries.
