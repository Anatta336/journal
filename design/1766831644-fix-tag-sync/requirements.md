# Fix Tag Sync
When a entry is edited and the only change is to the tags, the sync process doesn't detect a change.

This is because the tags are stored in the YAML frontmatter, but the sync process only looks at the content portion of the Markdown file when calculating the hash.

To fix, include the tags of the frontmatter (not the entire frontmatter) when calculating the hash of an entry.

## Hashing Strategy
- The hash should be calculated by concatenating the content with a JSON-stringified version of the tags (sorted alphabetically). For example: `content + JSON.stringify(tags.sort())`.
- This ensures that the order of tags doesn't matter and that there's a clear boundary between content and tags.
- An entry with no tags should be treated the same as an entry with an empty tags array.

## Extensibility
- Build this so that it's easy to extend the code in the future to include other frontmatter fields if needed.
- The `calculateEntryHash` function should be updated to accept an object containing the content and an optional metadata object.
- The function should iterate over a predefined list of "hashable" metadata fields, sort them, and include them in the hash calculation.

## Impact
- A full re-sync of all data is acceptable when the hashing algorithm changes.
