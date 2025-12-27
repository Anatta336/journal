import { test, expect } from '@playwright/test'

const API_BASE = `http://localhost:${process.env.VITE_BACKEND_PORT || '3014'}`

async function createEntry(content: string): Promise<{ id: string }> {
    const response = await fetch(`${API_BASE}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
    })
    return response.json()
}

async function deleteEntry(id: string): Promise<void> {
    await fetch(`${API_BASE}/entries/${id}`, { method: 'DELETE' })
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

async function clearIndexedDB(page: import('@playwright/test').Page): Promise<void> {
    await page.evaluate(async () => {
        const databases = await indexedDB.databases()
        for (const db of databases) {
            if (db.name) {
                await new Promise<void>((resolve) => {
                    const request = indexedDB.deleteDatabase(db.name!)
                    request.onsuccess = () => resolve()
                    request.onerror = () => resolve()
                    request.onblocked = () => resolve()
                })
            }
        }
    })
}

test.describe('Markdown Escaping', () => {
    test.beforeEach(async ({ page }) => {
        // Delete all entries from backend first
        await deleteAllEntries()
        // Navigate to a page to clear IndexedDB
        await page.goto('/entries')
        await clearIndexedDB(page)
        // Reload to get fresh state
        await page.reload()
        await page.waitForFunction(() => !document.querySelector('[data-testid="sync-status"]')?.textContent?.includes('Syncing'), { timeout: 10000 })
    })

    test.afterAll(async () => {
        await deleteAllEntries()
    })

    test('escaped characters are preserved and displayed correctly', async ({ page }) => {
        // Create a new entry
        await page.goto('/entries/new')

        const editor = page.getByTestId('editor-content')
        await expect(editor).toBeVisible()

        await editor.click()
        // Type a special character that should be escaped
        await page.keyboard.type('Here is a * test *.')

        // Verify it's displayed in the editor
        await expect(editor).toContainText('Here is a * test *.')

        // Save the entry
        await page.getByTestId('save-btn').click()

        // Wait for navigation to the entry page (assuming it redirects to /entries/:id)
        await page.waitForURL(/\/entries\/[a-f0-9-]+/)

        // Verify it's still displayed correctly after saving and reloading
        await expect(editor).toContainText('Here is a * test *.')

        // Check the underlying markdown if possible, or just reload the page
        await page.reload()
        await expect(page.getByTestId('editor-content')).toContainText('Here is a * test *.')
    })

    test('loading an entry with escaped characters displays them correctly', async ({ page }) => {
        // Create entry with escaped markdown via API and then load it
        const entry = await createEntry('Here is a \\* test \\*.')

        // Navigate to the entry - sync will download it
        await page.goto(`/entries/${entry.id}`)

        // Wait for sync to complete
        await page.waitForFunction(() => !document.querySelector('[data-testid="sync-status"]')?.textContent?.includes('Syncing'), { timeout: 10000 })

        // Wait for editor to load
        await expect(page.getByTestId('editor-content')).toBeVisible({ timeout: 15000 })
        await expect(page.getByTestId('editor-content')).toContainText('Here is a * test *.')

        await deleteEntry(entry.id)
    })
})
