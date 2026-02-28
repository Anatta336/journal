import { randomBytes, createHash } from "crypto";
import { getDb } from "../db.js";
import { verifyPassword } from "../services/auth.js";

export interface OAuthClient {
    client_id: string;
    client_secret: string;
    redirect_uri: string;
    client_name: string | null;
}

export function registerClient(
    redirectUri: string,
    clientName?: string,
): OAuthClient {
    const clientId = randomBytes(16).toString("hex");
    const clientSecret = randomBytes(32).toString("hex");
    const db = getDb();
    db.prepare(
        "INSERT INTO oauth_clients (client_id, client_secret, redirect_uri, client_name, created_at) VALUES (?, ?, ?, ?, ?)",
    ).run(clientId, clientSecret, redirectUri, clientName || null, new Date().toISOString());

    return {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        client_name: clientName || null,
    };
}

export function getClient(clientId: string): OAuthClient | null {
    const db = getDb();
    const row = db
        .prepare("SELECT client_id, client_secret, redirect_uri, client_name FROM oauth_clients WHERE client_id = ?")
        .get(clientId) as OAuthClient | undefined;
    return row || null;
}

export async function createAuthorizationCode(
    clientId: string,
    redirectUri: string,
    codeChallenge: string,
    codeChallengeMethod: string,
): Promise<string> {
    const code = randomBytes(32).toString("hex");
    const db = getDb();
    db.prepare(
        "INSERT INTO oauth_codes (code, client_id, redirect_uri, code_challenge, code_challenge_method, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(code, clientId, redirectUri, codeChallenge, codeChallengeMethod, new Date().toISOString());
    return code;
}

export function exchangeCode(
    code: string,
    clientId: string,
    codeVerifier: string,
): string | null {
    const db = getDb();
    const row = db
        .prepare("SELECT code, client_id, redirect_uri, code_challenge, code_challenge_method, used FROM oauth_codes WHERE code = ?")
        .get(code) as {
            code: string;
            client_id: string;
            redirect_uri: string;
            code_challenge: string;
            code_challenge_method: string;
            used: number;
        } | undefined;

    if (!row || row.used || row.client_id !== clientId) {
        return null;
    }

    const expectedChallenge = createHash("sha256")
        .update(codeVerifier)
        .digest("base64url");

    if (expectedChallenge !== row.code_challenge) {
        return null;
    }

    db.prepare("UPDATE oauth_codes SET used = 1 WHERE code = ?").run(code);

    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    db.prepare(
        "INSERT INTO oauth_tokens (token_hash, client_id, created_at) VALUES (?, ?, ?)",
    ).run(tokenHash, clientId, new Date().toISOString());

    return token;
}

export function validateOAuthToken(token: string): boolean {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const db = getDb();
    const row = db
        .prepare("SELECT token_hash FROM oauth_tokens WHERE token_hash = ?")
        .get(tokenHash);
    return !!row;
}

export { verifyPassword };
