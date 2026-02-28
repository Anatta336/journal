import { test, expect } from "@playwright/test";
import { API_BASE, TEST_PASSWORD } from "./auth-helpers";

test.describe("Authentication", () => {
    test("unauthenticated user is redirected to login page", async ({
        page,
    }) => {
        await page.goto("/entries");
        await expect(page).toHaveURL("/login");
        await expect(page.locator("input[type='password']")).toBeVisible();
    });

    test("correct password logs the user in and shows the app", async ({
        page,
    }) => {
        await page.goto("/login");
        await page.locator("input[type='password']").fill(TEST_PASSWORD);
        await page.locator("button[type='submit']").click();

        await expect(page).not.toHaveURL("/login", { timeout: 5000 });
        await expect(page.getByTestId("sync-status")).toBeVisible();
    });

    test("wrong password shows an error message", async ({ page }) => {
        await page.goto("/login");
        await page.locator("input[type='password']").fill("wrongpassword");
        await page.locator("button[type='submit']").click();

        await expect(page.locator(".error")).toBeVisible({ timeout: 3000 });
        await expect(page.locator(".error")).toContainText("Incorrect password");
        await expect(page).toHaveURL("/login");
    });

    test("authenticated user visiting /login is redirected to app", async ({
        page,
    }) => {
        const loginResponse = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: TEST_PASSWORD }),
        });
        const { token } = await loginResponse.json();

        await page.addInitScript((t) => {
            localStorage.setItem("auth_token", t);
        }, token);

        await page.goto("/login");
        await expect(page).not.toHaveURL("/login", { timeout: 5000 });
    });

    test("401 response clears token and redirects to login", async ({
        page,
    }) => {
        await page.addInitScript(() => {
            localStorage.setItem("auth_token", "invalid-token-that-will-401");
        });

        await page.goto("/entries");

        await expect(page).toHaveURL("/login", { timeout: 5000 });
        const tokenInStorage = await page.evaluate(() =>
            localStorage.getItem("auth_token"),
        );
        expect(tokenInStorage).toBeNull();
    });
});
