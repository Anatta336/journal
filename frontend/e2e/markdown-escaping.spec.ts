import { test, expect } from '@playwright/test'

test.describe('Markdown Escaping', () => {
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
        // This test assumes we can inject an entry or we use the one provided in the issue
        // The issue mentions 95456ad7-a15f-41c9-abd4-7759e91cae8a.md
        // We can try to navigate to it if it exists in the test data

        await page.goto('/entries/95456ad7-a15f-41c9-abd4-7759e91cae8a')

        await expect(page.getByTestId('editor-content')).toBeVisible()

        // The user says it displays "Here is a  test ." instead of "Here is a * test *."
        // Note: the attachment shows "Here is a \* test \*." in the file.
        await expect(page.getByTestId('editor-content')).toContainText('Here is a * test *.')
    })
})
