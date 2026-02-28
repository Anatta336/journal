import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { initDb, getDb } from "../db.js";
import { initPassword } from "../services/auth.js";

const TEST_PASSWORD = "testpassword-auth-route";

describe("Auth routes", () => {
    beforeAll(async () => {
        process.env.NODE_ENV = "test";
        initDb();
        await initPassword(TEST_PASSWORD);
    });

    describe("POST /auth/logout", () => {
        let app: FastifyInstance;

        beforeAll(async () => {
            app = await buildApp();
        });

        afterAll(async () => {
            await app.close();
        });

        async function loginAndGetToken(): Promise<string> {
            const response = await app.inject({
                method: "POST",
                url: "/auth/login",
                payload: { password: TEST_PASSWORD },
            });
            return response.json().token;
        }
        it("returns 204 and invalidates the calling token", async () => {
            const token = await loginAndGetToken();

            const logoutResponse = await app.inject({
                method: "POST",
                url: "/auth/logout",
                headers: { Authorization: `Bearer ${token}` },
            });
            expect(logoutResponse.statusCode).toBe(204);

            const afterResponse = await app.inject({
                method: "GET",
                url: "/entries",
                headers: { Authorization: `Bearer ${token}` },
            });
            expect(afterResponse.statusCode).toBe(401);
        });

        it("returns 401 when no token is provided", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/auth/logout",
            });
            expect(response.statusCode).toBe(401);
        });

        it("returns 401 when an invalid token is provided", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/auth/logout",
                headers: { Authorization: "Bearer invalidtoken" },
            });
            expect(response.statusCode).toBe(401);
        });
    });

    describe("POST /auth/logout/all", () => {
        let app: FastifyInstance;

        beforeAll(async () => {
            app = await buildApp();
        });

        afterAll(async () => {
            await app.close();
        });

        async function loginAndGetToken(): Promise<string> {
            const response = await app.inject({
                method: "POST",
                url: "/auth/login",
                payload: { password: TEST_PASSWORD },
            });
            return response.json().token;
        }
        it("returns 204 and invalidates all tokens", async () => {
            const token1 = await loginAndGetToken();
            const token2 = await loginAndGetToken();

            const logoutResponse = await app.inject({
                method: "POST",
                url: "/auth/logout/all",
                headers: { Authorization: `Bearer ${token1}` },
            });
            expect(logoutResponse.statusCode).toBe(204);

            const response1 = await app.inject({
                method: "GET",
                url: "/entries",
                headers: { Authorization: `Bearer ${token1}` },
            });
            expect(response1.statusCode).toBe(401);

            const response2 = await app.inject({
                method: "GET",
                url: "/entries",
                headers: { Authorization: `Bearer ${token2}` },
            });
            expect(response2.statusCode).toBe(401);

            getDb().prepare("UPDATE tokens SET invalidated_at = NULL").run();
        });

        it("returns 401 when no token is provided", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/auth/logout/all",
            });
            expect(response.statusCode).toBe(401);
        });
    });

    describe("POST /auth/login rate limiting", () => {
        it("allows up to 5 login attempts per minute", async () => {
            const app = await buildApp();
            try {
                for (let i = 0; i < 5; i++) {
                    const response = await app.inject({
                        method: "POST",
                        url: "/auth/login",
                        payload: { password: "wrong" },
                    });
                    expect(response.statusCode).not.toBe(429);
                }
            } finally {
                await app.close();
            }
        });

        it("returns 429 on the 6th login attempt within the window", async () => {
            const app = await buildApp();
            try {
                for (let i = 0; i < 5; i++) {
                    await app.inject({
                        method: "POST",
                        url: "/auth/login",
                        payload: { password: "wrong" },
                    });
                }

                const response = await app.inject({
                    method: "POST",
                    url: "/auth/login",
                    payload: { password: "wrong" },
                });
                expect(response.statusCode).toBe(429);
                expect(response.headers["retry-after"]).toBeDefined();
            } finally {
                await app.close();
            }
        });
    });
});
