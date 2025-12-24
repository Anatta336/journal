# Plan - Storing Journal Entries

This plan outlines the implementation of a Fastify-based backend to store and manage journal entries as Markdown files with YAML frontmatter.

## 1. Backend Project Initialization

Create the `backend` directory and set up a TypeScript project.

- Create `backend/package.json` with necessary dependencies:
    - `fastify`
    - `@fastify/cors`
    - `gray-matter` (for YAML frontmatter parsing)
    - `uuid`
    - `zod` (for request validation)
- Create `backend/tsconfig.json` following project standards (4 spaces, etc.).
- Set up a basic Fastify server in `backend/src/index.ts`.
- Add scripts to `package.json` for development (`tsx` or `nodemon`) and building.

**Evidence of completion:**
- Running `npm run dev` in the `backend` directory starts a server on a designated port (e.g., 3013).
- A simple "health check" endpoint returns 200 OK.

## 2. Storage Layer Implementation

Implement a service to manage file-based storage in `data/entries`.

- Ensure `data/entries` and `data/entries/.trash` exist on startup.
- Implement functions to:
    - Read all `.md` files and parse frontmatter.
    - Generate a UUID for new entries.
    - Write files with YAML frontmatter (using `gray-matter`).
    - Handle date logic:
        - Set `creationDate` on creation.
        - Update `lastUpdated` on every save.
        - Fallback to file system creation time if `creationDate` is missing in existing files.
    - Implement soft-delete by moving files to `.trash`.
- Add comments for future file locking implementation.

**Evidence of completion:**
- Unit tests for the storage service that verify:
    - File creation with correct UUID and frontmatter.
    - Correct parsing of existing files.
    - Soft-delete moves the file to the `.trash` folder.
    - Dates are correctly formatted as ISO 8601.

## 3. API Endpoints

Expose the REST API for journal entries.

- `GET /entries`:
    - List all entries.
    - Include frontmatter and a 30-character preview of the content.
    - Sort by `creationDate` descending.
- `POST /entries`:
    - Accept markdown content.
    - Create a new file and return the generated entry (including ID and metadata).
- `GET /entries/:id`:
    - Return the full content and metadata of a specific entry.
    - Return 404 if not found.
- `PUT /entries/:id`:
    - Update the content of an existing entry.
    - Update `lastUpdated` in frontmatter.
    - Return 404 if not found.
- `DELETE /entries/:id`:
    - Soft-delete the entry.
    - Return 204 No Content on success, 404 if not found.

**Evidence of completion:**
- Integration tests using `fastify.inject()` for each endpoint.
- Tests should cover success cases and error cases (404 for missing entries, 400 for invalid data).

## 4. CORS and Integration

Configure the backend to allow requests from the frontend.

- Enable `@fastify/cors` with the frontend's URL (typically `http://localhost:5173`).
- Update `AGENTS.md` with backend information and run instructions.

**Evidence of completion:**
- A simple `fetch` call from the frontend console to the backend `GET /entries` endpoint succeeds without CORS errors.
