## 1. Router

- [x] 1.1 Remove the `/entries/new` route from `frontend/src/router/index.ts`

## 2. Entry List

- [x] 2.1 Make `navigateToNew()` in `EntryList.vue` async and rename it to reflect its new behaviour
- [x] 2.2 Call `saveNewEntry('', undefined)` (from `useJournal`) on click to create an empty entry immediately
- [x] 2.3 Navigate to `/entries/${entry.id}?new=1` after creation

## 3. Entry Editor Page

- [x] 3.1 Replace the `isNewEntry` computed (based on `route.name === 'entry-new'`) with `isNewlyCreated` computed from `route.query.new === '1'`
- [x] 3.2 Remove the `if (isNewEntry.value)` branch from `save()` that calls `saveNewEntry` and redirects — the entry already exists, so always use `saveExistingEntry`
- [x] 3.3 Update the `onBeforeRouteLeave` hook: when `isNewlyCreated` is true and content is empty/whitespace and tags are empty, call `removeEntry(entryId.value)` silently before allowing navigation
- [x] 3.4 Remove the `if (!isNewEntry.value)` guard in `onMounted` — always call `fetchEntry()` since the entry always exists when navigating to `/entries/:id`

## 4. Verify empty entry creation

- [x] 4.1 Confirm that `createEntry` in `frontend/src/services/sync.ts` accepts empty string content without error, and fix if needed

## 5. Testing

- [x] 5.1 Update any E2E tests that navigate to `/entries/new` directly to use the new "New Entry" button flow
- [x] 5.2 Add E2E test: clicking "New Entry" creates an entry and lands on `/entries/:id`
- [x] 5.3 Add E2E test: navigating away from a new entry with no content removes it from the list
- [x] 5.4 Add E2E test: navigating away from a new entry that has tags (but no content) keeps the entry
