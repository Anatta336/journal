import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: "list",
    use: {
        baseURL: "http://localhost:5174",
        trace: "on-first-retry",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: [
        {
            command:
                "TESTING=true AUTH_PASSWORD=testpassword npm run dev --prefix ../backend",
            url: "http://localhost:3014/health",
            reuseExistingServer: !process.env.CI,
        },
        {
            command: "PORT=5174 VITE_BACKEND_PORT=3014 npm run dev",
            url: "http://localhost:5174",
            reuseExistingServer: !process.env.CI,
        },
    ],
});
