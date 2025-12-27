# Frontmatter

Journal entries are stored as Markdown files with YAML frontmatter. The frontmatter contains metadata about the entry.

## Format

Each entry file begins with a YAML frontmatter block delimited by `---`:

```markdown
---
creationDate: '2025-01-15T10:30:00.000Z'
lastUpdated: '2025-01-15T14:22:00.000Z'
hash: a1b2c3d4e5f6...
tags:
  - work
  - project-x
---

This is the entry content in Markdown format.
```

## Fields

### creationDate (required)

The timestamp when the entry was first created, in ISO 8601 format (UTC).

- Set once when the entry is created
- Never modified after creation
- If an existing file lacks this field, the backend uses the file system creation time and writes it to the frontmatter

### lastUpdated (required)

The timestamp when the entry was last modified, in ISO 8601 format (UTC).

- Updated by the client whenever the entry content or tags change
- Used for conflict resolution during synchronization (most recent wins)

### hash (optional)

A SHA-256 hash of the entry's content and metadata. Used for efficient synchronization.

The hash is calculated from:
1. The Markdown content (excluding frontmatter)
2. Normalized metadata (currently just sorted tags, if present)

The hash enables quick detection of changes without comparing full content. See [Sync](sync.md) for how hashes are used.

Implementation details:
- Frontend: [frontend/src/utils/hash.ts](../frontend/src/utils/hash.ts)
- Backend: [backend/src/services/storage.ts](../backend/src/services/storage.ts)

### tags (optional)

An array of tag strings associated with the entry.

Constraints:
- Each tag must be 1-20 characters
- Only alphanumeric characters and hyphens allowed
- Tags are case-insensitive for uniqueness and filtering
- Stored as a native YAML array
- Validated by Zod schemas on the backend

Example:
```yaml
tags:
  - meeting-notes
  - project-alpha
  - 2025
```

## Parsing

The backend uses the `gray-matter` library to parse and serialize frontmatter. Invalid or malformed files are skipped when listing entries.

See [Storage](storage.md) for details on how files are managed on disk.
