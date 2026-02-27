import { test, expect } from "@playwright/test";

const API_BASE = `http://localhost:${process.env.VITE_BACKEND_PORT || "3014"}`;

interface EntryResponse {
    id: string;
    creationDate: string;
    lastUpdated: string;
    content: string;
}

async function createEntry(content: string): Promise<EntryResponse> {
    const response = await fetch(`${API_BASE}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
    });
    return response.json();
}

async function deleteAllEntries(): Promise<void> {
    const response = await fetch(`${API_BASE}/entries`);
    if (!response.ok) return;
    const entries = await response.json();
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
        await fetch(`${API_BASE}/entries/${entry.id}`, { method: "DELETE" });
    }
}

async function waitForSync(
    page: import("@playwright/test").Page,
    expectedCount: number,
): Promise<void> {
    // Just reload to force a fresh sync from the backend
    await page.reload();
    // Wait for sync to complete
    await page.waitForFunction(
        () =>
            !document
                .querySelector('[data-testid="sync-status"]')
                ?.textContent?.includes("Syncing"),
        { timeout: 2000 },
    );

    if (expectedCount === 0) {
        await page
            .getByText("No journal entries yet")
            .waitFor({ state: "visible", timeout: 2000 });
    } else {
        await page
            .getByTestId("entries-list")
            .locator("li")
            .first()
            .waitFor({ state: "visible", timeout: 2000 });
    }
}

test.describe.configure({ mode: "serial" });

async function clearIndexedDB(
    page: import("@playwright/test").Page,
): Promise<void> {
    // Request database deletion - it may be blocked if connections are open
    // but the flag will be set and it will be deleted when connections close
    await page.evaluate(async () => {
        const databases = await indexedDB.databases();
        for (const db of databases) {
            if (db.name) {
                await new Promise<void>((resolve) => {
                    const request = indexedDB.deleteDatabase(db.name!);
                    request.onsuccess = () => resolve();
                    request.onerror = () => resolve();
                    request.onblocked = () => {
                        // Reload will close connections and complete deletion
                        resolve();
                    };
                });
            }
        }
    });
}

test.describe("Manage Entries", () => {
    test.beforeEach(async ({ page }) => {
        // Delete all entries from the backend first
        await deleteAllEntries();
        // Navigate to a minimal HTML page (before app loads)
        await page.goto("/entries");
        // Clear IndexedDB - the app may have already opened connections
        await clearIndexedDB(page);
        // Reload to get fresh state after IndexedDB is cleared
        await page.reload();
        // Wait for initial sync to complete
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

    test.describe("Entry List", () => {
        test("shows empty state when no entries exist", async ({ page }) => {
            await page.goto("/entries");
            await expect(
                page.getByText("No journal entries yet"),
            ).toBeVisible();
        });

        test("displays entries sorted by creation date descending", async ({
            page,
        }) => {
            const entry1 = await createEntry("First entry");
            await new Promise((r) => setTimeout(r, 50));
            const entry2 = await createEntry("Second entry");
            await new Promise((r) => setTimeout(r, 50));
            const entry3 = await createEntry("Third entry");

            await page.goto("/entries");
            await waitForSync(page, 3);

            const listItems = page.getByTestId("entries-list").locator("li");
            await expect(listItems).toHaveCount(3);

            const dates = await listItems.allTextContents();
            expect(dates[0]).toContain(formatDatePart(entry3.creationDate));
            expect(dates[1]).toContain(formatDatePart(entry2.creationDate));
            expect(dates[2]).toContain(formatDatePart(entry1.creationDate));
        });

        test("formats dates as DD/Mon/YYYY", async ({ page }) => {
            await createEntry("Test entry");

            await page.goto("/entries");
            await waitForSync(page, 1);

            const dateText = await page
                .getByTestId("entries-list")
                .locator("li")
                .first()
                .textContent();
            expect(dateText).toMatch(/\d{2}\/[A-Z][a-z]{2}\/\d{4}/);
        });

        test("clicking New Entry creates an entry and navigates to /entries/:id", async ({
            page,
        }) => {
            await page.goto("/entries");
            await page.getByTestId("new-entry-btn").click();
            await expect(page).toHaveURL(/\/entries\/[a-f0-9-]+\?new=1$/, {
                timeout: 5000,
            });
        });

        test("clicking an entry navigates to edit page", async ({ page }) => {
            const entry = await createEntry("Test entry");

            await page.goto("/entries");
            await waitForSync(page, 1);
            await page
                .getByTestId("entries-list")
                .locator("li")
                .first()
                .click();

            await expect(page).toHaveURL(`/entries/${entry.id}`);
        });
    });

    test.describe("Entry Deletion", () => {
        test("shows confirmation dialog before deleting", async ({ page }) => {
            const entry = await createEntry("To be deleted");

            await page.goto("/entries");
            await waitForSync(page, 1);

            let dialogShown = false;
            page.on("dialog", async (dialog) => {
                dialogShown = true;
                expect(dialog.type()).toBe("confirm");
                await dialog.dismiss();
            });

            await page.getByTestId(`delete-btn-${entry.id}`).click();
            expect(dialogShown).toBe(true);

            await expect(
                page.getByTestId("entries-list").locator("li"),
            ).toHaveCount(1);
        });

        test("removes entry from list after confirming deletion", async ({
            page,
        }) => {
            const entry = await createEntry("To be deleted");

            await page.goto("/entries");
            await waitForSync(page, 1);

            page.on("dialog", (dialog) => dialog.accept());

            await page.getByTestId(`delete-btn-${entry.id}`).click();

            await expect(
                page.getByText("No journal entries yet"),
            ).toBeVisible();
        });
    });

    test.describe("Create New Entry", () => {
        test("creates entry and saves after typing content", async ({
            page,
        }) => {
            await page.goto("/entries");
            await page.getByTestId("new-entry-btn").click();
            await expect(page).toHaveURL(/\/entries\/[a-f0-9-]+\?new=1$/, {
                timeout: 5000,
            });

            const editor = page.getByTestId("editor-content");
            await editor.click();
            await page.keyboard.type("New entry content");

            await expect(page.getByTestId("save-indicator")).toContainText(
                "Last saved",
                { timeout: 5000 },
            );
        });

        test("new entry appears in the list after saving", async ({ page }) => {
            await page.goto("/entries");
            await page.getByTestId("new-entry-btn").click();
            await expect(page).toHaveURL(/\/entries\/[a-f0-9-]+\?new=1$/, {
                timeout: 5000,
            });

            const editor = page.getByTestId("editor-content");
            await editor.click();
            await page.keyboard.type("Brand new entry");

            await expect(page.getByTestId("save-indicator")).toContainText(
                "Last saved",
                { timeout: 5000 },
            );
            await page.getByTestId("back-link").click();

            await expect(
                page.getByTestId("entries-list").locator("li"),
            ).toHaveCount(1);
        });
    });

    test.describe("Edit Entry", () => {
        test("loads existing entry content", async ({ page }) => {
            const entry = await createEntry("Existing content here");

            await page.goto(`/entries/${entry.id}`);
            await page.waitForFunction(
                () =>
                    !document
                        .querySelector('[data-testid="sync-status"]')
                        ?.textContent?.includes("Syncing"),
                { timeout: 2000 },
            );

            const editor = page.getByTestId("editor-content");
            await expect(editor).toBeVisible({ timeout: 2000 });
            await expect(editor).toContainText("Existing content here");
        });

        test("shows Last saved indicator after auto-save", async ({ page }) => {
            const entry = await createEntry("Original content");

            await page.goto(`/entries/${entry.id}`);

            const editor = page.getByTestId("editor-content");
            await editor.click();
            await page.keyboard.press("End");
            await page.keyboard.type(" updated");

            await expect(page.getByTestId("save-indicator")).toContainText(
                "Last saved",
                { timeout: 5000 },
            );
        });

        test("content persists after auto-save and refresh", async ({
            page,
        }) => {
            const entry = await createEntry("Initial text");

            await page.goto(`/entries/${entry.id}`);

            const editor = page.getByTestId("editor-content");
            await editor.click();
            await page.keyboard.press("End");
            await page.keyboard.type(" plus more");

            await expect(page.getByTestId("save-indicator")).toContainText(
                "Last saved",
                { timeout: 5000 },
            );

            await page.reload();

            await expect(page.getByTestId("editor-content")).toContainText(
                "Initial text plus more",
            );
        });
    });

    test.describe("Navigation Without Confirmation", () => {
        test("navigates away without dialog when entry has changes", async ({
            page,
        }) => {
            const entry = await createEntry("Original");

            await page.goto(`/entries/${entry.id}`);

            const editor = page.getByTestId("editor-content");
            await editor.click();
            await page.keyboard.type("New text");

            let dialogShown = false;
            page.on("dialog", async (dialog) => {
                dialogShown = true;
                await dialog.dismiss();
            });

            await page.getByTestId("back-link").click();

            expect(dialogShown).toBe(false);
            await expect(page).toHaveURL("/entries");
        });

        test("navigates away without dialog when no changes made", async ({
            page,
        }) => {
            const entry = await createEntry("Content here");

            await page.goto(`/entries/${entry.id}`);

            let dialogShown = false;
            page.on("dialog", async (dialog) => {
                dialogShown = true;
                await dialog.dismiss();
            });

            await page.getByTestId("back-link").click();

            expect(dialogShown).toBe(false);
            await expect(page).toHaveURL("/entries");
        });

        test("navigates away without dialog from new entry with content", async ({
            page,
        }) => {
            await page.goto("/entries");
            await page.getByTestId("new-entry-btn").click();
            await expect(page).toHaveURL(/\/entries\/[a-f0-9-]+\?new=1$/, {
                timeout: 5000,
            });

            const editor = page.getByTestId("editor-content");
            await editor.click();
            await page.keyboard.type("Unsaved new entry");

            let dialogShown = false;
            page.on("dialog", async (dialog) => {
                dialogShown = true;
                await dialog.dismiss();
            });

            await page.getByTestId("back-link").click();

            expect(dialogShown).toBe(false);
            await expect(page).toHaveURL("/entries");
        });
    });

    test.describe("New Entry Auto-Delete", () => {
        test("navigating away from new entry with no content removes it from the list", async ({
            page,
        }) => {
            await page.goto("/entries");
            await page.getByTestId("new-entry-btn").click();
            await expect(page).toHaveURL(/\/entries\/[a-f0-9-]+\?new=1$/, {
                timeout: 5000,
            });

            await page.getByTestId("back-link").click();
            await expect(page).toHaveURL("/entries");

            await expect(page.getByText("No journal entries yet")).toBeVisible({
                timeout: 3000,
            });
        });

        test("navigating away from new entry with tags but no content keeps the entry", async ({
            page,
        }) => {
            await page.goto("/entries");
            await page.getByTestId("new-entry-btn").click();
            await expect(page).toHaveURL(/\/entries\/[a-f0-9-]+\?new=1$/, {
                timeout: 5000,
            });

            const tagInput = page.getByTestId("tag-input");
            await tagInput.click();
            await tagInput.fill("mytag");
            await page.keyboard.press("Enter");

            await page.getByTestId("back-link").click();
            await expect(page).toHaveURL("/entries");

            await expect(
                page.getByTestId("entries-list").locator("li"),
            ).toHaveCount(1, { timeout: 3000 });
        });
    });
});

function formatDatePart(isoDate: string): string {
    const date = new Date(isoDate);
    const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];
    return months[date.getMonth()];
}
