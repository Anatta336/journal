# Technologies

This document describes the core technologies used in the Journal application.

## Language

The entire project is written in **TypeScript**, providing type safety across both frontend and backend.

## Frontend

- **Vue 3** with the Composition API and `<script setup>` syntax
- **Vite** for development server and production builds
- **Vue Router** for client-side routing
- **Tiptap** (built on ProseMirror) for the WYSIWYG markdown editor
- **marked** for rendering markdown
- **idb** library for IndexedDB access

### Testing

- **Vitest** for unit testing
- **Playwright** for end-to-end testing

## Backend

- **Fastify** for the REST API server
- **Zod** for request validation and schema definitions
- **gray-matter** for parsing and serializing YAML frontmatter in markdown files
- **uuid** for generating unique entry identifiers

### Testing

- **Vitest** for unit and integration testing

## Build and Development

Both frontend and backend use Vite for development. The backend compiles TypeScript to JavaScript for production deployment.

### Test Environment

When running tests, the environment variable `TESTING=true` or `NODE_ENV=test` causes the backend to use a separate `data-test/` directory instead of the production `data/` directory. This ensures test data isolation. E2E tests run on separate ports (frontend: 5174, backend: 3014) to avoid conflicts with development servers.

## Related Documentation

- [Editing](editing.md) - Details of the Tiptap-based editor
- [PWA](pwa.md) - Progressive Web Application configuration
- [Storage](storage.md) - Backend file storage details
