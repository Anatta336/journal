import { test, expect } from "@playwright/test";
import { setPageAuthToken, deleteAllEntries } from "./auth-helpers";

async function clearIndexedDB(
    page: import("@playwright/test").Page,
): Promise<void> {
    await page.evaluate(async () => {
        const databases = await indexedDB.databases();
        for (const db of databases) {
            if (db.name) {
                await new Promise<void>((resolve) => {
                    const request = indexedDB.deleteDatabase(db.name!);
                    request.onsuccess = () => resolve();
                    request.onerror = () => resolve();
                    request.onblocked = () => resolve();
                });
            }
        }
    });
}

test.describe.configure({ mode: "serial" });

test.describe("Auto-save", () => {
    test.beforeEach(async ({ page }) => {
        await setPageAuthToken(page);
        await deleteAllEntries();
        await page.goto("/entries");
        await clearIndexedDB(page);
        await page.reload();
        await page.waitForFunction(
            () =>
                !document
                    .querySelector('[data-testid="sync-status"]')
                    ?.textContent?.includes("Syncing"),
            { timeout: 2000 },
        );
    });

    test.afterAll(async () => {
        await deleteAllEntries();
    });

    test("save indicator shows Last saved after typing", async ({ page }) => {
        await page.goto("/entries");
        await page.getByTestId("new-entry-btn").click();
        await expect(page).toHaveURL(/\/entries\/[a-f0-9-]+\?new=1$/, {
            timeout: 5000,
        });

        const editor = page.getByTestId("editor-content");
        await editor.click();
        await page.keyboard.type("Auto-save test entry");

        await expect(page.getByTestId("save-indicator")).toContainText(
            "Last saved",
            { timeout: 5000 },
        );
    });

    test("navigating away immediately saves entry without a confirmation dialog", async ({
        page,
    }) => {
        await page.goto("/entries");
        await page.getByTestId("new-entry-btn").click();
        await expect(page).toHaveURL(/\/entries\/[a-f0-9-]+\?new=1$/, {
            timeout: 5000,
        });

        const editor = page.getByTestId("editor-content");
        await editor.click();
        await page.keyboard.type("Navigate-away save test");

        let dialogShown = false;
        page.on("dialog", async (dialog) => {
            dialogShown = true;
            await dialog.dismiss();
        });

        // Navigate away immediately before auto-save debounce fires
        await page.getByTestId("back-link").click();

        // Should navigate without any dialog
        expect(dialogShown).toBe(false);
        await expect(page).toHaveURL("/entries");

        // The entry should be persisted — reload the entries list
        await page.reload();
        await page.waitForFunction(
            () =>
                !document
                    .querySelector('[data-testid="sync-status"]')
                    ?.textContent?.includes("Syncing"),
            { timeout: 2000 },
        );
        await expect(
            page.getByTestId("entries-list").locator("li"),
        ).toHaveCount(1);
    });
});
