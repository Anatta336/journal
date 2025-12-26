# Implementation Plan - Tags

This plan outlines the steps to implement the tagging system for journal entries.

## 1. Backend Implementation

### 1.1 Update Storage Service
- **File:** `backend/src/services/storage.ts`
- **Action:**
    - Update `Entry` and `EntryMetadata` interfaces to include `tags?: string[]`.
    - Update `saveEntryToFile` to accept `tags` and write them to the frontmatter.
    - Update `getEntry` to read `tags` from frontmatter.
    - Update `createEntry`, `updateEntry`, and `saveEntry` to accept and pass `tags`.
    - Ensure `tags` are stored as a native YAML array.

### 1.2 Update API Routes
- **File:** `backend/src/routes/entries.ts`
- **Action:**
    - Update `entryContentSchema` to include `tags: z.array(z.string()).optional()`.
    - Update POST `/` and PUT `/:id` handlers to extract `tags` from the body and pass them to storage functions.
- **File:** `backend/src/routes/sync.ts`
- **Action:**
    - Update `entrySchema` to include `tags: z.array(z.string()).optional()`.

### 1.3 Backend Testing
- **File:** `backend/src/services/storage.test.ts`
- **Action:** Add tests for creating and retrieving entries with tags.
- **File:** `backend/src/routes/entries.test.ts`
- **Action:** Add tests for API endpoints with tags.
- **Verification:** Run `npm run test --prefix backend`.

## 2. Frontend Data Layer

### 2.1 Update Data Models
- **File:** `frontend/src/services/db.ts`
- **Action:** Update `LocalEntry` interface to include `tags?: string[]`.
- **File:** `frontend/src/services/sync.ts`
- **Action:** Update `ServerEntry` interface to include `tags?: string[]`.

### 2.2 Update Composables
- **File:** `frontend/src/composables/useJournal.ts`
- **Action:**
    - Update `EntryPreview` interface to include `tags?: string[]`.
    - Update `saveNewEntry` and `saveExistingEntry` to accept `tags` as an argument.
    - Update `entryPreviews` computed property to map tags from `LocalEntry`.

## 3. Frontend UI - Entry List

### 3.1 Filter Logic and UI
- **File:** `frontend/src/views/EntryList.vue`
- **Action:**
    - Compute `allTags` from `entryPreviews` (case-insensitive unique, preserving first casing).
    - Add state for `selectedTags`.
    - Implement a computed property `filteredEntries` that filters `entryPreviews` based on `selectedTags`.
    - Add UI for the filter section:
        - "Filters" button to toggle visibility.
        - List of available tags (selectable).
        - "Remove all filters" button.
    - Display tags on each entry card in the list.

## 4. Frontend UI - Entry Editor

### 4.1 Tag Management UI
- **File:** `frontend/src/views/EntryEditorPage.vue`
- **Action:**
    - Add state for `tags` (current entry's tags).
    - Load tags when fetching an entry.
    - Ensure all existing tags are loaded (via `useJournal`) to support autocomplete and casing enforcement.
    - Pass `tags` to `saveNewEntry` and `saveExistingEntry`.
    - Implement tag input and management UI:
        - Text input for searching/creating tags.
        - Dropdown for autocomplete.
        - Logic to enforce alphanumeric + hyphens, max 20 chars.
        - Logic to prevent duplicates (case-insensitive).
        - Logic to use existing casing for new tags if a match exists.
        - Display selected tags as badges with remove option.

## 5. Testing

### 5.1 E2E Testing
- **File:** `frontend/e2e/tags.spec.ts` (New File)
- **Action:** Create a new test file to verify:
    - Creating an entry with tags.
    - Editing an entry to add/remove tags.
    - Filtering entries by tags.
    - Tag validation (invalid characters, duplicates).
    - Persistence of tags after reload/sync.
- **Verification:** Run `npm run test:e2e --prefix frontend`.
