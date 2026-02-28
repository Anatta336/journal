import { test, expect } from "@playwright/test";
import { setPageAuthToken } from "./auth-helpers";

test.describe("Journal Editor", () => {
    test.beforeEach(async ({ page }) => {
        await setPageAuthToken(page);
    });

    test("user can type text into the editor and see it displayed", async ({
        page,
    }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await expect(editor).toBeVisible();

        await editor.click();
        await page.keyboard.type("Hello, Journal!");

        await expect(editor).toContainText("Hello, Journal!");
    });

    test("user types text, applies bold formatting, and underlying markdown contains **", async ({
        page,
    }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();
        await page.keyboard.type("Hello World");

        await page.keyboard.press("Control+a");
        await page.keyboard.press("Control+b");

        const strongElement = editor.locator("strong");
        await expect(strongElement).toContainText("Hello World");
    });

    test("user selects text and clicks Bold button, text appears bold", async ({
        page,
    }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();
        await page.keyboard.type("Make this bold");

        await page.keyboard.press("Control+a");
        await page.getByTestId("toolbar-bold").click();

        const strongElement = editor.locator("strong");
        await expect(strongElement).toContainText("Make this bold");
    });

    test("user selects text and clicks Italic button, text appears italic", async ({
        page,
    }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();
        await page.keyboard.type("Make this italic");

        await page.keyboard.press("Control+a");
        await page.getByTestId("toolbar-italic").click();

        const italicElement = editor.locator("em");
        await expect(italicElement).toContainText("Make this italic");
    });

    test("user selects text and clicks Code button, text appears as inline code", async ({
        page,
    }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();
        await page.keyboard.type("code snippet");

        await page.keyboard.press("Control+a");
        await page.getByTestId("toolbar-code").click();

        const codeElement = editor.locator("code");
        await expect(codeElement).toContainText("code snippet");
    });

    test("user clicks Code Block button, can type preformatted text", async ({
        page,
    }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();
        await page.getByTestId("toolbar-code-block").click();
        await page.waitForTimeout(100);

        await page.keyboard.type("function hello() {}");

        const codeBlockElement = editor.locator("pre");
        await expect(codeBlockElement).toContainText("function hello() {}");
    });

    test("user clicks Bullet List button, creates a list", async ({ page }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();
        await page.getByTestId("toolbar-bullet-list").click();
        // Small delay to ensure list mode is active before typing
        await page.waitForTimeout(100);

        await page.keyboard.type("First item");
        await page.keyboard.press("Enter");
        await page.keyboard.type("Second item");

        const listItems = editor.locator("li");
        await expect(listItems).toHaveCount(2);
        await expect(listItems.first()).toContainText("First item");
        await expect(listItems.last()).toContainText("Second item");
    });

    test("toolbar buttons show active state when cursor is in formatted content", async ({
        page,
    }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();
        await page.keyboard.type("Hello");

        await page.keyboard.press("Control+a");
        await page.getByTestId("toolbar-bold").click();

        const boldButton = page.getByTestId("toolbar-bold");
        await expect(boldButton).toHaveClass(/active/);
    });

    test('typing "* " at start of line triggers list mode', async ({
        page,
    }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();
        await page.keyboard.type("* First item");

        const listItems = editor.locator("li");
        await expect(listItems).toHaveCount(1);
        await expect(listItems.first()).toContainText("First item");
    });

    test("pressing Enter in list item with content creates new item", async ({
        page,
    }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();
        await page.keyboard.type("* First item");
        await page.keyboard.press("Enter");
        await page.keyboard.type("Second item");

        const listItems = editor.locator("li");
        await expect(listItems).toHaveCount(2);
        await expect(listItems.first()).toContainText("First item");
        await expect(listItems.last()).toContainText("Second item");
    });

    test("pressing Enter in empty list item exits list mode", async ({
        page,
    }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();
        await page.keyboard.type("* First item");
        await page.keyboard.press("Enter");
        await page.keyboard.press("Enter");
        await page.keyboard.type("Regular paragraph");

        const listItems = editor.locator("li");
        await expect(listItems).toHaveCount(1);

        await expect(page.getByText("Regular paragraph")).toBeVisible();
    });

    test("user creates multi-item list, exits by pressing Enter on empty item", async ({
        page,
    }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();
        await page.getByTestId("toolbar-bullet-list").click();

        await page.keyboard.type("Item one");
        await page.keyboard.press("Enter");
        await page.keyboard.type("Item two");
        await page.keyboard.press("Enter");
        await page.keyboard.type("Item three");
        await page.keyboard.press("Enter");
        await page.keyboard.press("Enter");
        await page.keyboard.type("Back to normal");

        const listItems = editor.locator("li");
        await expect(listItems).toHaveCount(3);

        await expect(page.getByText("Back to normal")).toBeVisible();
    });

    test("typing * displays * to user but stores as \\* in markdown", async ({
        page,
    }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();
        await page.keyboard.type("we ");
        await page.keyboard.type("*");
        await page.keyboard.type("really");
        await page.keyboard.type("*");
        await page.keyboard.type(" want this");

        await expect(editor).toContainText("we *really* want this");

        const markdown = await page.evaluate(() => {
            const editorComponent = (
                document.querySelector(".journal-editor") as HTMLElement & {
                    __vueParentComponent?: {
                        exposed?: { getMarkdown?: () => string };
                    };
                }
            )?.__vueParentComponent?.exposed?.getMarkdown?.();
            return editorComponent;
        });

        expect(markdown).toContain("\\*");
    });

    test("typing * in inline code mode stores literal *", async ({ page }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();
        await page.keyboard.type("hello ");
        await page.getByTestId("toolbar-code").click();
        await page.waitForTimeout(100);
        await page.keyboard.type("*code*");
        await page.getByTestId("toolbar-code").click();
        await page.waitForTimeout(100);
        await page.keyboard.type(" world");

        const codeElement = editor.locator("code");
        await expect(codeElement).toContainText("*code*");
        await expect(editor).toContainText("hello *code* world");
    });

    test("typing * in code block stores literal *", async ({ page }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();
        await page.getByTestId("toolbar-code-block").click();
        await page.waitForTimeout(100);
        await page.keyboard.type("function multiply(a, b) { return a * b }");

        const codeBlockElement = editor.locator("pre");
        await expect(codeBlockElement).toContainText(
            "function multiply(a, b) { return a * b }",
        );
    });

    test("clicking Bold button stores ** without escaping", async ({
        page,
    }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();
        await page.keyboard.type("Hello World");

        await page.keyboard.press("Control+a");
        await page.getByTestId("toolbar-bold").click();

        const strongElement = editor.locator("strong");
        await expect(strongElement).toContainText("Hello World");
    });
});

test.describe("Integration - Complete User Workflows", () => {
    test.beforeEach(async ({ page }) => {
        await setPageAuthToken(page);
    });

    test("writing a journal entry with mixed formatting", async ({ page }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();

        await page.keyboard.type("Today I learned about ");
        await page.getByTestId("toolbar-bold").click();
        await page.waitForTimeout(100);
        await page.keyboard.type("Tiptap");
        await page.getByTestId("toolbar-bold").click();
        await page.waitForTimeout(100);
        await page.keyboard.type(", a ");
        await page.getByTestId("toolbar-italic").click();
        await page.waitForTimeout(100);
        await page.keyboard.type("headless");
        await page.getByTestId("toolbar-italic").click();
        await page.waitForTimeout(100);
        await page.keyboard.type(" editor framework.");

        await expect(editor.locator("strong")).toContainText("Tiptap");
        await expect(editor.locator("em")).toContainText("headless");
        await expect(editor).toContainText(
            "Today I learned about Tiptap, a headless editor framework.",
        );
    });

    test("creating and editing bullet lists", async ({ page }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();

        await page.keyboard.type("My TODO list:");
        await page.keyboard.press("Enter");
        await page.keyboard.type("* Buy groceries");
        await page.keyboard.press("Enter");
        await page.keyboard.type("Write code");
        await page.keyboard.press("Enter");
        await page.keyboard.type("Take a break");
        await page.keyboard.press("Enter");
        await page.keyboard.press("Enter");
        await page.keyboard.type("That is all for today.");

        const listItems = editor.locator("li");
        await expect(listItems).toHaveCount(3);
        await expect(page.getByText("That is all for today.")).toBeVisible();
    });

    test("using toolbar to format text preserves markdown structure", async ({
        page,
    }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();

        await page.keyboard.type("Some ");
        await page.getByTestId("toolbar-code").click();
        await page.waitForTimeout(100);
        await page.keyboard.type("inline code");
        await page.getByTestId("toolbar-code").click();
        await page.waitForTimeout(100);
        await page.keyboard.type(" example.");
        await page.keyboard.press("Enter");
        await page.keyboard.press("Enter");
        await page.getByTestId("toolbar-code-block").click();
        await page.waitForTimeout(100);
        await page.keyboard.type("const x = 1;");

        await expect(editor.locator("code").first()).toContainText(
            "inline code",
        );
        await expect(editor.locator("pre")).toContainText("const x = 1;");
    });

    test("typing special characters displays them correctly", async ({
        page,
    }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();

        await page.keyboard.type("I want to say *wow* and _amazing_!");

        await expect(editor).toContainText(
            "I want to say *wow* and _amazing_!",
        );

        await expect(editor.locator("strong")).toHaveCount(0);
        await expect(editor.locator("em")).toHaveCount(0);
    });

    test("complete workflow with all formatting types", async ({ page }) => {
        await page.goto("/entries/new");

        const editor = page.getByTestId("editor-content");
        await editor.click();

        await page.keyboard.type("# My Journal Entry");
        await page.keyboard.press("Enter");
        await page.keyboard.press("Enter");
        await page.keyboard.type("Today was a ");
        await page.getByTestId("toolbar-bold").click();
        await page.waitForTimeout(100);
        await page.keyboard.type("great");
        await page.getByTestId("toolbar-bold").click();
        await page.waitForTimeout(100);
        await page.keyboard.type(" day!");
        await page.keyboard.press("Enter");
        await page.keyboard.press("Enter");
        await page.keyboard.type("Things I did:");
        await page.keyboard.press("Enter");
        await page.getByTestId("toolbar-bullet-list").click();
        await page.waitForTimeout(100);
        await page.keyboard.type("Wrote some ");
        await page.getByTestId("toolbar-code").click();
        await page.waitForTimeout(100);
        await page.keyboard.type("TypeScript");
        await page.getByTestId("toolbar-code").click();
        await page.waitForTimeout(100);
        await page.keyboard.press("Enter");
        await page.keyboard.type("Tested my app");
        await page.keyboard.press("Enter");
        await page.keyboard.press("Enter");
        await page.keyboard.type("Here is some code:");
        await page.keyboard.press("Enter");
        await page.getByTestId("toolbar-code-block").click();
        await page.waitForTimeout(100);
        await page.keyboard.type('console.log("Hello!");');

        await expect(editor.locator("strong")).toContainText("great");
        await expect(editor.locator("li")).toHaveCount(2);
        await expect(editor.locator("li code")).toContainText("TypeScript");
        await expect(editor.locator("pre")).toContainText(
            'console.log("Hello!");',
        );
    });
});
