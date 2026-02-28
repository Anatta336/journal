import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { createHash } from "crypto";
import { entriesRoutes } from "./routes/entries.js";
import { syncRoutes } from "./routes/sync.js";
import { authRoutes } from "./routes/auth.js";
import { ensureStorageDirectories } from "./services/storage.js";
import { initDb, getDb } from "./db.js";
import { initPassword } from "./services/auth.js";

export async function buildApp(): Promise<FastifyInstance> {
    const fastify = Fastify({
        logger: process.env.NODE_ENV !== "test",
        trustProxy: true,
    });

    await fastify.register(cors, {
        origin: ["http://localhost:5173", "https://notes.samdriver.xyz"],
    });

    await fastify.register(rateLimit, {
        max: 300,
        timeWindow: "1 minute",
    });

    fastify.get("/health", async () => {
        return { status: "ok" };
    });

    await fastify.register(authRoutes, { prefix: "/auth" });

    fastify.addHook("onRequest", async (request, reply) => {
        if (request.url === "/auth/login" && request.method === "POST") {
            return;
        }
        if (request.url === "/health") {
            return;
        }

        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return reply.status(401).send({ error: "Unauthorized" });
        }

        const token = authHeader.slice(7);
        const tokenHash = createHash("sha256").update(token).digest("hex");

        const expiryDays = parseInt(process.env.TOKEN_EXPIRY_DAYS || "10");
        const db = getDb();
        const row = db
            .prepare("SELECT created_at FROM tokens WHERE hash = ? AND invalidated_at IS NULL")
            .get(tokenHash) as { created_at: string } | undefined;

        if (!row) {
            return reply.status(401).send({ error: "Unauthorized" });
        }

        const expiresAt = new Date(
            new Date(row.created_at).getTime() +
                expiryDays * 24 * 60 * 60 * 1000,
        );
        if (new Date() > expiresAt) {
            return reply.status(401).send({ error: "Token expired" });
        }
    });

    await fastify.register(entriesRoutes, { prefix: "/entries" });
    await fastify.register(syncRoutes, { prefix: "/sync" });

    return fastify;
}

export async function startServer(): Promise<FastifyInstance> {
    initDb();

    const authPassword = process.env.AUTH_PASSWORD;
    if (authPassword) {
        await initPassword(authPassword);
    } else {
        const db = getDb();
        const row = db.prepare("SELECT hash FROM auth LIMIT 1").get();
        if (!row) {
            console.error(
                "ERROR: AUTH_PASSWORD environment variable is not set and no password hash exists in the database. Set AUTH_PASSWORD to start the server.",
            );
            process.exit(1);
        }
    }

    const fastify = await buildApp();

    try {
        await ensureStorageDirectories();
        const isTesting =
            process.env.TESTING === "true" || process.env.NODE_ENV === "test";
        const defaultPort = isTesting ? 3014 : 3013;
        const port = process.env.PORT
            ? parseInt(process.env.PORT)
            : defaultPort;
        await fastify.listen({ port, host: "0.0.0.0" });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }

    return fastify;
}
