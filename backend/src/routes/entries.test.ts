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
    DATA_DIR,
    TRASH_DIR,
} from "../services/storage.js";

const TEST_TOKEN = "test-bearer-token-for-entries-unit-tests";

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

describe("Entries API", () => {
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

    describe("GET /entries", () => {
        it("should return empty array when no entries exist", async () => {
            const response = await app.inject({
                method: "GET",
                url: "/entries",
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual([]);
        });

        it("should return all entries with previews", async () => {
            await app.inject({
                method: "POST",
                url: "/entries",
                headers: authHeader(),
                payload: {
                    content:
                        "This is a test entry with more than thirty characters for preview",
                },
            });

            const response = await app.inject({
                method: "GET",
                url: "/entries",
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const entries = response.json();
            expect(entries.length).toBe(1);
            expect(entries[0].preview).toBe("This is a test entry with more");
            expect(entries[0].id).toBeDefined();
            expect(entries[0].creationDate).toBeDefined();
            expect(entries[0].lastUpdated).toBeDefined();
        });

        it("should return entries sorted by creationDate descending", async () => {
            await app.inject({
                method: "POST",
                url: "/entries",
                headers: authHeader(),
                payload: { content: "First entry" },
            });
            await new Promise((r) => setTimeout(r, 10));
            await app.inject({
                method: "POST",
                url: "/entries",
                headers: authHeader(),
                payload: { content: "Second entry" },
            });

            const response = await app.inject({
                method: "GET",
                url: "/entries",
                headers: authHeader(),
            });

            const entries = response.json();
            expect(entries.length).toBe(2);
            expect(entries[0].preview).toBe("Second entry");
            expect(entries[1].preview).toBe("First entry");
        });
    });

    describe("POST /entries", () => {
        it("should create a new entry and return 201", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/entries",
                headers: authHeader(),
                payload: { content: "My new journal entry" },
            });

            expect(response.statusCode).toBe(201);
            const entry = response.json();
            expect(entry.id).toMatch(/^[0-9a-f-]{36}$/);
            expect(entry.content).toBe("My new journal entry");
            expect(entry.creationDate).toBeDefined();
            expect(entry.lastUpdated).toBe(entry.creationDate);
        });

        it("should return 400 for missing content", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/entries",
                headers: authHeader(),
                payload: {},
            });

            expect(response.statusCode).toBe(400);
            const body = response.json();
            expect(body.error).toBe("Invalid request");
        });

        it("should return 400 for empty content", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/entries",
                headers: authHeader(),
                payload: { content: "" },
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe("GET /entries/:id", () => {
        it("should return the entry with full content", async () => {
            const createResponse = await app.inject({
                method: "POST",
                url: "/entries",
                headers: authHeader(),
                payload: { content: "Full content of the entry" },
            });
            const created = createResponse.json();

            const response = await app.inject({
                method: "GET",
                url: `/entries/${created.id}`,
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const entry = response.json();
            expect(entry.id).toBe(created.id);
            expect(entry.content).toBe("Full content of the entry");
            expect(entry.creationDate).toBe(created.creationDate);
        });

        it("should return 404 for non-existent entry", async () => {
            const response = await app.inject({
                method: "GET",
                url: "/entries/00000000-0000-0000-0000-000000000000",
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(404);
            expect(response.json().error).toBe("Entry not found");
        });

        it("should return 400 for invalid UUID format", async () => {
            const response = await app.inject({
                method: "GET",
                url: "/entries/invalid-id",
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe("PUT /entries/:id", () => {
        it("should update the entry content", async () => {
            const createResponse = await app.inject({
                method: "POST",
                url: "/entries",
                headers: authHeader(),
                payload: { content: "Original content" },
            });
            const created = createResponse.json();

            await new Promise((r) => setTimeout(r, 10));

            const response = await app.inject({
                method: "PUT",
                url: `/entries/${created.id}`,
                headers: authHeader(),
                payload: { content: "Updated content" },
            });

            expect(response.statusCode).toBe(200);
            const updated = response.json();
            expect(updated.content).toBe("Updated content");
            expect(updated.creationDate).toBe(created.creationDate);
            expect(new Date(updated.lastUpdated).getTime()).toBeGreaterThan(
                new Date(created.lastUpdated).getTime(),
            );
        });

        it("should return 404 for non-existent entry", async () => {
            const response = await app.inject({
                method: "PUT",
                url: "/entries/00000000-0000-0000-0000-000000000000",
                headers: authHeader(),
                payload: { content: "Updated content" },
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 400 for missing content", async () => {
            const createResponse = await app.inject({
                method: "POST",
                url: "/entries",
                headers: authHeader(),
                payload: { content: "Original content" },
            });
            const created = createResponse.json();

            const response = await app.inject({
                method: "PUT",
                url: `/entries/${created.id}`,
                headers: authHeader(),
                payload: {},
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe("DELETE /entries/:id", () => {
        it("should soft-delete and return 204", async () => {
            const createResponse = await app.inject({
                method: "POST",
                url: "/entries",
                headers: authHeader(),
                payload: { content: "Entry to delete" },
            });
            const created = createResponse.json();

            const deleteResponse = await app.inject({
                method: "DELETE",
                url: `/entries/${created.id}`,
                headers: authHeader(),
            });

            expect(deleteResponse.statusCode).toBe(204);

            const getResponse = await app.inject({
                method: "GET",
                url: `/entries/${created.id}`,
                headers: authHeader(),
            });

            expect(getResponse.statusCode).toBe(404);

            const trashPath = `${TRASH_DIR}/${created.id}.md`;
            const trashExists = await fs
                .stat(trashPath)
                .then(() => true)
                .catch(() => false);
            expect(trashExists).toBe(true);
        });

        it("should return 404 for non-existent entry", async () => {
            const response = await app.inject({
                method: "DELETE",
                url: "/entries/00000000-0000-0000-0000-000000000000",
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 400 for invalid UUID format", async () => {
            const response = await app.inject({
                method: "DELETE",
                url: "/entries/invalid-id",
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe("Tags", () => {
        it("should create entry with tags", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/entries",
                headers: authHeader(),
                payload: {
                    content: "Entry with tags",
                    tags: ["work", "important"],
                },
            });

            expect(response.statusCode).toBe(201);
            const entry = response.json();
            expect(entry.tags).toEqual(["work", "important"]);
        });

        it("should update entry with tags", async () => {
            const createResponse = await app.inject({
                method: "POST",
                url: "/entries",
                headers: authHeader(),
                payload: { content: "Original content" },
            });
            const created = createResponse.json();

            const response = await app.inject({
                method: "PUT",
                url: `/entries/${created.id}`,
                headers: authHeader(),
                payload: { content: "Updated content", tags: ["new-tag"] },
            });

            expect(response.statusCode).toBe(200);
            const updated = response.json();
            expect(updated.tags).toEqual(["new-tag"]);
        });

        it("should return tags in entry list", async () => {
            await app.inject({
                method: "POST",
                url: "/entries",
                headers: authHeader(),
                payload: {
                    content: "Entry with tags",
                    tags: ["work", "journal"],
                },
            });

            const response = await app.inject({
                method: "GET",
                url: "/entries",
                headers: authHeader(),
            });

            expect(response.statusCode).toBe(200);
            const entries = response.json();
            expect(entries[0].tags).toEqual(["work", "journal"]);
        });

        it("should reject tags with invalid characters", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/entries",
                headers: authHeader(),
                payload: { content: "Content", tags: ["invalid tag!"] },
            });

            expect(response.statusCode).toBe(400);
        });

        it("should reject tags longer than 20 characters", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/entries",
                headers: authHeader(),
                payload: {
                    content: "Content",
                    tags: ["this-tag-is-way-too-long-for-us"],
                },
            });

            expect(response.statusCode).toBe(400);
        });

        it("should accept valid tag with alphanumeric and hyphens", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/entries",
                headers: authHeader(),
                payload: { content: "Content", tags: ["valid-Tag-123"] },
            });

            expect(response.statusCode).toBe(201);
            const entry = response.json();
            expect(entry.tags).toEqual(["valid-Tag-123"]);
        });
    });
});
