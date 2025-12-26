# Tags
Add a tagging system.

Each entry can have any number of tags (0 or more). There is no hard limit on the number of tags per entry, but the UI should handle a reasonable number (e.g., 10-20) gracefully using a flexbox with wrapping.

Tags are case-insensitive for filtering and uniqueness. For display, use the casing of the first occurrence encountered when scanning entries (the order of scanning does not matter as we expect only one casing to exist for any given tag). If the entry providing the "first" casing is deleted, the display casing for that tag may change to the next encountered occurrence. When creating or editing an entry, prevent creating a new tag if it matches an existing tag's name case-insensitively. If a tag is created that matches an existing tag case-insensitively, the existing tag's casing should be used instead.

Tags only allow alphanumeric characters and hyphens, and are limited to 20 characters. No spaces, commas, or other special characters are allowed. This must be enforced on both the frontend (preventing invalid input) and the backend (validation using Zod).

When adding tags, the user can choose from any existing tag, or create a new tag.

The tags of an entry should be stored as a native YAML array in the entry's frontmatter.

We do not have a separate long-term store of tags. The global list of tags is built and cached on the frontend in IndexedDB. It only needs refreshing when an entry is created, deleted, or its tags are changed (including changes from synchronization). There is no global tag management (renaming or deleting a tag across all entries) for now.

On the main listing page of entries, show the tags each entry has, as a series of small "badge" styled elements.

On the main listing page of entries, allow filtering by tag:
- Show a "Filters" button that, when clicked, shows a full listing of all tags in a scrollable area.
- Unselected tags are shown with partial opacity; selected tags are shown normally.
- Filtering is applied immediately when selecting/deselecting.
- Only show entries that have all of the selected tags. If no tags are selected, show all entries.
- A "Remove all filters" button appears before the list of tags only when filters are active.
- The "Filters" button can be toggled open/closed without affecting active filters.

When creating/editing an entry, allow adding and removing tags at the top:
- Use a single text input for tags that is used for both searching existing tags and creating new ones. Typing into that text box filters the list of existing tags.
- Include an option to create a new tag if it doesn't exist.
- Pressing `Enter` or selecting a "Create {tagName}" option in the list of tags should add the tag.
- If a user types a tag that matches an existing tag case-insensitively, the dropdown should show the existing tag as the match. If the user tries to "create" the tag with different casing, it should instead add the existing tag to the entry.
- Selected tags are shown as "badge" styled elements with an "x" to remove them.
- Each entry must have unique tags (case-insensitively).

