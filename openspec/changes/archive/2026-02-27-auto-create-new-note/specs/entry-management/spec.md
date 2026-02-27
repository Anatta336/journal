## MODIFIED Requirements

### Requirement: Application routing

The application SHALL define the following client-side routes:

| Route | Behaviour |
|---|---|
| `/` | Redirect to `/entries` |
| `/entries` | Entry list view |
| `/entries/:id` | Edit existing entry |
| `/settings` | Settings page |

#### Scenario: Root redirect
- **WHEN** the user navigates to `/`
- **THEN** they are redirected to `/entries`

---

### Requirement: Create new entry

When the user initiates creating a new entry, the application SHALL immediately create a new entry in local storage and navigate the user directly to `/entries/:id` for that entry. The entry SHALL be created with empty content and no tags. No intermediate `/entries/new` page SHALL exist.

#### Scenario: New entry created immediately on action
- **WHEN** the user clicks the "New Entry" button
- **THEN** a new entry is created immediately in local storage and the user is navigated to `/entries/:id` for the new entry

#### Scenario: Edit page opens ready to type
- **WHEN** the user is navigated to `/entries/:id` for a newly created entry
- **THEN** the editor is focused and ready to accept input without any further user action required

---

## ADDED Requirements

### Requirement: Auto-delete abandoned new entry

When a user navigates away from a newly created entry without having entered any content or tags, the application SHALL silently delete that entry. The deletion SHALL require no confirmation and SHALL produce no visible error to the user. If the deletion fails, the application SHALL allow navigation to proceed and log the error, but SHALL NOT display an error message.

An entry is considered "newly created" if it was created in the current navigation session and the user has not yet saved any content to it. An entry is considered "abandoned and empty" if its content is empty or whitespace-only AND it has no tags at the time of navigation.

#### Scenario: Empty new entry deleted on navigate away
- **WHEN** the user navigates away from a newly created entry
- **AND** the entry has no content (empty or whitespace-only) and no tags
- **THEN** the entry is silently deleted and does not appear in the entry list

#### Scenario: New entry with tags is not deleted on navigate away
- **WHEN** the user navigates away from a newly created entry
- **AND** the entry has no content but has at least one tag
- **THEN** the entry is kept and appears in the entry list

#### Scenario: New entry with content is not deleted on navigate away
- **WHEN** the user navigates away from a newly created entry
- **AND** the entry has non-whitespace content
- **THEN** the entry is kept and appears in the entry list

#### Scenario: Delete failure does not block navigation
- **WHEN** the user navigates away from an abandoned new entry
- **AND** the deletion fails
- **THEN** navigation proceeds and no error message is shown to the user

---

## REMOVED Requirements

### Requirement: Create new entry (old flow)
**Reason**: Replaced by immediate entry creation in the new flow. The `/entries/new` route and save-then-redirect pattern are removed.
**Migration**: The "New Entry" action now creates the entry immediately and navigates to `/entries/:id`. No user-facing migration needed.
