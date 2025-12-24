import { test, expect } from '@playwright/test'

const API_BASE = 'http://localhost:3013'

interface EntryResponse {
    id: string
    creationDate: string
    lastUpdated: string
    content: string
}

async function createEntry(content: string): Promise<EntryResponse> {
    const response = await fetch(`${API_BASE}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
    })
    return response.json()
}

async function deleteAllEntries(): Promise<void> {
    const response = await fetch(`${API_BASE}/entries`)
    if (!response.ok) return
    const entries = await response.json()
    if (!Array.isArray(entries)) return
    for (const entry of entries) {
        await fetch(`${API_BASE}/entries/${entry.id}`, { method: 'DELETE' })
    }
}

test.describe.configure({ mode: 'serial' })

test.describe('Manage Entries', () => {
    test.beforeEach(async () => {
        await deleteAllEntries()
    })

    test.afterAll(async () => {
        await deleteAllEntries()
    })

    test.describe('Entry List', () => {
        test('shows empty state when no entries exist', async ({ page }) => {
            await page.goto('/entries')
            await expect(page.getByText('No journal entries yet')).toBeVisible()
        })

        test('displays entries sorted by creation date descending', async ({ page }) => {
            const entry1 = await createEntry('First entry')
            await new Promise(r => setTimeout(r, 50))
            const entry2 = await createEntry('Second entry')
            await new Promise(r => setTimeout(r, 50))
            const entry3 = await createEntry('Third entry')

            await page.goto('/entries')

            const listItems = page.getByTestId('entries-list').locator('li')
            await expect(listItems).toHaveCount(3)

            const dates = await listItems.allTextContents()
            expect(dates[0]).toContain(formatDatePart(entry3.creationDate))
            expect(dates[1]).toContain(formatDatePart(entry2.creationDate))
            expect(dates[2]).toContain(formatDatePart(entry1.creationDate))
        })

        test('formats dates as DD/Mon/YYYY', async ({ page }) => {
            await createEntry('Test entry')

            await page.goto('/entries')

            const dateText = await page.getByTestId('entries-list').locator('li').first().textContent()
            expect(dateText).toMatch(/\d{2}\/[A-Z][a-z]{2}\/\d{4}/)
        })

        test('clicking New Entry navigates to /entries/new', async ({ page }) => {
            await page.goto('/entries')
            await page.getByTestId('new-entry-btn').click()
            await expect(page).toHaveURL('/entries/new')
        })

        test('clicking an entry navigates to edit page', async ({ page }) => {
            const entry = await createEntry('Test entry')

            await page.goto('/entries')
            await page.getByTestId('entries-list').locator('li').first().click()

            await expect(page).toHaveURL(`/entries/${entry.id}`)
        })
    })

    test.describe('Entry Deletion', () => {
        test('shows confirmation dialog before deleting', async ({ page }) => {
            const entry = await createEntry('To be deleted')

            await page.goto('/entries')

            let dialogShown = false
            page.on('dialog', async dialog => {
                dialogShown = true
                expect(dialog.type()).toBe('confirm')
                await dialog.dismiss()
            })

            await page.getByTestId(`delete-btn-${entry.id}`).click()
            expect(dialogShown).toBe(true)

            await expect(page.getByTestId('entries-list').locator('li')).toHaveCount(1)
        })

        test('removes entry from list after confirming deletion', async ({ page }) => {
            const entry = await createEntry('To be deleted')

            await page.goto('/entries')

            page.on('dialog', dialog => dialog.accept())

            await page.getByTestId(`delete-btn-${entry.id}`).click()

            await expect(page.getByText('No journal entries yet')).toBeVisible()
        })
    })

    test.describe('Create New Entry', () => {
        test('Save button is disabled when content is empty', async ({ page }) => {
            await page.goto('/entries/new')
            await expect(page.getByTestId('save-btn')).toBeDisabled()
        })

        test('Save button is disabled when content is whitespace only', async ({ page }) => {
            await page.goto('/entries/new')

            const editor = page.getByTestId('editor-content')
            await editor.click()
            await page.keyboard.type('   ')

            await expect(page.getByTestId('save-btn')).toBeDisabled()
        })

        test('Save button is enabled when content has text', async ({ page }) => {
            await page.goto('/entries/new')

            const editor = page.getByTestId('editor-content')
            await editor.click()
            await page.keyboard.type('My new entry')

            await expect(page.getByTestId('save-btn')).toBeEnabled()
        })

        test('creates entry and redirects to edit page', async ({ page }) => {
            await page.goto('/entries/new')

            const editor = page.getByTestId('editor-content')
            await editor.click()
            await page.keyboard.type('New entry content')

            await page.getByTestId('save-btn').click()

            await expect(page).toHaveURL(/\/entries\/[a-f0-9-]+$/)
        })

        test('new entry appears in the list', async ({ page }) => {
            await page.goto('/entries/new')

            const editor = page.getByTestId('editor-content')
            await editor.click()
            await page.keyboard.type('Brand new entry')

            await page.getByTestId('save-btn').click()
            await page.getByTestId('back-link').click()

            await expect(page.getByTestId('entries-list').locator('li')).toHaveCount(1)
        })
    })

    test.describe('Edit Entry', () => {
        test('loads existing entry content', async ({ page }) => {
            const entry = await createEntry('Existing content here')

            await page.goto(`/entries/${entry.id}`)

            const editor = page.getByTestId('editor-content')
            await expect(editor).toContainText('Existing content here')
        })

        test('Save button is disabled when no changes made', async ({ page }) => {
            const entry = await createEntry('Original content')

            await page.goto(`/entries/${entry.id}`)

            await expect(page.getByTestId('save-btn')).toBeDisabled()
        })

        test('Save button is enabled after making changes', async ({ page }) => {
            const entry = await createEntry('Original content')

            await page.goto(`/entries/${entry.id}`)

            const editor = page.getByTestId('editor-content')
            await editor.click()
            await page.keyboard.press('End')
            await page.keyboard.type(' with additions')

            await expect(page.getByTestId('save-btn')).toBeEnabled()
        })

        test('shows Saved message after successful save', async ({ page }) => {
            const entry = await createEntry('Original content')

            await page.goto(`/entries/${entry.id}`)

            const editor = page.getByTestId('editor-content')
            await editor.click()
            await page.keyboard.press('End')
            await page.keyboard.type(' updated')

            await page.getByTestId('save-btn').click()

            await expect(page.getByTestId('save-success')).toBeVisible()
            await expect(page.getByTestId('save-success')).toHaveText('Saved')
        })

        test('Saved message disappears after 3 seconds', async ({ page }) => {
            const entry = await createEntry('Original content')

            await page.goto(`/entries/${entry.id}`)

            const editor = page.getByTestId('editor-content')
            await editor.click()
            await page.keyboard.press('End')
            await page.keyboard.type(' modified')

            await page.getByTestId('save-btn').click()

            await expect(page.getByTestId('save-success')).toBeVisible()
            await expect(page.getByTestId('save-success')).not.toBeVisible({ timeout: 5000 })
        })

        test('Save button is disabled after saving', async ({ page }) => {
            const entry = await createEntry('Original content')

            await page.goto(`/entries/${entry.id}`)

            const editor = page.getByTestId('editor-content')
            await editor.click()
            await page.keyboard.press('End')
            await page.keyboard.type(' change')

            await page.getByTestId('save-btn').click()

            await expect(page.getByTestId('save-btn')).toBeDisabled()
        })

        test('content persists after save and refresh', async ({ page }) => {
            const entry = await createEntry('Initial text')

            await page.goto(`/entries/${entry.id}`)

            const editor = page.getByTestId('editor-content')
            await editor.click()
            await page.keyboard.press('End')
            await page.keyboard.type(' plus more')

            await page.getByTestId('save-btn').click()
            await expect(page.getByTestId('save-success')).toBeVisible()

            await page.reload()

            await expect(page.getByTestId('editor-content')).toContainText('Initial text plus more')
        })
    })

    test.describe('Unsaved Changes Warning', () => {
        test('warns when navigating away with unsaved changes via router', async ({ page }) => {
            const entry = await createEntry('Original')

            await page.goto(`/entries/${entry.id}`)

            const editor = page.getByTestId('editor-content')
            await editor.click()
            await page.keyboard.type('New text')

            let dialogShown = false
            page.on('dialog', async dialog => {
                dialogShown = true
                expect(dialog.type()).toBe('confirm')
                await dialog.dismiss()
            })

            await page.getByTestId('back-link').click()

            expect(dialogShown).toBe(true)
            await expect(page).toHaveURL(`/entries/${entry.id}`)
        })

        test('allows navigation if user confirms leaving', async ({ page }) => {
            const entry = await createEntry('Original')

            await page.goto(`/entries/${entry.id}`)

            const editor = page.getByTestId('editor-content')
            await editor.click()
            await page.keyboard.type('New text')

            page.on('dialog', dialog => dialog.accept())

            await page.getByTestId('back-link').click()

            await expect(page).toHaveURL('/entries')
        })

        test('no warning when navigating away without changes', async ({ page }) => {
            const entry = await createEntry('Content here')

            await page.goto(`/entries/${entry.id}`)

            let dialogShown = false
            page.on('dialog', async dialog => {
                dialogShown = true
                await dialog.dismiss()
            })

            await page.getByTestId('back-link').click()

            expect(dialogShown).toBe(false)
            await expect(page).toHaveURL('/entries')
        })

        test('no warning after saving changes', async ({ page }) => {
            const entry = await createEntry('Original')

            await page.goto(`/entries/${entry.id}`)

            const editor = page.getByTestId('editor-content')
            await editor.click()
            await page.keyboard.press('End')
            await page.keyboard.type(' added')

            await page.getByTestId('save-btn').click()
            await expect(page.getByTestId('save-success')).toBeVisible()

            let dialogShown = false
            page.on('dialog', async dialog => {
                dialogShown = true
                await dialog.dismiss()
            })

            await page.getByTestId('back-link').click()

            expect(dialogShown).toBe(false)
            await expect(page).toHaveURL('/entries')
        })

        test('warns on new entry page with unsaved content', async ({ page }) => {
            await page.goto('/entries/new')

            const editor = page.getByTestId('editor-content')
            await editor.click()
            await page.keyboard.type('Unsaved new entry')

            let dialogShown = false
            page.on('dialog', async dialog => {
                dialogShown = true
                await dialog.dismiss()
            })

            await page.getByTestId('back-link').click()

            expect(dialogShown).toBe(true)
            await expect(page).toHaveURL('/entries/new')
        })
    })
})

function formatDatePart(isoDate: string): string {
    const date = new Date(isoDate)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return months[date.getMonth()]
}
