import argon2 from "argon2";
import { getDb } from "../db.js";

export async function initPassword(password: string): Promise<void> {
    const hash = await argon2.hash(password);
    const db = getDb();
    db.prepare("DELETE FROM auth").run();
    db.prepare("INSERT INTO auth (id, hash) VALUES (1, ?)").run(hash);
}

export async function verifyPassword(candidate: string): Promise<boolean> {
    const db = getDb();
    const row = db.prepare("SELECT hash FROM auth LIMIT 1").get() as
        | { hash: string }
        | undefined;
    if (!row) return false;
    return argon2.verify(row.hash, candidate);
}
