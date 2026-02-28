import { FastifyPluginAsync } from "fastify";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./server.js";
import {
    registerClient,
    getClient,
    createAuthorizationCode,
    exchangeCode,
    validateOAuthToken,
    verifyPassword,
} from "./oauth.js";

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export const mcpRoutes: FastifyPluginAsync = async (fastify) => {
    const mcpServer = createMcpServer();

    fastify.get("/.well-known/oauth-authorization-server", async () => {
        const baseUrl = process.env.MCP_BASE_URL || "http://localhost:3013";
        return {
            issuer: baseUrl,
            authorization_endpoint: `${baseUrl}/mcp/authorize`,
            token_endpoint: `${baseUrl}/mcp/token`,
            registration_endpoint: `${baseUrl}/mcp/register`,
            response_types_supported: ["code"],
            grant_types_supported: ["authorization_code"],
            code_challenge_methods_supported: ["S256"],
            token_endpoint_auth_methods_supported: ["client_secret_post"],
        };
    });

    fastify.post("/mcp/register", async (request, reply) => {
        const body = request.body as {
            redirect_uris?: string[];
            client_name?: string;
        };

        if (!body.redirect_uris || body.redirect_uris.length === 0) {
            return reply.status(400).send({
                error: "invalid_request",
                error_description: "redirect_uris is required",
            });
        }

        const client = registerClient(
            body.redirect_uris[0],
            body.client_name,
        );

        return reply.status(201).send({
            client_id: client.client_id,
            client_secret: client.client_secret,
            redirect_uris: [client.redirect_uri],
            client_name: client.client_name,
        });
    });

    fastify.get("/mcp/authorize", async (request, reply) => {
        const query = request.query as {
            client_id?: string;
            redirect_uri?: string;
            response_type?: string;
            code_challenge?: string;
            code_challenge_method?: string;
            state?: string;
        };

        if (!query.client_id || !query.redirect_uri || !query.code_challenge) {
            return reply.status(400).send({
                error: "invalid_request",
                error_description: "Missing required parameters",
            });
        }

        const client = getClient(query.client_id);
        if (!client) {
            return reply.status(400).send({
                error: "invalid_client",
                error_description: "Unknown client_id",
            });
        }

        reply.header("Content-Type", "text/html");
        return reply.send(`<!DOCTYPE html>
<html>
<head><title>Journal - Authorize</title></head>
<body>
    <h1>Authorize Access</h1>
    <p>An application is requesting read-only access to your journal entries.</p>
    <form method="POST" action="/mcp/authorize">
        <input type="hidden" name="client_id" value="${escapeHtml(query.client_id)}" />
        <input type="hidden" name="redirect_uri" value="${escapeHtml(query.redirect_uri)}" />
        <input type="hidden" name="code_challenge" value="${escapeHtml(query.code_challenge)}" />
        <input type="hidden" name="code_challenge_method" value="${escapeHtml(query.code_challenge_method || "S256")}" />
        <input type="hidden" name="state" value="${escapeHtml(query.state || "")}" />
        <label for="password">Password:</label>
        <input type="password" id="password" name="password" required />
        <button type="submit">Authorize</button>
    </form>
</body>
</html>`);
    });

    fastify.post("/mcp/authorize", async (request, reply) => {
        const body = request.body as {
            client_id: string;
            redirect_uri: string;
            code_challenge: string;
            code_challenge_method: string;
            state: string;
            password: string;
        };

        const valid = await verifyPassword(body.password);
        if (!valid) {
            reply.header("Content-Type", "text/html");
            return reply.status(401).send(`<!DOCTYPE html>
<html>
<head><title>Journal - Authorization Failed</title></head>
<body>
    <h1>Authorization Failed</h1>
    <p>Invalid password. Please go back and try again.</p>
</body>
</html>`);
        }

        const code = await createAuthorizationCode(
            body.client_id,
            body.redirect_uri,
            body.code_challenge,
            body.code_challenge_method || "S256",
        );

        const redirectUrl = new URL(body.redirect_uri);
        redirectUrl.searchParams.set("code", code);
        if (body.state) {
            redirectUrl.searchParams.set("state", body.state);
        }

        return reply.redirect(redirectUrl.toString());
    });

    fastify.post("/mcp/token", async (request, reply) => {
        const body = request.body as {
            grant_type: string;
            code?: string;
            client_id?: string;
            client_secret?: string;
            code_verifier?: string;
        };

        if (body.grant_type !== "authorization_code") {
            return reply.status(400).send({
                error: "unsupported_grant_type",
            });
        }

        if (!body.code || !body.client_id || !body.code_verifier) {
            return reply.status(400).send({
                error: "invalid_request",
                error_description: "Missing required parameters",
            });
        }

        const client = getClient(body.client_id);
        if (!client) {
            return reply.status(400).send({
                error: "invalid_client",
            });
        }

        if (body.client_secret && body.client_secret !== client.client_secret) {
            return reply.status(400).send({
                error: "invalid_client",
            });
        }

        const token = exchangeCode(
            body.code,
            body.client_id,
            body.code_verifier,
        );

        if (!token) {
            return reply.status(400).send({
                error: "invalid_grant",
            });
        }

        return {
            access_token: token,
            token_type: "Bearer",
        };
    });

    fastify.post("/mcp", async (request, reply) => {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return reply.status(401).send({
                error: "Unauthorized",
            });
        }

        const token = authHeader.slice(7);
        if (!validateOAuthToken(token)) {
            return reply.status(401).send({
                error: "Unauthorized",
            });
        }

        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
        });

        await mcpServer.connect(transport);

        const rawReply = reply.raw;
        rawReply.on("close", () => {
            transport.close().catch(() => {});
        });

        await transport.handleRequest(
            request.raw,
            rawReply,
            request.body as unknown,
        );

        return reply.hijack();
    });

    fastify.get("/mcp", async (request, reply) => {
        return reply.status(405).send({
            error: "Method Not Allowed",
            message: "This server uses stateless Streamable HTTP transport. GET for SSE is not supported.",
        });
    });

    fastify.delete("/mcp", async (request, reply) => {
        return reply.status(405).send({
            error: "Method Not Allowed",
            message: "This server uses stateless Streamable HTTP transport. Session termination is not needed.",
        });
    });
};
