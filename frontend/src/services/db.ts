import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type SyncStatus = "synced" | "pending" | "error";

export interface LocalEntry {
    id: string;
    content: string;
    creationDate: string;
    lastUpdated: string;
    hash?: string;
    tags?: string[];
    trashed: boolean;
    syncStatus: SyncStatus;
}

export interface SyncState {
    lastSyncTime?: string;
    globalHash?: string;
}

interface JournalDB extends DBSchema {
    entries: {
        key: string;
        value: LocalEntry;
        indexes: {
            "by-lastUpdated": string;
            "by-syncStatus": SyncStatus;
            "by-trashed": number;
        };
    };
    syncState: {
        key: string;
        value: SyncState;
    };
}

const DB_NAME = "journal-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<JournalDB>> | null = null;

export async function initDB(): Promise<IDBPDatabase<JournalDB>> {
    if (!dbPromise) {
        dbPromise = openDB<JournalDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains("entries")) {
                    const entriesStore = db.createObjectStore("entries", {
                        keyPath: "id",
                    });
                    entriesStore.createIndex("by-lastUpdated", "lastUpdated");
                    entriesStore.createIndex("by-syncStatus", "syncStatus");
                    entriesStore.createIndex("by-trashed", "trashed");
                }
                if (!db.objectStoreNames.contains("syncState")) {
                    db.createObjectStore("syncState");
                }
            },
        });
    }
    return dbPromise;
}

export async function getAllEntries(): Promise<LocalEntry[]> {
    const db = await initDB();
    const entries = await db.getAll("entries");
    return entries
        .filter((e) => !e.trashed)
        .sort(
            (a, b) =>
                new Date(b.creationDate).getTime() -
                new Date(a.creationDate).getTime(),
        );
}

export async function getAllEntriesIncludingTrashed(): Promise<LocalEntry[]> {
    const db = await initDB();
    return db.getAll("entries");
}

export async function getEntry(id: string): Promise<LocalEntry | undefined> {
    const db = await initDB();
    return db.get("entries", id);
}

export async function saveEntry(entry: LocalEntry): Promise<void> {
    const db = await initDB();
    await db.put("entries", entry);
}

export async function deleteEntry(id: string): Promise<void> {
    const db = await initDB();
    const entry = await db.get("entries", id);
    if (entry) {
        entry.trashed = true;
        entry.syncStatus = "pending";
        entry.lastUpdated = new Date().toISOString();
        await db.put("entries", entry);
    }
}

export async function hardDeleteEntry(id: string): Promise<void> {
    const db = await initDB();
    await db.delete("entries", id);
}

export async function getPendingEntries(): Promise<LocalEntry[]> {
    const db = await initDB();
    return db.getAllFromIndex("entries", "by-syncStatus", "pending");
}

export async function getTrashedEntries(): Promise<LocalEntry[]> {
    const db = await initDB();
    const entries = await db.getAll("entries");
    return entries.filter((e) => e.trashed);
}

export async function getSyncState(): Promise<SyncState> {
    const db = await initDB();
    const state = await db.get("syncState", "state");
    return state || {};
}

export async function setSyncState(state: Partial<SyncState>): Promise<void> {
    const db = await initDB();
    const current = await getSyncState();
    await db.put("syncState", { ...current, ...state }, "state");
}

export async function clearAllData(): Promise<void> {
    const db = await initDB();
    await db.clear("entries");
    await db.clear("syncState");
}
