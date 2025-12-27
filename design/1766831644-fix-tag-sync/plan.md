# Plan - Fix Tag Sync

When an entry is edited and only the tags are changed, the sync process currently fails to detect the change because the hash is only calculated based on the entry's content. This plan outlines the steps to include tags (and potentially other frontmatter fields in the future) in the hash calculation.

## 1. Update Backend Hashing Logic

Modify the hashing logic in the backend to include tags.

- **File**: [backend/src/services/storage.ts](backend/src/services/storage.ts)
- **Changes**:
    - Update `calculateEntryHash` to accept an optional `metadata` object (e.g., `{ tags?: string[] }`).
    - Implement the hashing strategy: `content + JSON.stringify(sortedMetadata)`.
    - Ensure that `tags: undefined` and `tags: []` result in the same hash.
    - Sort tags alphabetically before stringifying to ensure consistency.
- **Evidence of Completion**:
    - Add unit tests to [backend/src/services/storage.test.ts](backend/src/services/storage.test.ts) that:
        - Verify the hash changes when tags are added, removed, or modified.
        - Verify the hash is the same for `undefined` tags and an empty tags array.
        - Verify the hash is the same regardless of the order of tags in the input array.

## 2. Update Frontend Hashing Logic

Modify the hashing logic in the frontend to match the backend.

- **File**: [frontend/src/utils/hash.ts](frontend/src/utils/hash.ts)
- **Changes**:
    - Update `calculateEntryHash` to accept an optional `metadata` object.
    - Implement the same logic as the backend: `content + JSON.stringify(sortedMetadata)`.
- **Evidence of Completion**:
    - Create a new test file `frontend/tests/unit/utils/hash.spec.ts` (or update an existing one) to verify the frontend hash calculation matches the expected logic and is consistent with the backend.

## 3. Update Callers of `calculateEntryHash`

Ensure all parts of the application that calculate or update hashes pass the necessary metadata.

- **Backend**:
    - Update `createEntry` and `updateEntry` in [backend/src/services/storage.ts](backend/src/services/storage.ts) to pass `tags` to `calculateEntryHash`.
- **Frontend**:
    - Update [frontend/src/services/sync.ts](frontend/src/services/sync.ts) to pass `tags` when calculating hashes for local entries during sync.
    - Update any other components or services that might calculate hashes (e.g., [frontend/src/services/db.ts](frontend/src/services/db.ts) if it does any local hash generation).
- **Evidence of Completion**:
    - Run existing E2E tests in [frontend/e2e/tags.spec.ts](frontend/e2e/tags.spec.ts) and ensure they pass.
    - Add a new E2E test case that specifically verifies that changing only the tags of an entry triggers a sync to the backend.

## 4. Handle Migration and Re-sync

Since the hashing algorithm is changing, all existing entries will have "incorrect" hashes.

- **Strategy**:
    - The sync process will naturally detect the hash mismatch between the frontend and backend (or between the new logic and stored hashes).
    - As entries are loaded or saved, their hashes will be updated to the new format.
    - A full re-sync is acceptable as per requirements.
- **Evidence of Completion**:
    - Perform a manual sync after applying the changes and verify that entries with tags are correctly identified as needing updates (or simply have their hashes updated in the database).
