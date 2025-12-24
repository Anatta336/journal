import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";
import { v4 as uuidv4 } from "uuid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..", "..");

const isTesting = process.env.TESTING === "true";
const dataFolder = isTesting ? "data-test" : "data";
const DATA_DIR = path.join(PROJECT_ROOT, dataFolder, "entries");
const TRASH_DIR = path.join(DATA_DIR, ".trash");

export interface EntryMetadata {
    id: string;
    creationDate: string;
    lastUpdated: string;
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
    // TODO: Add file locking for concurrent access
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
                    preview: entry.content.slice(0, 30),
                });
            }
        } catch {
            // Skip malformed files
            continue;
        }
    }

    entries.sort((a, b) =>
        new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()
    );

    return entries;
}

export async function getEntry(id: string): Promise<Entry | null> {
    // TODO: Add file locking for concurrent access
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
            // Update the file with the creation date
            await saveEntryToFile(id, parsed.content, creationDate, data.lastUpdated as string || creationDate);
        }

        const lastUpdated = (data.lastUpdated as string) || creationDate;

        return {
            id,
            creationDate,
            lastUpdated,
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
    lastUpdated: string
): Promise<void> {
    // TODO: Add file locking for concurrent access
    const filePath = getEntryPath(id);
    const frontmatter = {
        creationDate,
        lastUpdated,
    };

    const fileContent = matter.stringify(content, frontmatter);
    await fs.writeFile(filePath, fileContent, "utf-8");
}

export async function createEntry(content: string): Promise<Entry> {
    const id = uuidv4();
    const now = new Date().toISOString();

    await saveEntryToFile(id, content, now, now);

    return {
        id,
        creationDate: now,
        lastUpdated: now,
        content,
    };
}

export async function updateEntry(id: string, content: string): Promise<Entry | null> {
    const existing = await getEntry(id);
    if (!existing) {
        return null;
    }

    const now = new Date().toISOString();
    await saveEntryToFile(id, content, existing.creationDate, now);

    return {
        id,
        creationDate: existing.creationDate,
        lastUpdated: now,
        content,
    };
}

export async function deleteEntry(id: string): Promise<boolean> {
    // TODO: Add file locking for concurrent access
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

export { DATA_DIR, TRASH_DIR };
