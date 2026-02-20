import { test, expect } from '@playwright/test'

const API_BASE = `http://localhost:${process.env.VITE_BACKEND_PORT || '3014'}`

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

test.describe.configure({ mode: 'serial' })

test.describe('Auto-save', () => {
    test.beforeEach(async ({ page }) => {
        await deleteAllEntries()
        await page.goto('/entries')
        await clearIndexedDB(page)
        await page.reload()
        await page.waitForFunction(
            () => !document.querySelector('[data-testid="sync-status"]')?.textContent?.includes('Syncing'),
            { timeout: 2000 }
        )
    })

    test.afterAll(async () => {
        await deleteAllEntries()
    })

    test('save indicator shows Last saved after typing and waiting ~1.1s', async ({ page }) => {
        await page.goto('/entries/new')

        const editor = page.getByTestId('editor-content')
        await editor.click()
        await page.keyboard.type('Auto-save test entry')

        // Wait for auto-save to fire (debounce 1s + save time) and navigate
        await page.waitForURL(/\/entries\/[a-f0-9-]+$/, { timeout: 5000 })

        // On the edit page the indicator should show Last saved
        await expect(page.getByTestId('save-indicator')).toContainText('Last saved')
    })

    test('navigating away immediately saves entry without a confirmation dialog', async ({ page }) => {
        await page.goto('/entries/new')

        const editor = page.getByTestId('editor-content')
        await editor.click()
        await page.keyboard.type('Navigate-away save test')

        let dialogShown = false
        page.on('dialog', async dialog => {
            dialogShown = true
            await dialog.dismiss()
        })

        // Navigate away immediately before auto-save debounce fires
        await page.getByTestId('back-link').click()

        // Should navigate without any dialog
        expect(dialogShown).toBe(false)
        await expect(page).toHaveURL('/entries')

        // The entry should be persisted — reload the entries list
        await page.reload()
        await page.waitForFunction(
            () => !document.querySelector('[data-testid="sync-status"]')?.textContent?.includes('Syncing'),
            { timeout: 2000 }
        )
        await expect(page.getByTestId('entries-list').locator('li')).toHaveCount(1)
    })
})
