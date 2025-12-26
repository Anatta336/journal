# Journal

## AGENTS.md

Always keep this `AGENTS.md` file up to date with changes. This file should only contain "big picture" information, with references to files where more specific information is available. Do not put information in `AGENTS.md` that is also available in the code itself, instead give a reference to the file(s) where the information can be found.

When you make any change to the project you should finish by reviewing `AGENTS.md` and referenced files. Make any changes needed to keep them up to date and accurate.

Use the edit file tool to make changes, rather than terminal commands.

## Project Overview

This will be a journal app, used by a single user to manage journal entries in the form of Markdown.

**Core Technologies:**

- **Language:** TypeScript.
- **Frontend:** Vue 3 using TypeScript. No external styling dependencies.
- **Backend:** Fastify using TypeScript.
- **Build:** Vite

## Design Documents

- [Markdown Journal Entries](design/1766595203-markdown-journal-entries/plan.md)
- [Storing Journal Entries](design/1766597348-storing-journal-entries/plan.md)
- [Frontend Manage Entries](design/1766600291-frontend-manage-entries/plan.md)
- [Progressive Web Application](design/1766740185-progressive-web-application/requirements.md)

## Development Guidelines

Assume the dev servers for both frontend and backend are already running. Only start them yourself after you have confirmed they're not running and the relevant ports are free.

### Frontend

- **Run Dev:** `npm run dev --prefix frontend` Starts Vite server with site available at <http://localhost:5173/>
- **Build:** `npm run build --prefix frontend` Compiles to `dist/`
- **Unit Tests:** `npm run test:unit --prefix frontend` Runs Vitest unit tests.
- **E2E Tests:** `npm run test:e2e --prefix frontend` Runs Playwright end-to-end tests.

### Backend

- **Run Dev:** `npm run dev --prefix backend` Starts Fastify server at <http://localhost:3013/>
- **Build:** `npm run build --prefix backend` Compiles TypeScript to `dist/`
- **Unit Tests:** `npm run test --prefix backend` Runs Vitest tests for storage and API.

The backend stores journal entries as Markdown files with YAML frontmatter in `data/entries/`. Deleted entries are moved to `data/entries/.trash/` for manual recovery.

When `TESTING=true` environment variable is set, the backend uses `data-test/entries/` instead for test data isolation. E2E tests are configured to start the backend with this flag.

### PWA and Sync

The frontend is a Progressive Web Application (PWA) with offline support:
- **IndexedDB Storage:** Journal entries are stored locally in the browser using IndexedDB (`frontend/src/services/db.ts`)
- **Synchronization:** Entries sync with the backend using hash-based differential sync (`frontend/src/services/sync.ts`)
- **Sync Protocol:** Uses SHA-256 content hashes for change detection. The backend provides sync endpoints at `/sync/status`, `/sync/manifest`, `/sync/entries/:id`, and `/sync/batch`
- **Service Worker:** Configured via vite-plugin-pwa for offline caching

When possible use the Playwright MCP server to access the site so you can interact with it and test your changes.

Only use comments if they add meaningful information - if a comment repeats what is already apparent from the code itself, remove the comment. Make the code's meaning clear by using descriptive function and variable names.

### Code style

Use 4 spaces for indenting in all types of file. Update the indentation of any existing code that doesn't match this.

### Styling

We are targeting the latest version of Chrome, and should leverage up to date CSS practices.

Avoid creating a global CSS file, instead define CSS as it's needed in Vue components.

Make use of CSS variables to standardise colours, spacing, fonts, etc.

Avoid using media queries unless absolutely necessary, instead prefer flexible layouts (e.g. flexbox, grid) that adapt naturally to different screen sizes. You can use container queries when useful.

### Vue

Make use of components to separate out functionality and keep things as clear as possible.

Always use the `<script setup>` syntax for Vue components with the composition API.

Always used `<style scoped>`.

### Manual testing

Prefer to use Playwright MCP when you can. When using `curl` include `-m 5` to prevent indefinitely waiting for a response.
