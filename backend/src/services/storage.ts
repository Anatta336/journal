import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import { v4 as uuidv4 } from "uuid";
import { createHash } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");

const isTesting = process.env.TESTING === "true";
const dataFolder = isTesting ? "data-test" : "data";
const DATA_DIR = path.join(PROJECT_ROOT, dataFolder, "entries");
const TRASH_DIR = path.join(DATA_DIR, ".trash");

function calculateEntryHash(content: string): string {
    return createHash("sha256").update(content).digest("hex");
}

export interface EntryMetadata {
    id: string;
    creationDate: string;
    lastUpdated: string;
    hash?: string;
}

export interface Entry extends EntryMetadata {
    content: string;
}

export interface EntryPreview extends EntryMetadata {
    preview: string;
}

export async function ensureStorageDirectories(): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(TRASH_DIR, { recursive: true });
}

function getEntryPath(id: string): string {
    return path.join(DATA_DIR, `${id}.md`);
}

function getTrashPath(id: string): string {
    return path.join(TRASH_DIR, `${id}.md`);
}

async function getFileCreationTime(filePath: string): Promise<Date> {
    const stats = await fs.stat(filePath);
    return stats.birthtime;
}

export async function getAllEntries(): Promise<EntryPreview[]> {
    const files = await fs.readdir(DATA_DIR);
    const entries: EntryPreview[] = [];

    for (const file of files) {
        if (!file.endsWith(".md")) continue;

        const filePath = path.join(DATA_DIR, file);
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) continue;

        try {
            const id = file.replace(".md", "");
            const entry = await getEntry(id);
            if (entry) {
                entries.push({
                    id: entry.id,
                    creationDate: entry.creationDate,
                    lastUpdated: entry.lastUpdated,
                    hash: entry.hash,
                    preview: entry.content.slice(0, 30),
                });
            }
        } catch {
            continue;
        }
    }

    entries.sort((a, b) =>
        new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()
    );

    return entries;
}

export async function getEntry(id: string): Promise<Entry | null> {
    const filePath = getEntryPath(id);

    try {
        await fs.access(filePath);
    } catch {
        return null;
    }

    const fileContent = await fs.readFile(filePath, "utf-8");

    try {
        const parsed = matter(fileContent);
        const data = parsed.data as Record<string, unknown>;

        let creationDate = data.creationDate as string | undefined;
        if (!creationDate) {
            const fileCreationTime = await getFileCreationTime(filePath);
            creationDate = fileCreationTime.toISOString();
            await saveEntryToFile(id, parsed.content, creationDate, data.lastUpdated as string || creationDate);
        }

        const lastUpdated = (data.lastUpdated as string) || creationDate;
        const hash = data.hash as string | undefined;

        return {
            id,
            creationDate,
            lastUpdated,
            hash,
            content: parsed.content.trim(),
        };
    } catch {
        return null;
    }
}

async function saveEntryToFile(
    id: string,
    content: string,
    creationDate: string,
    lastUpdated: string,
    hash?: string
): Promise<void> {
    const filePath = getEntryPath(id);
    const frontmatter: Record<string, string> = {
        creationDate,
        lastUpdated,
    };
    if (hash) {
        frontmatter.hash = hash;
    }

    const fileContent = matter.stringify(content, frontmatter);
    await fs.writeFile(filePath, fileContent, "utf-8");
}

export async function createEntry(content: string): Promise<Entry> {
    const id = uuidv4();
    const now = new Date().toISOString();
    const hash = calculateEntryHash(content);

    await saveEntryToFile(id, content, now, now, hash);

    return {
        id,
        creationDate: now,
        lastUpdated: now,
        hash,
        content,
    };
}

export async function updateEntry(id: string, content: string): Promise<Entry | null> {
    const existing = await getEntry(id);
    if (!existing) {
        return null;
    }

    const now = new Date().toISOString();
    const hash = calculateEntryHash(content);
    await saveEntryToFile(id, content, existing.creationDate, now, hash);

    return {
        id,
        creationDate: existing.creationDate,
        lastUpdated: now,
        hash,
        content,
    };
}

export async function deleteEntry(id: string): Promise<boolean> {
    const filePath = getEntryPath(id);
    const trashPath = getTrashPath(id);

    try {
        await fs.access(filePath);
    } catch {
        return false;
    }

    await fs.rename(filePath, trashPath);
    return true;
}

export interface ManifestEntry {
    id: string;
    hash?: string;
    lastUpdated: string;
}

export async function getAllFullEntries(): Promise<Entry[]> {
    const files = await fs.readdir(DATA_DIR);
    const entries: Entry[] = [];

    for (const file of files) {
        if (!file.endsWith(".md")) continue;

        const filePath = path.join(DATA_DIR, file);
        const stat = await fs.stat(filePath);
        if (!stat.isFile()) continue;

        try {
            const id = file.replace(".md", "");
            const entry = await getEntry(id);
            if (entry) {
                entries.push(entry);
            }
        } catch {
            continue;
        }
    }

    return entries;
}

export async function getManifest(): Promise<ManifestEntry[]> {
    const entries = await getAllFullEntries();
    return entries.map((entry) => ({
        id: entry.id,
        hash: entry.hash,
        lastUpdated: entry.lastUpdated,
    }));
}

export async function calculateGlobalHash(): Promise<string> {
    const entries = await getAllFullEntries();
    const sortedEntries = entries.sort((a, b) => a.id.localeCompare(b.id));
    const concatenatedHashes = sortedEntries.map((e) => e.hash || "").join("");
    return createHash("sha256").update(concatenatedHashes).digest("hex");
}

export async function saveEntry(entry: Entry): Promise<Entry> {
    await saveEntryToFile(
        entry.id,
        entry.content,
        entry.creationDate,
        entry.lastUpdated,
        entry.hash
    );
    return entry;
}

export async function deleteEntries(ids: string[]): Promise<void> {
    for (const id of ids) {
        await deleteEntry(id);
    }
}

export { DATA_DIR, TRASH_DIR };
