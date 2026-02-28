import {
    describe,
    it,
    expect,
    beforeAll,
    beforeEach,
    afterAll,
    afterEach,
} from "vitest";
import fs from "fs/promises";
import path from "path";
import { FastifyInstance } from "fastify";
import { buildApp } from "../app.js";
import { initDb, getDb } from "../db.js";
import { initPassword } from "../services/auth.js";
import {
    ensureStorageDirectories,
    createEntry,
    DATA_DIR,
} from "../services/storage.js";

const TEST_PASSWORD = "testpassword-mcp";

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
        // Ignore
    }
}

describe("MCP routes", () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        process.env.NODE_ENV = "test";
        initDb();
        await initPassword(TEST_PASSWORD);
        app = await buildApp();
    });

    afterAll(async () => {
        await app.close();
    });

    describe("OAuth flow", () => {
        it("GET /.well-known/oauth-authorization-server returns metadata", async () => {
            const response = await app.inject({
                method: "GET",
                url: "/.well-known/oauth-authorization-server",
            });

            expect(response.statusCode).toBe(200);
            const body = response.json();
            expect(body.authorization_endpoint).toContain("/mcp/authorize");
            expect(body.token_endpoint).toContain("/mcp/token");
            expect(body.registration_endpoint).toContain("/mcp/register");
            expect(body.response_types_supported).toContain("code");
            expect(body.code_challenge_methods_supported).toContain("S256");
        });

        it("POST /mcp/register creates a new client", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/mcp/register",
                payload: {
                    redirect_uris: ["http://localhost:3000/callback"],
                    client_name: "Test Client",
                },
            });

            expect(response.statusCode).toBe(201);
            const body = response.json();
            expect(body.client_id).toBeDefined();
            expect(body.client_secret).toBeDefined();
            expect(body.redirect_uris).toEqual([
                "http://localhost:3000/callback",
            ]);
        });

        it("POST /mcp/register returns 400 without redirect_uris", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/mcp/register",
                payload: {
                    client_name: "Test Client",
                },
            });

            expect(response.statusCode).toBe(400);
        });

        it("GET /mcp/authorize returns login form", async () => {
            const registerRes = await app.inject({
                method: "POST",
                url: "/mcp/register",
                payload: {
                    redirect_uris: ["http://localhost:3000/callback"],
                },
            });
            const client = registerRes.json();

            const response = await app.inject({
                method: "GET",
                url: `/mcp/authorize?client_id=${client.client_id}&redirect_uri=http://localhost:3000/callback&code_challenge=testchallenge&code_challenge_method=S256&state=teststate`,
            });

            expect(response.statusCode).toBe(200);
            expect(response.headers["content-type"]).toContain("text/html");
            expect(response.body).toContain("Password");
            expect(response.body).toContain(client.client_id);
        });

        it("GET /mcp/authorize returns 400 for unknown client", async () => {
            const response = await app.inject({
                method: "GET",
                url: "/mcp/authorize?client_id=unknown&redirect_uri=http://localhost:3000/callback&code_challenge=testchallenge",
            });

            expect(response.statusCode).toBe(400);
        });

        it("POST /mcp/authorize returns 401 for wrong password", async () => {
            const registerRes = await app.inject({
                method: "POST",
                url: "/mcp/register",
                payload: {
                    redirect_uris: ["http://localhost:3000/callback"],
                },
            });
            const client = registerRes.json();

            const response = await app.inject({
                method: "POST",
                url: "/mcp/authorize",
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                },
                payload: `client_id=${client.client_id}&redirect_uri=http://localhost:3000/callback&code_challenge=testchallenge&code_challenge_method=S256&state=teststate&password=wrongpassword`,
            });

            expect(response.statusCode).toBe(401);
        });

        it("full OAuth flow: register, authorize, exchange token", async () => {
            const { createHash } = await import("crypto");

            const registerRes = await app.inject({
                method: "POST",
                url: "/mcp/register",
                payload: {
                    redirect_uris: ["http://localhost:3000/callback"],
                },
            });
            const client = registerRes.json();

            const codeVerifier = "test-code-verifier-string-at-least-43-characters-long-here";
            const codeChallenge = createHash("sha256")
                .update(codeVerifier)
                .digest("base64url");

            const authorizeRes = await app.inject({
                method: "POST",
                url: "/mcp/authorize",
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                },
                payload: `client_id=${client.client_id}&redirect_uri=${encodeURIComponent("http://localhost:3000/callback")}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=teststate&password=${TEST_PASSWORD}`,
            });

            expect(authorizeRes.statusCode).toBe(302);
            const location = authorizeRes.headers.location as string;
            const redirectUrl = new URL(location);
            const code = redirectUrl.searchParams.get("code");
            const state = redirectUrl.searchParams.get("state");
            expect(code).toBeTruthy();
            expect(state).toBe("teststate");

            const tokenRes = await app.inject({
                method: "POST",
                url: "/mcp/token",
                payload: {
                    grant_type: "authorization_code",
                    code,
                    client_id: client.client_id,
                    code_verifier: codeVerifier,
                },
            });

            expect(tokenRes.statusCode).toBe(200);
            const tokenBody = tokenRes.json();
            expect(tokenBody.access_token).toBeDefined();
            expect(tokenBody.token_type).toBe("Bearer");
        });

        it("POST /mcp/token returns 400 for invalid code", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/mcp/token",
                payload: {
                    grant_type: "authorization_code",
                    code: "invalid-code",
                    client_id: "some-client",
                    code_verifier: "some-verifier",
                },
            });

            expect(response.statusCode).toBe(400);
        });

        it("POST /mcp/token returns 400 for unsupported grant type", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/mcp/token",
                payload: {
                    grant_type: "client_credentials",
                },
            });

            expect(response.statusCode).toBe(400);
        });
    });

    describe("MCP endpoint authentication", () => {
        it("POST /mcp returns 401 without token", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/mcp",
                payload: {
                    jsonrpc: "2.0",
                    method: "initialize",
                    id: 1,
                },
            });

            expect(response.statusCode).toBe(401);
        });

        it("POST /mcp returns 401 with invalid token", async () => {
            const response = await app.inject({
                method: "POST",
                url: "/mcp",
                headers: {
                    authorization: "Bearer invalid-token",
                },
                payload: {
                    jsonrpc: "2.0",
                    method: "initialize",
                    id: 1,
                },
            });

            expect(response.statusCode).toBe(401);
        });
    });
});

describe("MCP tools", () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        process.env.NODE_ENV = "test";
        initDb();
        await initPassword(TEST_PASSWORD);
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

    async function getOAuthToken(): Promise<string> {
        const { createHash } = await import("crypto");

        const registerRes = await app.inject({
            method: "POST",
            url: "/mcp/register",
            payload: {
                redirect_uris: ["http://localhost:3000/callback"],
            },
        });
        const client = registerRes.json();

        const codeVerifier = "test-code-verifier-string-at-least-43-characters-long-here";
        const codeChallenge = createHash("sha256")
            .update(codeVerifier)
            .digest("base64url");

        const authorizeRes = await app.inject({
            method: "POST",
            url: "/mcp/authorize",
            headers: {
                "content-type": "application/x-www-form-urlencoded",
            },
            payload: `client_id=${client.client_id}&redirect_uri=${encodeURIComponent("http://localhost:3000/callback")}&code_challenge=${codeChallenge}&code_challenge_method=S256&state=s&password=${TEST_PASSWORD}`,
        });

        const location = authorizeRes.headers.location as string;
        const code = new URL(location).searchParams.get("code")!;

        const tokenRes = await app.inject({
            method: "POST",
            url: "/mcp/token",
            payload: {
                grant_type: "authorization_code",
                code,
                client_id: client.client_id,
                code_verifier: codeVerifier,
            },
        });

        return tokenRes.json().access_token;
    }

    function parseSseResponse(body: string): Record<string, unknown> {
        const lines = body.split("\n");
        for (const line of lines) {
            if (line.startsWith("data: ")) {
                return JSON.parse(line.slice(6));
            }
        }
        throw new Error("No data line found in SSE response");
    }

    async function mcpRequest(
        token: string,
        method: string,
        params: Record<string, unknown>,
        id: number = 1,
    ) {
        return app.inject({
            method: "POST",
            url: "/mcp",
            headers: {
                authorization: `Bearer ${token}`,
                accept: "application/json, text/event-stream",
                "content-type": "application/json",
            },
            payload: {
                jsonrpc: "2.0",
                method,
                params,
                id,
            },
        });
    }

    it("list_tags returns tags with counts", async () => {
        await createEntry("Entry about coding", ["work", "code"]);
        await createEntry("Another work entry", ["work"]);
        await createEntry("Personal thoughts", ["personal"]);

        const token = await getOAuthToken();

        const initRes = await mcpRequest(token, "initialize", {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
        });
        expect(initRes.statusCode).toBe(200);

        const res = await mcpRequest(
            token,
            "tools/call",
            { name: "list_tags", arguments: {} },
            2,
        );

        expect(res.statusCode).toBe(200);
        const body = parseSseResponse(res.body) as any;
        const content = JSON.parse(body.result.content[0].text);
        expect(content).toEqual(
            expect.arrayContaining([
                { tag: "code", count: 1 },
                { tag: "personal", count: 1 },
                { tag: "work", count: 2 },
            ]),
        );
    });

    it("list_entries_by_tag returns filtered entries with preview", async () => {
        const longContent = "A".repeat(300);
        await createEntry(longContent, ["work"]);
        await createEntry("Personal entry", ["personal"]);

        const token = await getOAuthToken();

        await mcpRequest(token, "initialize", {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
        });

        const res = await mcpRequest(
            token,
            "tools/call",
            { name: "list_entries_by_tag", arguments: { tag: "work" } },
            2,
        );

        expect(res.statusCode).toBe(200);
        const body = parseSseResponse(res.body) as any;
        const entries = JSON.parse(body.result.content[0].text);
        expect(entries).toHaveLength(1);
        expect(entries[0].preview).toHaveLength(200);
        expect(entries[0].creationDate).toBeDefined();
        expect(entries[0].tags).toEqual(["work"]);
    });

    it("get_entry returns full entry details", async () => {
        const entry = await createEntry("Full content here", [
            "work",
            "important",
        ]);

        const token = await getOAuthToken();

        await mcpRequest(token, "initialize", {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
        });

        const res = await mcpRequest(
            token,
            "tools/call",
            { name: "get_entry", arguments: { id: entry.id } },
            2,
        );

        expect(res.statusCode).toBe(200);
        const body = parseSseResponse(res.body) as any;
        const result = JSON.parse(body.result.content[0].text);
        expect(result.id).toBe(entry.id);
        expect(result.content).toBe("Full content here");
        expect(result.tags).toEqual(["work", "important"]);
        expect(result.creationDate).toBeDefined();
        expect(result.lastUpdated).toBeDefined();
    });

    it("get_entry returns error for non-existent entry", async () => {
        const token = await getOAuthToken();

        await mcpRequest(token, "initialize", {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
        });

        const res = await mcpRequest(
            token,
            "tools/call",
            {
                name: "get_entry",
                arguments: { id: "00000000-0000-0000-0000-000000000000" },
            },
            2,
        );

        expect(res.statusCode).toBe(200);
        const body = parseSseResponse(res.body) as any;
        expect(body.result.isError).toBe(true);
        expect(body.result.content[0].text).toBe("Entry not found");
    });

    it("list_tags returns empty array when no entries", async () => {
        const token = await getOAuthToken();

        await mcpRequest(token, "initialize", {
            protocolVersion: "2025-03-26",
            capabilities: {},
            clientInfo: { name: "test", version: "1.0" },
        });

        const res = await mcpRequest(
            token,
            "tools/call",
            { name: "list_tags", arguments: {} },
            2,
        );

        expect(res.statusCode).toBe(200);
        const body = parseSseResponse(res.body) as any;
        const tags = JSON.parse(body.result.content[0].text);
        expect(tags).toEqual([]);
    });
});
