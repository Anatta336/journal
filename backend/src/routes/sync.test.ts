import {
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    beforeAll,
    afterAll,
} from "vitest";
import fs from "fs/promises";
import path from "path";
import { createHash } from "crypto";
import { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { initDb, getDb } from "../db.js";
import {
    ensureStorageDirectories,
    saveEntry,
    DATA_DIR,
    TRASH_DIR,
} from "../services/storage.js";

const TEST_TOKEN = "test-bearer-token-for-sync-unit-tests";

function authHeader() {
    return { authorization: `Bearer ${TEST_TOKEN}` };
}

async function cleanupTestDirectories() {
    try {
        const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name === ".gitignore") continue;
            const fullPath = path.join(DATA_DIR, entry.name);
            if (entry.isDirectory() && entry.name === ".trash") {
                const trashEntries = await fs.readdir(fullPath, {
                    withFileTypes: true,
                });
                for (const trashEntry of trashEntries) {
                    if (trashEntry.name === ".gitignore") continue;
                    await fs.rm(path.join(fullPath, trashEntry.name), {
                        recursive: true,
                        force: true,
                    });
                }
            } else {
                await fs.rm(fullPath, { recursive: true, force: true });
            }
        }
    } catch {
        // Ignore if doesn't exist
    }
}

describe("Sync API", () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        process.env.NODE_ENV = "test";
        initDb();
        const db = getDb();
        const tokenHash = createHash("sha256").update(TEST_TOKEN).digest("hex");
        db.prepare(
            "INSERT OR IGNORE INTO tokens (hash, created_at, ip, user_agent) VALUES (?, ?, ?, ?)",
        ).run(tokenHash, new Date().toISOString(), "127.0.0.1", "test");
        app = await buildApp();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(async () => {
        await cleanupTestDirectories();
        await ensureStorageDirectories();
    });

    afterEach(async () => {
        await cleanupTestDirectories();
    });

    describe("GET /sync/status", () => {
        it("should return global hash", async () => {
            const response = await app.inject({
                method: "GET",
                url: "/sync/status",
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(body.globalHash).toBeDefined();
            expect(body.globalHash.length).toBe(64);
        });

        it("should return consistent hash for same entries", async () => {
            await saveEntry({
                id: "11111111-1111-1111-1111-111111111111",
                content: "Test",
                creationDate: "2024-01-01T00:00:00.000Z",
                lastUpdated: "2024-01-01T00:00:00.000Z",
                hash: "test-hash",
            });

            const response1 = await app.inject({
                method: "GET",
                url: "/sync/status",
                headers: authHeader(),
            });
            const response2 = await app.inject({
                method: "GET",
                url: "/sync/status",
                headers: authHeader(),
            });

            expect(response1.json().globalHash).toBe(
                response2.json().globalHash,
            );
        });
    });

    describe("GET /sync/manifest", () => {
        it("should return empty manifest when no entries", async () => {
            const response = await app.inject({
                method: "GET",
                url: "/sync/manifest",
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual([]);
        });

        it("should return manifest with entry metadata", async () => {
            await saveEntry({
                id: "22222222-2222-2222-2222-222222222222",
                content: "Test content",
                creationDate: "2024-01-01T00:00:00.000Z",
                lastUpdated: "2024-01-02T00:00:00.000Z",
                hash: "entry-hash-123",
            });

            const response = await app.inject({
                method: "GET",
                url: "/sync/manifest",
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const manifest = response.json();
            expect(manifest.length).toBe(1);
            expect(manifest[0]).toEqual({
                id: "22222222-2222-2222-2222-222222222222",
                hash: "entry-hash-123",
                lastUpdated: "2024-01-02T00:00:00.000Z",
            });
        });
    });

    describe("GET /sync/entries/:id", () => {
        it("should return full entry by id", async () => {
            await saveEntry({
                id: "33333333-3333-3333-3333-333333333333",
                content: "Full content here",
                creationDate: "2024-01-01T00:00:00.000Z",
                lastUpdated: "2024-01-02T00:00:00.000Z",
                hash: "full-hash",
            });

            const response = await app.inject({
                method: "GET",
                url: "/sync/entries/33333333-3333-3333-3333-333333333333",
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const entry = response.json();
            expect(entry.id).toBe("33333333-3333-3333-3333-333333333333");
            expect(entry.content).toBe("Full content here");
        });

        it("should return 404 for non-existent entry", async () => {
            const response = await app.inject({
                method: "GET",
                url: "/sync/entries/00000000-0000-0000-0000-000000000000",
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 400 for invalid UUID", async () => {
            const response = await app.inject({
                method: "GET",
                url: "/sync/entries/invalid-id",
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe("POST /sync/batch", () => {
        it("should create new entries", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/sync/batch",
                headers: authHeader(),
                payload: {
                    updates: [
                        {
                            id: "44444444-4444-4444-4444-444444444444",
                            content: "New entry",
                            creationDate: "2024-01-01T00:00:00.000Z",
                            lastUpdated: "2024-01-01T00:00:00.000Z",
                            hash: "new-hash",
                        },
                    ],
                },
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                updated: 1,
                deleted: 0,
            });

            const getResponse = await app.inject({
                method: "GET",
                url: "/sync/entries/44444444-4444-4444-4444-444444444444",
                headers: authHeader(),
            });
            expect(getResponse.statusCode).toBe(200);
            expect(getResponse.json().content).toBe("New entry");
        });

        it("should update existing entries", async () => {
            await saveEntry({
                id: "55555555-5555-5555-5555-555555555555",
                content: "Original",
                creationDate: "2024-01-01T00:00:00.000Z",
                lastUpdated: "2024-01-01T00:00:00.000Z",
                hash: "original-hash",
            });

            const response = await app.inject({
                method: "POST",
                url: "/sync/batch",
                headers: authHeader(),
                payload: {
                    updates: [
                        {
                            id: "55555555-5555-5555-5555-555555555555",
                            content: "Updated",
                            creationDate: "2024-01-01T00:00:00.000Z",
                            lastUpdated: "2024-01-02T00:00:00.000Z",
                            hash: "updated-hash",
                        },
                    ],
                },
            });

            expect(response.statusCode).toBe(200);

            const getResponse = await app.inject({
                method: "GET",
                url: "/sync/entries/55555555-5555-5555-5555-555555555555",
                headers: authHeader(),
            });
            expect(getResponse.json().content).toBe("Updated");
            expect(getResponse.json().hash).toBe("updated-hash");
        });

        it("should delete entries", async () => {
            await saveEntry({
                id: "66666666-6666-6666-6666-666666666666",
                content: "To delete",
                creationDate: "2024-01-01T00:00:00.000Z",
                lastUpdated: "2024-01-01T00:00:00.000Z",
                hash: "delete-hash",
            });

            const response = await app.inject({
                method: "POST",
                url: "/sync/batch",
                headers: authHeader(),
                payload: {
                    deletions: ["66666666-6666-6666-6666-666666666666"],
                },
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                updated: 0,
                deleted: 1,
            });

            const getResponse = await app.inject({
                method: "GET",
                url: "/sync/entries/66666666-6666-6666-6666-666666666666",
                headers: authHeader(),
            });
            expect(getResponse.statusCode).toBe(404);

            const trashFile = await fs
                .stat(`${TRASH_DIR}/66666666-6666-6666-6666-666666666666.md`)
                .then(() => true)
                .catch(() => false);
            expect(trashFile).toBe(true);
        });

        it("should handle updates and deletions in same request", async () => {
            await saveEntry({
                id: "77777777-7777-7777-7777-777777777777",
                content: "To delete",
                creationDate: "2024-01-01T00:00:00.000Z",
                lastUpdated: "2024-01-01T00:00:00.000Z",
                hash: "old-hash",
            });

            const response = await app.inject({
                method: "POST",
                url: "/sync/batch",
                headers: authHeader(),
                payload: {
                    updates: [
                        {
                            id: "88888888-8888-8888-8888-888888888888",
                            content: "New",
                            creationDate: "2024-01-01T00:00:00.000Z",
                            lastUpdated: "2024-01-01T00:00:00.000Z",
                            hash: "new-hash",
                        },
                    ],
                    deletions: ["77777777-7777-7777-7777-777777777777"],
                },
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual({
                updated: 1,
                deleted: 1,
            });
        });

        it("should return 400 for invalid entry format", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/sync/batch",
                headers: authHeader(),
                payload: {
                    updates: [
                        {
                            id: "invalid-uuid",
                            content: "Test",
                        },
                    ],
                },
            });

            expect(response.statusCode).toBe(400);
        });
    });
});
