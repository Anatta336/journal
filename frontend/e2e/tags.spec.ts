import { test, expect } from "@playwright/test";
import {
    setPageAuthToken,
    createEntry,
    deleteAllEntries,
    apiRequest,
} from "./auth-helpers";

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

test.describe("Tags", () => {
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

    test.describe("Creating Entries with Tags", () => {
        test("can create a new entry with tags", async ({ page }) => {
            await page.goto("/entries/new");

            const tagInput = page.getByTestId("tag-input");
            await tagInput.fill("work");
            await tagInput.press("Enter");

            await expect(page.getByTestId("selected-tag-work")).toBeVisible();

            const editor = page.getByTestId("editor-content");
            await editor.click();
            await page.keyboard.type("Work related entry");

            await page.waitForURL(/\/entries\/[a-f0-9-]+$/, { timeout: 5000 });

            await page.goto("/entries");
            await page.reload();

            const entryItem = page
                .getByTestId("entries-list")
                .locator("li")
                .first();
            await expect(entryItem.getByTestId("entry-tag-work")).toBeVisible();
        });

        test("can add multiple tags to an entry", async ({ page }) => {
            await page.goto("/entries/new");

            const tagInput = page.getByTestId("tag-input");
            await tagInput.fill("work");
            await tagInput.press("Enter");
            await tagInput.fill("important");
            await tagInput.press("Enter");

            await expect(page.getByTestId("selected-tag-work")).toBeVisible();
            await expect(
                page.getByTestId("selected-tag-important"),
            ).toBeVisible();

            const editor = page.getByTestId("editor-content");
            await editor.click();
            await page.keyboard.type("Multi-tag entry");

            await page.waitForURL(/\/entries\/[a-f0-9-]+$/, { timeout: 5000 });
        });

        test("prevents duplicate tags case-insensitively", async ({ page }) => {
            await page.goto("/entries/new");

            const tagInput = page.getByTestId("tag-input");
            await tagInput.fill("Work");
            await tagInput.press("Enter");

            await expect(page.getByTestId("selected-tag-Work")).toBeVisible();

            await tagInput.fill("work");
            await tagInput.press("Enter");

            const selectedTags = page.locator('[data-testid^="selected-tag-"]');
            await expect(selectedTags).toHaveCount(1);
        });

        test("validates tag format - only alphanumeric and hyphens", async ({
            page,
        }) => {
            await page.goto("/entries/new");

            const tagInput = page.getByTestId("tag-input");
            await tagInput.fill("invalid tag!");
            await tagInput.press("Enter");

            await expect(
                page.getByTestId("selected-tag-invalidtag"),
            ).toBeVisible();
        });

        test("limits tag length to 20 characters", async ({ page }) => {
            await page.goto("/entries/new");

            const tagInput = page.getByTestId("tag-input");
            await tagInput.fill("this-is-a-very-long-tag-name");

            const inputValue = await tagInput.inputValue();
            expect(inputValue.length).toBeLessThanOrEqual(20);
        });

        test("can remove a tag before saving", async ({ page }) => {
            await page.goto("/entries/new");

            const tagInput = page.getByTestId("tag-input");
            await tagInput.fill("temporary");
            await tagInput.press("Enter");

            await expect(
                page.getByTestId("selected-tag-temporary"),
            ).toBeVisible();

            await page.getByTestId("remove-tag-temporary").click();

            await expect(
                page.getByTestId("selected-tag-temporary"),
            ).not.toBeVisible();
        });
    });

    test.describe("Editing Entries with Tags", () => {
        test("loads existing tags when editing an entry", async ({ page }) => {
            const entry = await createEntry("Entry with tag", ["existing-tag"]);

            await page.goto(`/entries/${entry.id}`);
            await page.reload();

            await expect(
                page.getByTestId("selected-tag-existing-tag"),
            ).toBeVisible();
        });

        test("can add new tags to an existing entry", async ({ page }) => {
            const entry = await createEntry("Entry without tags");

            await page.goto(`/entries/${entry.id}`);
            await page.reload();

            const tagInput = page.getByTestId("tag-input");
            await tagInput.fill("new-tag");
            await tagInput.press("Enter");

            await expect(
                page.getByTestId("selected-tag-new-tag"),
            ).toBeVisible();

            await expect(page.getByTestId("save-indicator")).toContainText(
                "Last saved",
                { timeout: 5000 },
            );

            await page.reload();
            await expect(
                page.getByTestId("selected-tag-new-tag"),
            ).toBeVisible();
        });

        test("can remove tags from an existing entry", async ({ page }) => {
            const entry = await createEntry("Entry with tag to remove", [
                "remove-me",
            ]);

            await page.goto(`/entries/${entry.id}`);
            await page.reload();

            await expect(
                page.getByTestId("selected-tag-remove-me"),
            ).toBeVisible();

            await page.getByTestId("remove-tag-remove-me").click();

            await expect(
                page.getByTestId("selected-tag-remove-me"),
            ).not.toBeVisible();

            await expect(page.getByTestId("save-indicator")).toContainText(
                "Last saved",
                { timeout: 5000 },
            );

            await page.reload();
            await expect(
                page.getByTestId("selected-tag-remove-me"),
            ).not.toBeVisible();
        });

        test("changing only tags triggers sync to backend", async ({
            page,
        }) => {
            const entry = await createEntry("Content stays the same", [
                "original-tag",
            ]);

            await page.goto(`/entries/${entry.id}`);
            await page.reload();

            await expect(
                page.getByTestId("selected-tag-original-tag"),
            ).toBeVisible();

            await page.getByTestId("remove-tag-original-tag").click();

            const tagInput = page.getByTestId("tag-input");
            await tagInput.fill("new-tag");
            await tagInput.press("Enter");

            await expect(
                page.getByTestId("selected-tag-new-tag"),
            ).toBeVisible();

            await expect(page.getByTestId("save-indicator")).toContainText(
                "Last saved",
                { timeout: 5000 },
            );

            await page.waitForFunction(
                () =>
                    !document
                        .querySelector('[data-testid="sync-status"]')
                        ?.textContent?.includes("Syncing"),
                { timeout: 5000 },
            );

            const response = await apiRequest(`/entries/${entry.id}`);
            const updatedEntry = await response.json();

            expect(updatedEntry.content.trim()).toBe("Content stays the same");
            expect(updatedEntry.tags).toEqual(["new-tag"]);
        });
    });

    test.describe("Tag Autocomplete", () => {
        test("shows existing tags in autocomplete dropdown", async ({
            page,
        }) => {
            await createEntry("Entry 1", ["existing-tag"]);

            await page.goto("/entries/new");
            await page.reload();

            await page.waitForFunction(
                () =>
                    !document
                        .querySelector('[data-testid="sync-status"]')
                        ?.textContent?.includes("Syncing"),
                { timeout: 2000 },
            );

            const tagInput = page.getByTestId("tag-input");
            await tagInput.focus();

            await expect(page.getByTestId("tag-dropdown")).toBeVisible();
            await expect(
                page.getByTestId("tag-option-existing-tag"),
            ).toBeVisible();
        });

        test("filters autocomplete based on input", async ({ page }) => {
            await createEntry("Entry 1", ["work"]);
            await createEntry("Entry 2", ["personal"]);

            await page.goto("/entries/new");
            await page.reload();

            await page.waitForFunction(
                () =>
                    !document
                        .querySelector('[data-testid="sync-status"]')
                        ?.textContent?.includes("Syncing"),
                { timeout: 2000 },
            );

            const tagInput = page.getByTestId("tag-input");
            await tagInput.fill("wor");

            await expect(page.getByTestId("tag-option-work")).toBeVisible();
            await expect(
                page.getByTestId("tag-option-personal"),
            ).not.toBeVisible();
        });

        test("selecting from autocomplete adds the tag", async ({ page }) => {
            await createEntry("Entry 1", ["autocomplete-tag"]);

            await page.goto("/entries/new");
            await page.reload();

            await page.waitForFunction(
                () =>
                    !document
                        .querySelector('[data-testid="sync-status"]')
                        ?.textContent?.includes("Syncing"),
                { timeout: 2000 },
            );

            const tagInput = page.getByTestId("tag-input");
            await tagInput.focus();

            await page.getByTestId("tag-option-autocomplete-tag").click();

            await expect(
                page.getByTestId("selected-tag-autocomplete-tag"),
            ).toBeVisible();
        });

        test("uses existing casing when adding tag that matches case-insensitively", async ({
            page,
        }) => {
            await createEntry("Entry 1", ["WorkTag"]);

            await page.goto("/entries/new");
            await page.reload();

            await page.waitForFunction(
                () =>
                    !document
                        .querySelector('[data-testid="sync-status"]')
                        ?.textContent?.includes("Syncing"),
                { timeout: 2000 },
            );

            const tagInput = page.getByTestId("tag-input");
            await tagInput.fill("worktag");
            await tagInput.press("Enter");

            await expect(
                page.getByTestId("selected-tag-WorkTag"),
            ).toBeVisible();
        });
    });

    test.describe("Filtering by Tags", () => {
        test("shows filter button when entries have tags", async ({ page }) => {
            await createEntry("Entry with tag", ["filter-test"]);

            await page.goto("/entries");
            await page.reload();

            await expect(page.getByTestId("filter-toggle-btn")).toBeVisible();
        });

        test("opens filter panel when clicking Filters button", async ({
            page,
        }) => {
            await createEntry("Entry with tag", ["panel-test"]);

            await page.goto("/entries");
            await page.reload();

            await page.getByTestId("filter-toggle-btn").click();

            await expect(page.getByTestId("filter-panel")).toBeVisible();
            await expect(
                page.getByTestId("filter-tag-panel-test"),
            ).toBeVisible();
        });

        test("filters entries when a tag is selected", async ({ page }) => {
            await createEntry("Entry A", ["tag-a"]);
            await createEntry("Entry B", ["tag-b"]);

            await page.goto("/entries");
            await page.reload();

            const listItems = page.getByTestId("entries-list").locator("li");
            await expect(listItems).toHaveCount(2);

            await page.getByTestId("filter-toggle-btn").click();
            await page.getByTestId("filter-tag-tag-a").click();

            await expect(listItems).toHaveCount(1);
            await expect(page.getByTestId("entry-tag-tag-a")).toBeVisible();
        });

        test("shows filter count when filters are active", async ({ page }) => {
            await createEntry("Entry", ["counted-tag"]);

            await page.goto("/entries");
            await page.reload();

            await page.getByTestId("filter-toggle-btn").click();
            await page.getByTestId("filter-tag-counted-tag").click();

            await expect(page.getByTestId("filter-toggle-btn")).toContainText(
                "Filters (1)",
            );
        });

        test("shows clear filters button when filters are active", async ({
            page,
        }) => {
            await createEntry("Entry", ["clear-test"]);

            await page.goto("/entries");
            await page.reload();

            await page.getByTestId("filter-toggle-btn").click();
            await expect(
                page.getByTestId("clear-filters-btn"),
            ).not.toBeVisible();

            await page.getByTestId("filter-tag-clear-test").click();
            await expect(page.getByTestId("clear-filters-btn")).toBeVisible();
        });

        test("clears all filters when clicking remove all filters", async ({
            page,
        }) => {
            await createEntry("Entry A", ["tag-1"]);
            await createEntry("Entry B", ["tag-2"]);

            await page.goto("/entries");
            await page.reload();

            await page.getByTestId("filter-toggle-btn").click();
            await page.getByTestId("filter-tag-tag-1").click();

            const listItems = page.getByTestId("entries-list").locator("li");
            await expect(listItems).toHaveCount(1);

            await page.getByTestId("clear-filters-btn").click();
            await expect(listItems).toHaveCount(2);
        });

        test("filters by multiple tags (AND logic)", async ({ page }) => {
            await createEntry("Entry with both", ["multi-a", "multi-b"]);
            await createEntry("Entry with one", ["multi-a"]);

            await page.goto("/entries");
            await page.reload();

            await page.getByTestId("filter-toggle-btn").click();
            await page.getByTestId("filter-tag-multi-a").click();
            await page.getByTestId("filter-tag-multi-b").click();

            const listItems = page.getByTestId("entries-list").locator("li");
            await expect(listItems).toHaveCount(1);
        });

        test("shows message when no entries match filters", async ({
            page,
        }) => {
            await createEntry("Entry A", ["only-a"]);
            await createEntry("Entry B", ["only-b"]);

            await page.goto("/entries");
            await page.reload();

            await page.getByTestId("filter-toggle-btn").click();
            await page.getByTestId("filter-tag-only-a").click();
            await page.getByTestId("filter-tag-only-b").click();

            await expect(
                page.getByText("No entries match the selected filters"),
            ).toBeVisible();
        });
    });

    test.describe("Tags Display on Entry List", () => {
        test("displays tags as badges on entry cards", async ({ page }) => {
            await createEntry("Entry with tags", [
                "badge-tag-1",
                "badge-tag-2",
            ]);

            await page.goto("/entries");
            await page.reload();

            await expect(
                page.getByTestId("entry-tag-badge-tag-1"),
            ).toBeVisible();
            await expect(
                page.getByTestId("entry-tag-badge-tag-2"),
            ).toBeVisible();
        });
    });
});
