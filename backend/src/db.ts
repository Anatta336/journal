import Database from "better-sqlite3";
import { load as loadSqliteVec } from "sqlite-vec";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const isTesting =
    process.env.TESTING === "true" || process.env.NODE_ENV === "test";
const dataFolder = isTesting ? "data-test" : "data";
const DB_PATH = path.join(PROJECT_ROOT, dataFolder, "journal.db");

let db: Database.Database | null = null;

export function initDb(): void {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    loadSqliteVec(db);
    db.exec(`
        CREATE TABLE IF NOT EXISTS auth (
            id INTEGER PRIMARY KEY,
            hash TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hash TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL,
            ip TEXT NOT NULL,
            user_agent TEXT NOT NULL
        );
    `);

    try {
        db.exec("ALTER TABLE tokens ADD COLUMN invalidated_at TEXT");
    } catch (e: any) {
        if (!e.message.includes("duplicate column name")) throw e;
    }
}

export function getDb(): Database.Database {
    if (!db) {
        throw new Error("Database not initialised — call initDb() first");
    }
    return db;
}
