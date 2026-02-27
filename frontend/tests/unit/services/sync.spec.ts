import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { forceRefresh, getIsSyncing } from "@/services/sync";
import * as db from "@/services/db";

const mockFetch = vi.fn();
const originalFetch = global.fetch;
const originalNavigator = global.navigator;

describe("forceRefresh", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = mockFetch;
        Object.defineProperty(global, "navigator", {
            value: { onLine: true },
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        global.fetch = originalFetch;
        Object.defineProperty(global, "navigator", {
            value: originalNavigator,
            writable: true,
            configurable: true,
        });
    });

    it("should throw error if offline", async () => {
        Object.defineProperty(global, "navigator", {
            value: { onLine: false },
            writable: true,
            configurable: true,
        });

        await expect(forceRefresh()).rejects.toThrow(
            "Cannot force refresh while offline",
        );
    });

    it("should delete local entries not in server manifest", async () => {
        const mockLocalEntries: db.LocalEntry[] = [
            {
                id: "local-only-1",
                content: "Local only entry",
                creationDate: "2024-01-01T00:00:00Z",
                lastUpdated: "2024-01-01T00:00:00Z",
                trashed: false,
                syncStatus: "pending",
            },
            {
                id: "server-entry-1",
                content: "Synced entry",
                creationDate: "2024-01-01T00:00:00Z",
                lastUpdated: "2024-01-01T00:00:00Z",
                trashed: false,
                syncStatus: "synced",
            },
        ];

        const serverManifest = [
            { id: "server-entry-1", lastUpdated: "2024-01-01T00:00:00Z" },
        ];
        const serverEntry = {
            id: "server-entry-1",
            content: "Server content",
            creationDate: "2024-01-01T00:00:00Z",
            lastUpdated: "2024-01-01T00:00:00Z",
        };

        vi.spyOn(db, "getAllEntriesIncludingTrashed").mockResolvedValue(
            mockLocalEntries,
        );
        const hardDeleteSpy = vi
            .spyOn(db, "hardDeleteEntry")
            .mockResolvedValue();
        vi.spyOn(db, "saveEntry").mockResolvedValue();
        vi.spyOn(db, "setSyncState").mockResolvedValue();

        mockFetch.mockImplementation((url: string) => {
            if (url.includes("/sync/manifest")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(serverManifest),
                });
            }
            if (url.includes("/sync/entries/server-entry-1")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(serverEntry),
                });
            }
            if (url.includes("/sync/status")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ globalHash: "abc123" }),
                });
            }
            return Promise.resolve({ ok: false });
        });

        await forceRefresh();

        expect(hardDeleteSpy).toHaveBeenCalledWith("local-only-1");
        expect(hardDeleteSpy).not.toHaveBeenCalledWith("server-entry-1");
    });

    it("should overwrite local entries with server data", async () => {
        const mockLocalEntries: db.LocalEntry[] = [
            {
                id: "entry-1",
                content: "Old local content",
                creationDate: "2024-01-01T00:00:00Z",
                lastUpdated: "2024-01-01T00:00:00Z",
                trashed: false,
                syncStatus: "pending",
            },
        ];

        const serverManifest = [
            { id: "entry-1", lastUpdated: "2024-01-02T00:00:00Z" },
        ];
        const serverEntry = {
            id: "entry-1",
            content: "New server content",
            creationDate: "2024-01-01T00:00:00Z",
            lastUpdated: "2024-01-02T00:00:00Z",
            hash: "server-hash",
            tags: ["tag1"],
        };

        vi.spyOn(db, "getAllEntriesIncludingTrashed").mockResolvedValue(
            mockLocalEntries,
        );
        vi.spyOn(db, "hardDeleteEntry").mockResolvedValue();
        const saveEntrySpy = vi.spyOn(db, "saveEntry").mockResolvedValue();
        vi.spyOn(db, "setSyncState").mockResolvedValue();

        mockFetch.mockImplementation((url: string) => {
            if (url.includes("/sync/manifest")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(serverManifest),
                });
            }
            if (url.includes("/sync/entries/entry-1")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(serverEntry),
                });
            }
            if (url.includes("/sync/status")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ globalHash: "abc123" }),
                });
            }
            return Promise.resolve({ ok: false });
        });

        await forceRefresh();

        expect(saveEntrySpy).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "entry-1",
                content: "New server content",
                hash: "server-hash",
                tags: ["tag1"],
                syncStatus: "synced",
            }),
        );
    });

    it("should call progress callback with correct values", async () => {
        const mockLocalEntries: db.LocalEntry[] = [];

        const serverManifest = [
            { id: "entry-1", lastUpdated: "2024-01-01T00:00:00Z" },
            { id: "entry-2", lastUpdated: "2024-01-01T00:00:00Z" },
            { id: "entry-3", lastUpdated: "2024-01-01T00:00:00Z" },
        ];

        vi.spyOn(db, "getAllEntriesIncludingTrashed").mockResolvedValue(
            mockLocalEntries,
        );
        vi.spyOn(db, "hardDeleteEntry").mockResolvedValue();
        vi.spyOn(db, "saveEntry").mockResolvedValue();
        vi.spyOn(db, "setSyncState").mockResolvedValue();

        mockFetch.mockImplementation((url: string) => {
            if (url.includes("/sync/manifest")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(serverManifest),
                });
            }
            if (url.includes("/sync/entries/")) {
                const id = url.split("/").pop();
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            id,
                            content: "Content",
                            creationDate: "2024-01-01T00:00:00Z",
                            lastUpdated: "2024-01-01T00:00:00Z",
                        }),
                });
            }
            if (url.includes("/sync/status")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ globalHash: "abc123" }),
                });
            }
            return Promise.resolve({ ok: false });
        });

        const progressCallback = vi.fn();
        await forceRefresh(progressCallback);

        expect(progressCallback).toHaveBeenCalledWith(1, 3);
        expect(progressCallback).toHaveBeenCalledWith(2, 3);
        expect(progressCallback).toHaveBeenCalledWith(3, 3);
    });

    it("should set isSyncing to false after completion", async () => {
        vi.spyOn(db, "getAllEntriesIncludingTrashed").mockResolvedValue([]);
        vi.spyOn(db, "hardDeleteEntry").mockResolvedValue();
        vi.spyOn(db, "saveEntry").mockResolvedValue();
        vi.spyOn(db, "setSyncState").mockResolvedValue();

        mockFetch.mockImplementation((url: string) => {
            if (url.includes("/sync/manifest")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([]),
                });
            }
            if (url.includes("/sync/status")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ globalHash: "abc123" }),
                });
            }
            return Promise.resolve({ ok: false });
        });

        await forceRefresh();

        expect(getIsSyncing()).toBe(false);
    });

    it("should update sync state after completion", async () => {
        vi.spyOn(db, "getAllEntriesIncludingTrashed").mockResolvedValue([]);
        vi.spyOn(db, "hardDeleteEntry").mockResolvedValue();
        vi.spyOn(db, "saveEntry").mockResolvedValue();
        const setSyncStateSpy = vi
            .spyOn(db, "setSyncState")
            .mockResolvedValue();

        mockFetch.mockImplementation((url: string) => {
            if (url.includes("/sync/manifest")) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve([]),
                });
            }
            if (url.includes("/sync/status")) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({ globalHash: "new-global-hash" }),
                });
            }
            return Promise.resolve({ ok: false });
        });

        await forceRefresh();

        expect(setSyncStateSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                globalHash: "new-global-hash",
            }),
        );
    });
});
