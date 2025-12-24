# Storing Journal Entries

Add a backend using **Fastify** and **TypeScript**. This will use the filesystem directly to store journal entries as markdown files in a fixed directory: `data/entries`. The backend should automatically create this directory if it is missing on startup.

The backend should expose a REST API with basic CRUD operations for journal entries.

## Storage and Format

- **File Naming**: Each entry will be stored as a file named with a UUID and a `.md` extension. The backend is responsible for generating the UUID when a new entry is created.
- **Frontmatter**: Each file will include YAML frontmatter delimited by `---`.
- **Metadata**:
    - **Creation Date**: Written into the frontmatter when a new entry is first stored. For existing files without this metadata, the backend should use the file's system creation time and write it into the frontmatter.
    - **Last Updated Date**: A `lastUpdated` date should be stored and updated in the frontmatter whenever an entry is modified.
    - **Date Format**: All dates in the frontmatter must use the **ISO 8601** format.
- **Existing Files**: Any `*.md` file in the `data/entries` directory should be available for access. Files with invalid YAML frontmatter or that are otherwise malformed should be skipped.
- **Concurrency**: Assume sequential access for now. Include comments in the code indicating where file locking should be implemented if needed in the future.

## API Operations

- **List Entries**: Should return the metadata (frontmatter) and a preview of the content (first 30 characters of the markdown body, excluding frontmatter). Results should be sorted by creation date. No title extraction is required at this stage.
- **CRUD**: Standard Create, Read, Update, and Delete operations using standard HTTP status codes for success and errors (e.g., 404 for not found, 400 for malformed requests).
    - **Delete**: Should perform a soft-delete by moving the file to a `.trash` folder within `data/entries`. This is for manual recovery only; no API for restoration is required.

## Configuration and Security

- **CORS**: Enable CORS to allow requests from the frontend.
- **Security**: No authentication is required for the REST API at this stage.
