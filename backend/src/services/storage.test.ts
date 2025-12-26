import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import {
    ensureStorageDirectories,
    createEntry,
    getEntry,
    getAllEntries,
    updateEntry,
    deleteEntry,
    saveEntry,
    calculateGlobalHash,
    getManifest,
    getAllFullEntries,
    DATA_DIR,
    TRASH_DIR,
} from "./storage.js";

async function cleanupTestDirectories() {
    try {
        const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name === ".gitignore") continue;
            const fullPath = path.join(DATA_DIR, entry.name);
            if (entry.isDirectory() && entry.name === ".trash") {
                const trashEntries = await fs.readdir(fullPath, { withFileTypes: true });
                for (const trashEntry of trashEntries) {
                    if (trashEntry.name === ".gitignore") continue;
                    await fs.rm(path.join(fullPath, trashEntry.name), { recursive: true, force: true });
                }
            } else {
                await fs.rm(fullPath, { recursive: true, force: true });
            }
        }
    } catch {
        // Ignore if doesn't exist
    }
}

describe("Storage Service", () => {
    beforeEach(async () => {
        await cleanupTestDirectories();
        await ensureStorageDirectories();
    });

    afterEach(async () => {
        await cleanupTestDirectories();
    });

    describe("ensureStorageDirectories", () => {
        it("should create data/entries and .trash directories", async () => {
            await cleanupTestDirectories();
            await ensureStorageDirectories();

            const entriesExists = await fs.stat(DATA_DIR).then(() => true).catch(() => false);
            const trashExists = await fs.stat(TRASH_DIR).then(() => true).catch(() => false);

            expect(entriesExists).toBe(true);
            expect(trashExists).toBe(true);
        });
    });

    describe("createEntry", () => {
        it("should create a new entry with UUID and frontmatter", async () => {
            const content = "This is my journal entry";
            const entry = await createEntry(content);

            expect(entry.id).toMatch(/^[0-9a-f-]{36}$/);
            expect(entry.content).toBe(content);
            expect(entry.creationDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
            expect(entry.lastUpdated).toBe(entry.creationDate);

            const filePath = path.join(DATA_DIR, `${entry.id}.md`);
            const fileContent = await fs.readFile(filePath, "utf-8");
            const parsed = matter(fileContent);

            expect(parsed.data.creationDate).toBe(entry.creationDate);
            expect(parsed.data.lastUpdated).toBe(entry.lastUpdated);
            expect(parsed.content.trim()).toBe(content);
        });

        it("should format dates as ISO 8601", async () => {
            const entry = await createEntry("Test content");

            const creationDate = new Date(entry.creationDate);
            expect(creationDate.toISOString()).toBe(entry.creationDate);

            const lastUpdated = new Date(entry.lastUpdated);
            expect(lastUpdated.toISOString()).toBe(entry.lastUpdated);
        });
    });

    describe("getEntry", () => {
        it("should return null for non-existent entry", async () => {
            const entry = await getEntry("00000000-0000-0000-0000-000000000000");
            expect(entry).toBeNull();
        });

        it("should parse an existing entry correctly", async () => {
            const created = await createEntry("My test entry");
            const fetched = await getEntry(created.id);

            expect(fetched).not.toBeNull();
            expect(fetched!.id).toBe(created.id);
            expect(fetched!.content).toBe("My test entry");
            expect(fetched!.creationDate).toBe(created.creationDate);
        });

        it("should handle files with missing creationDate by using file creation time", async () => {
            const id = "test-manual-file";
            const filePath = path.join(DATA_DIR, `${id}.md`);
            const fileContent = `---
lastUpdated: "2024-01-01T00:00:00.000Z"
---

Content without creation date`;

            await fs.writeFile(filePath, fileContent, "utf-8");

            const entry = await getEntry(id);

            expect(entry).not.toBeNull();
            expect(entry!.creationDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
        });
    });

    describe("getAllEntries", () => {
        it("should return empty array when no entries exist", async () => {
            const entries = await getAllEntries();
            expect(entries).toEqual([]);
        });

        it("should return entries sorted by creationDate descending", async () => {
            const entry1 = await createEntry("First entry");
            await new Promise(r => setTimeout(r, 10));
            const entry2 = await createEntry("Second entry");
            await new Promise(r => setTimeout(r, 10));
            const entry3 = await createEntry("Third entry");

            const entries = await getAllEntries();

            expect(entries.length).toBe(3);
            expect(entries[0].id).toBe(entry3.id);
            expect(entries[1].id).toBe(entry2.id);
            expect(entries[2].id).toBe(entry1.id);
        });

        it("should include preview of first 30 characters", async () => {
            const content = "This is a very long journal entry that exceeds thirty characters for testing the preview feature.";
            await createEntry(content);

            const entries = await getAllEntries();

            expect(entries[0].preview).toBe("This is a very long journal en");
            expect(entries[0].preview.length).toBe(30);
        });

        it("should skip malformed files", async () => {
            await createEntry("Valid entry");

            const badFilePath = path.join(DATA_DIR, "bad-file.md");
            await fs.writeFile(badFilePath, "---\ninvalid: yaml: ::::\n---\nContent", "utf-8");

            const entries = await getAllEntries();

            expect(entries.length).toBe(1);
        });
    });

    describe("updateEntry", () => {
        it("should update content and lastUpdated", async () => {
            const original = await createEntry("Original content");
            await new Promise(r => setTimeout(r, 10));

            const updated = await updateEntry(original.id, "Updated content");

            expect(updated).not.toBeNull();
            expect(updated!.content).toBe("Updated content");
            expect(updated!.creationDate).toBe(original.creationDate);
            expect(new Date(updated!.lastUpdated).getTime()).toBeGreaterThan(
                new Date(original.lastUpdated).getTime()
            );
        });

        it("should return null for non-existent entry", async () => {
            const result = await updateEntry("00000000-0000-0000-0000-000000000000", "New content");
            expect(result).toBeNull();
        });
    });

    describe("deleteEntry", () => {
        it("should soft-delete by moving file to .trash", async () => {
            const entry = await createEntry("Entry to delete");
            const originalPath = path.join(DATA_DIR, `${entry.id}.md`);
            const trashPath = path.join(TRASH_DIR, `${entry.id}.md`);

            const originalExists = await fs.stat(originalPath).then(() => true).catch(() => false);
            expect(originalExists).toBe(true);

            const deleted = await deleteEntry(entry.id);

            expect(deleted).toBe(true);

            const stillExists = await fs.stat(originalPath).then(() => true).catch(() => false);
            const inTrash = await fs.stat(trashPath).then(() => true).catch(() => false);

            expect(stillExists).toBe(false);
            expect(inTrash).toBe(true);
        });

        it("should return false for non-existent entry", async () => {
            const result = await deleteEntry("00000000-0000-0000-0000-000000000000");
            expect(result).toBe(false);
        });
    });

    describe("saveEntry", () => {
        it("should save entry with hash", async () => {
            const entry = {
                id: "test-entry-id",
                content: "Test content",
                creationDate: "2024-01-01T00:00:00.000Z",
                lastUpdated: "2024-01-02T00:00:00.000Z",
                hash: "abc123def456",
            };

            const saved = await saveEntry(entry);

            expect(saved).toEqual(entry);

            const retrieved = await getEntry(entry.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved!.hash).toBe("abc123def456");
            expect(retrieved!.content).toBe("Test content");
        });

        it("should save entry without hash", async () => {
            const entry = {
                id: "test-entry-no-hash",
                content: "Test content",
                creationDate: "2024-01-01T00:00:00.000Z",
                lastUpdated: "2024-01-02T00:00:00.000Z",
            };

            await saveEntry(entry);

            const retrieved = await getEntry(entry.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved!.hash).toBeUndefined();
        });
    });

    describe("getAllFullEntries", () => {
        it("should return all entries with full content", async () => {
            await createEntry("First entry content");
            await createEntry("Second entry content");

            const entries = await getAllFullEntries();

            expect(entries.length).toBe(2);
            expect(entries[0].content).toBeDefined();
            expect(entries[1].content).toBeDefined();
        });
    });

    describe("getManifest", () => {
        it("should return manifest with id, hash, and lastUpdated", async () => {
            const entry = {
                id: "manifest-test",
                content: "Test",
                creationDate: "2024-01-01T00:00:00.000Z",
                lastUpdated: "2024-01-02T00:00:00.000Z",
                hash: "manifest-hash-123",
            };
            await saveEntry(entry);

            const manifest = await getManifest();

            expect(manifest.length).toBe(1);
            expect(manifest[0]).toEqual({
                id: "manifest-test",
                hash: "manifest-hash-123",
                lastUpdated: "2024-01-02T00:00:00.000Z",
            });
        });
    });

    describe("calculateGlobalHash", () => {
        it("should return consistent hash for same entries", async () => {
            await saveEntry({
                id: "aaa-entry",
                content: "Content A",
                creationDate: "2024-01-01T00:00:00.000Z",
                lastUpdated: "2024-01-01T00:00:00.000Z",
                hash: "hash-a",
            });
            await saveEntry({
                id: "bbb-entry",
                content: "Content B",
                creationDate: "2024-01-01T00:00:00.000Z",
                lastUpdated: "2024-01-01T00:00:00.000Z",
                hash: "hash-b",
            });

            const hash1 = await calculateGlobalHash();
            const hash2 = await calculateGlobalHash();

            expect(hash1).toBe(hash2);
            expect(hash1.length).toBe(64);
        });

        it("should produce different hash when entries change", async () => {
            await saveEntry({
                id: "change-test",
                content: "Content",
                creationDate: "2024-01-01T00:00:00.000Z",
                lastUpdated: "2024-01-01T00:00:00.000Z",
                hash: "original-hash",
            });

            const hash1 = await calculateGlobalHash();

            await saveEntry({
                id: "change-test",
                content: "Content Updated",
                creationDate: "2024-01-01T00:00:00.000Z",
                lastUpdated: "2024-01-02T00:00:00.000Z",
                hash: "updated-hash",
            });

            const hash2 = await calculateGlobalHash();

            expect(hash1).not.toBe(hash2);
        });

        it("should sort entries by ID for consistent hashing", async () => {
            await saveEntry({
                id: "zzz-entry",
                content: "Z",
                creationDate: "2024-01-01T00:00:00.000Z",
                lastUpdated: "2024-01-01T00:00:00.000Z",
                hash: "hash-z",
            });

            const hash1 = await calculateGlobalHash();

            await cleanupTestDirectories();
            await ensureStorageDirectories();

            await saveEntry({
                id: "aaa-entry",
                content: "A",
                creationDate: "2024-01-01T00:00:00.000Z",
                lastUpdated: "2024-01-01T00:00:00.000Z",
                hash: "hash-a",
            });
            await saveEntry({
                id: "zzz-entry",
                content: "Z",
                creationDate: "2024-01-01T00:00:00.000Z",
                lastUpdated: "2024-01-01T00:00:00.000Z",
                hash: "hash-z",
            });

            const hash2 = await calculateGlobalHash();

            expect(hash1).not.toBe(hash2);
        });
    });

    describe("Tags", () => {
        it("should create entry with tags", async () => {
            const entry = await createEntry("Entry with tags", ["work", "important"]);

            expect(entry.tags).toEqual(["work", "important"]);

            const fetched = await getEntry(entry.id);
            expect(fetched!.tags).toEqual(["work", "important"]);
        });

        it("should create entry without tags", async () => {
            const entry = await createEntry("Entry without tags");

            expect(entry.tags).toBeUndefined();

            const fetched = await getEntry(entry.id);
            expect(fetched!.tags).toBeUndefined();
        });

        it("should update entry with tags", async () => {
            const original = await createEntry("Original content");
            const updated = await updateEntry(original.id, "Updated content", ["new-tag"]);

            expect(updated!.tags).toEqual(["new-tag"]);

            const fetched = await getEntry(original.id);
            expect(fetched!.tags).toEqual(["new-tag"]);
        });

        it("should include tags in getAllEntries", async () => {
            await createEntry("Entry with tags", ["work", "journal"]);

            const entries = await getAllEntries();

            expect(entries[0].tags).toEqual(["work", "journal"]);
        });

        it("should save entry with tags via saveEntry", async () => {
            const entry = {
                id: "test-save-entry-tags",
                content: "Content",
                creationDate: "2024-01-01T00:00:00.000Z",
                lastUpdated: "2024-01-01T00:00:00.000Z",
                hash: "test-hash",
                tags: ["tag1", "tag2"],
            };

            await saveEntry(entry);

            const fetched = await getEntry(entry.id);
            expect(fetched!.tags).toEqual(["tag1", "tag2"]);
        });

        it("should store tags as YAML array in file", async () => {
            const entry = await createEntry("Content", ["work", "personal"]);

            const filePath = path.join(DATA_DIR, `${entry.id}.md`);
            const fileContent = await fs.readFile(filePath, "utf-8");
            const parsed = matter(fileContent);

            expect(parsed.data.tags).toEqual(["work", "personal"]);
        });
    });
});
