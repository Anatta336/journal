import { test, expect } from "@playwright/test";
import { API_BASE, TEST_PASSWORD } from "./auth-helpers";

async function getFreshToken(): Promise<string> {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: TEST_PASSWORD }),
    });
    if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
    }
    const { token } = await response.json();
    return token;
}

test.describe("Logout", () => {
    test("clicking Log out redirects to /login and clears the token", async ({
        page,
    }) => {
        const token = await getFreshToken();
        await page.addInitScript((t) => {
            localStorage.setItem("auth_token", t);
        }, token);

        await page.goto("/entries");
        await expect(page.getByTestId("logout-btn")).toBeVisible();

        await page.getByTestId("logout-btn").click();

        await expect(page).toHaveURL("/login", { timeout: 5000 });

        const storedToken = await page.evaluate(() =>
            localStorage.getItem("auth_token"),
        );
        expect(storedToken).toBeNull();

        await page.goto("/entries");
        await expect(page).toHaveURL("/login", { timeout: 5000 });
    });

    test("Invalidate all tokens button shows inline confirmation", async ({
        page,
    }) => {
        const token = await getFreshToken();
        await page.addInitScript((t) => {
            localStorage.setItem("auth_token", t);
        }, token);

        await page.goto("/entries");
        await expect(page.getByTestId("logout-all-btn")).toBeVisible();

        await page.getByTestId("logout-all-btn").click();

        await expect(page.getByTestId("logout-all-confirm-btn")).toBeVisible();
        await expect(page.getByTestId("logout-all-cancel-btn")).toBeVisible();
        await expect(page.getByTestId("logout-all-btn")).not.toBeVisible();
        await expect(page).toHaveURL("/entries");
    });

    test("cancelling Invalidate all tokens does not log out", async ({
        page,
    }) => {
        const token = await getFreshToken();
        await page.addInitScript((t) => {
            localStorage.setItem("auth_token", t);
        }, token);

        await page.goto("/entries");
        await page.getByTestId("logout-all-btn").click();
        await page.getByTestId("logout-all-cancel-btn").click();

        await expect(page.getByTestId("logout-all-btn")).toBeVisible();
        await expect(page).toHaveURL("/entries");

        const storedToken = await page.evaluate(() =>
            localStorage.getItem("auth_token"),
        );
        expect(storedToken).not.toBeNull();
    });

    test("confirming Invalidate all tokens logs out and redirects to /login", async ({
        page,
    }) => {
        const token = await getFreshToken();
        await page.addInitScript((t) => {
            localStorage.setItem("auth_token", t);
        }, token);

        await page.goto("/entries");
        await page.getByTestId("logout-all-btn").click();
        await page.getByTestId("logout-all-confirm-btn").click();

        await expect(page).toHaveURL("/login", { timeout: 5000 });

        const storedToken = await page.evaluate(() =>
            localStorage.getItem("auth_token"),
        );
        expect(storedToken).toBeNull();
    });

    test("Invalidate all tokens shows error and keeps user logged in when offline", async ({
        page,
        context,
    }) => {
        const token = await getFreshToken();
        await page.addInitScript((t) => {
            localStorage.setItem("auth_token", t);
        }, token);

        await page.goto("/entries");
        await page.getByTestId("logout-all-btn").click();

        await context.setOffline(true);
        await page.getByTestId("logout-all-confirm-btn").click();

        await expect(page.getByTestId("logout-all-error")).toBeVisible({ timeout: 5000 });
        await expect(page).toHaveURL("/entries");

        const storedToken = await page.evaluate(() =>
            localStorage.getItem("auth_token"),
        );
        expect(storedToken).not.toBeNull();

        await context.setOffline(false);
    });

    test("Log out clears token and redirects even when offline", async ({
        page,
        context,
    }) => {
        const token = await getFreshToken();
        await page.addInitScript((t) => {
            localStorage.setItem("auth_token", t);
        }, token);

        await page.goto("/entries");
        await context.setOffline(true);
        await page.getByTestId("logout-btn").click();

        await expect(page).toHaveURL("/login", { timeout: 5000 });

        const storedToken = await page.evaluate(() =>
            localStorage.getItem("auth_token"),
        );
        expect(storedToken).toBeNull();

        await context.setOffline(false);
    });
});
