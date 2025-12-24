import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import fs from "fs/promises";
import { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { ensureStorageDirectories, DATA_DIR, TRASH_DIR } from "../services/storage.js";

async function cleanupTestDirectories() {
    try {
        await fs.rm(DATA_DIR, { recursive: true, force: true });
    } catch {
        // Ignore if doesn't exist
    }
}

describe("Entries API", () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        process.env.NODE_ENV = "test";
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
            });

            expect(response.statusCode).toBe(200);
            expect(response.json()).toEqual([]);
        });

        it("should return all entries with previews", async () => {
            await app.inject({
                method: "POST",
                url: "/entries",
                payload: { content: "This is a test entry with more than thirty characters for preview" },
            });

            const response = await app.inject({
                method: "GET",
                url: "/entries",
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
                payload: { content: "First entry" },
            });
            await new Promise(r => setTimeout(r, 10));
            await app.inject({
                method: "POST",
                url: "/entries",
                payload: { content: "Second entry" },
            });

            const response = await app.inject({
                method: "GET",
                url: "/entries",
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
                payload: { content: "Full content of the entry" },
            });
            const created = createResponse.json();

            const response = await app.inject({
                method: "GET",
                url: `/entries/${created.id}`,
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
            });

            expect(response.statusCode).toBe(404);
            expect(response.json().error).toBe("Entry not found");
        });

        it("should return 400 for invalid UUID format", async () => {
            const response = await app.inject({
                method: "GET",
                url: "/entries/invalid-id",
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe("PUT /entries/:id", () => {
        it("should update the entry content", async () => {
            const createResponse = await app.inject({
                method: "POST",
                url: "/entries",
                payload: { content: "Original content" },
            });
            const created = createResponse.json();

            await new Promise(r => setTimeout(r, 10));

            const response = await app.inject({
                method: "PUT",
                url: `/entries/${created.id}`,
                payload: { content: "Updated content" },
            });

            expect(response.statusCode).toBe(200);
            const updated = response.json();
            expect(updated.content).toBe("Updated content");
            expect(updated.creationDate).toBe(created.creationDate);
            expect(new Date(updated.lastUpdated).getTime()).toBeGreaterThan(
                new Date(created.lastUpdated).getTime()
            );
        });

        it("should return 404 for non-existent entry", async () => {
            const response = await app.inject({
                method: "PUT",
                url: "/entries/00000000-0000-0000-0000-000000000000",
                payload: { content: "Updated content" },
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 400 for missing content", async () => {
            const createResponse = await app.inject({
                method: "POST",
                url: "/entries",
                payload: { content: "Original content" },
            });
            const created = createResponse.json();

            const response = await app.inject({
                method: "PUT",
                url: `/entries/${created.id}`,
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
                payload: { content: "Entry to delete" },
            });
            const created = createResponse.json();

            const deleteResponse = await app.inject({
                method: "DELETE",
                url: `/entries/${created.id}`,
            });

            expect(deleteResponse.statusCode).toBe(204);

            const getResponse = await app.inject({
                method: "GET",
                url: `/entries/${created.id}`,
            });

            expect(getResponse.statusCode).toBe(404);

            const trashPath = `${TRASH_DIR}/${created.id}.md`;
            const trashExists = await fs.stat(trashPath).then(() => true).catch(() => false);
            expect(trashExists).toBe(true);
        });

        it("should return 404 for non-existent entry", async () => {
            const response = await app.inject({
                method: "DELETE",
                url: "/entries/00000000-0000-0000-0000-000000000000",
            });

            expect(response.statusCode).toBe(404);
        });

        it("should return 400 for invalid UUID format", async () => {
            const response = await app.inject({
                method: "DELETE",
                url: "/entries/invalid-id",
            });

            expect(response.statusCode).toBe(400);
        });
    });
});
