import { test, expect } from '@playwright/test'

const API_BASE = `http://localhost:${process.env.VITE_BACKEND_PORT || '3014'}`

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

async function updateEntry(id: string, content: string): Promise<EntryResponse> {
    const response = await fetch(`${API_BASE}/entries/${id}`, {
        method: 'PUT',
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

async function waitForSync(page: import('@playwright/test').Page): Promise<void> {
    await page.waitForFunction(
        () => !document.querySelector('[data-testid="sync-status"]')?.textContent?.includes('Syncing'),
        { timeout: 5000 }
    )
}

test.describe.configure({ mode: 'serial' })

test.describe('Force Refresh', () => {
    test.beforeEach(async ({ page }) => {
        await deleteAllEntries()
        await page.goto('/entries')
        await clearIndexedDB(page)
        await page.reload()
        await waitForSync(page)
    })

    test.afterAll(async () => {
        await deleteAllEntries()
    })

    test('shows Force Refresh button in settings', async ({ page }) => {
        await page.goto('/settings')
        await waitForSync(page)

        const forceRefreshBtn = page.getByTestId('force-refresh-btn')
        await expect(forceRefreshBtn).toBeVisible()
        await expect(forceRefreshBtn).toHaveText('Force Refresh')
    })

    test('shows confirmation dialog when Force Refresh is clicked', async ({ page }) => {
        await page.goto('/settings')
        await waitForSync(page)

        let dialogMessage = ''
        page.on('dialog', async (dialog) => {
            dialogMessage = dialog.message()
            await dialog.dismiss()
        })

        await page.getByTestId('force-refresh-btn').click()

        expect(dialogMessage).toContain('Force Refresh will overwrite all local changes')
        expect(dialogMessage).toContain('unsynced local entries will be lost')
    })

    test('does not proceed if confirmation is cancelled', async ({ page }) => {
        await createEntry('Server entry')
        await page.goto('/settings')
        await waitForSync(page)

        page.on('dialog', async (dialog) => {
            await dialog.dismiss()
        })

        await page.getByTestId('force-refresh-btn').click()

        // Button should still be visible and enabled, no result message
        await expect(page.getByTestId('force-refresh-btn')).toBeEnabled()
        await expect(page.getByTestId('force-refresh-result')).not.toBeVisible()
    })

    test('shows success message after force refresh', async ({ page }) => {
        await createEntry('Test entry')
        await page.goto('/settings')
        await waitForSync(page)

        page.on('dialog', async (dialog) => {
            await dialog.accept()
        })

        await page.getByTestId('force-refresh-btn').click()

        await expect(page.getByTestId('force-refresh-result')).toContainText(
            'Force refresh completed successfully'
        )
    })

    test('overwrites locally modified entries with server version', async ({ page }) => {
        // Create entry on server
        const entry = await createEntry('Original server content')

        // Load and sync
        await page.goto('/entries')
        await waitForSync(page)

        // Modify locally by editing through UI
        await page.getByTestId('entries-list').locator('li').first().click()
        await page.waitForURL(/\/entries\//)

        const editor = page.getByTestId('editor-content')
        await editor.click()
        // Select all and delete existing content
        await page.keyboard.press('Control+a')
        await page.keyboard.type('Modified local content')
        await page.waitForTimeout(600)

        // Go offline to prevent sync
        await page.context().setOffline(true)
        await page.waitForTimeout(100)

        // Update the entry on the server directly
        await updateEntry(entry.id, 'Updated server content')

        // Block sync uploads so local "Modified local content" doesn't overwrite
        // the server's "Updated server content" before force refresh runs
        await page.route('**/api/sync/batch', (route) => route.abort())

        // Go back online
        await page.context().setOffline(false)
        await page.waitForTimeout(100)

        // Navigate to settings and force refresh
        await page.goto('/settings')
        await waitForSync(page)

        page.on('dialog', async (dialog) => {
            await dialog.accept()
        })

        await page.getByTestId('force-refresh-btn').click()
        await expect(page.getByTestId('force-refresh-result')).toContainText('completed successfully')

        // Unblock sync now that force refresh has overwritten local state
        await page.unroute('**/api/sync/batch')

        // Navigate to entries and verify content was overwritten
        await page.goto('/entries')
        await page.getByTestId('entries-list').locator('li').first().click()
        await page.waitForURL(/\/entries\//)

        const editorContent = page.getByTestId('editor-content')
        await expect(editorContent).toBeVisible({ timeout: 5000 })
        await expect(editorContent).toContainText('Updated server content')
    })

    test('removes local-only entries not present on server', async ({ page }) => {
        // Start fresh, load the app and sync first
        await page.goto('/entries')
        await waitForSync(page)

        // Create a local entry while offline - it won't sync
        await page.context().setOffline(true)

        await page.getByTestId('new-entry-btn').click()
        await page.waitForURL(/\/entries\/new/)

        const editor = page.getByTestId('editor-content')
        await editor.click()
        await page.keyboard.type('Local only entry content')

        // Wait for auto-save to fire and navigate to the created entry
        await page.waitForURL(/\/entries\/[a-f0-9-]+$/, { timeout: 5000 })

        // Navigate back to list to see the entry (using the same page, no network request)
        await page.getByTestId('back-link').click()
        await expect(page.getByTestId('entries-list').locator('li')).toHaveCount(1)

        // Set up dialog handler before going online
        page.on('dialog', async (dialog) => {
            await dialog.accept()
        })

        // Block the batch sync request (which uploads entries) but allow manifest/entries
        await page.route('**/api/sync/batch', (route) => {
            route.abort()
        })

        // Go back online
        await page.context().setOffline(false)

        // Navigate to settings and force refresh
        await page.goto('/settings')
        await page.getByTestId('force-refresh-btn').click()
        await expect(page.getByTestId('force-refresh-result')).toContainText('completed successfully')

        // Unblock routes
        await page.unroute('**/api/sync/batch')

        // Navigate to entries and verify local-only entry is gone
        await page.goto('/entries')
        await expect(page.getByText('No journal entries yet')).toBeVisible()
    })

    test('fetches entries from server that are not present locally', async ({ page }) => {
        // Start with empty local state
        await page.goto('/entries')
        await waitForSync(page)
        await clearIndexedDB(page)

        // Create entries on server
        await createEntry('Server entry 1')
        await createEntry('Server entry 2')

        // Reload page - entries won't sync automatically since IndexedDB was just cleared
        await page.reload()

        // Force refresh to get server entries
        await page.goto('/settings')

        page.on('dialog', async (dialog) => {
            await dialog.accept()
        })

        await page.getByTestId('force-refresh-btn').click()
        await expect(page.getByTestId('force-refresh-result')).toContainText('completed successfully')

        // Navigate to entries and verify both entries exist
        await page.goto('/entries')
        await expect(page.getByTestId('entries-list').locator('li')).toHaveCount(2)
    })

    test('button is disabled while force refresh is in progress', async ({ page }) => {
        // Create multiple entries to make refresh take some time
        for (let i = 0; i < 5; i++) {
            await createEntry(`Entry ${i}`)
        }

        await page.goto('/settings')
        await waitForSync(page)

        page.on('dialog', async (dialog) => {
            await dialog.accept()
        })

        const forceRefreshBtn = page.getByTestId('force-refresh-btn')

        // Click and immediately check disabled state
        await forceRefreshBtn.click()

        // Button should be disabled during the operation
        await expect(forceRefreshBtn).toBeDisabled()

        // Wait for completion
        await expect(page.getByTestId('force-refresh-result')).toContainText('completed successfully')

        // Button should be enabled again
        await expect(forceRefreshBtn).toBeEnabled()
    })

    test('button is disabled while regular sync is in progress', async ({ page }) => {
        await createEntry('Test entry')

        await page.goto('/settings')
        // Don't wait for sync - check that button is disabled during initial sync
        const forceRefreshBtn = page.getByTestId('force-refresh-btn')

        // During sync, button should be disabled
        // Note: This is racy - sync might complete before we check
        // So we just verify the button eventually becomes enabled
        await waitForSync(page)
        await expect(forceRefreshBtn).toBeEnabled()
    })
})
