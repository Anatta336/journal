import Fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { entriesRoutes } from "./routes/entries.js";
import { syncRoutes } from "./routes/sync.js";
import { ensureStorageDirectories } from "./services/storage.js";

export async function buildApp(): Promise<FastifyInstance> {
    const fastify = Fastify({
        logger: process.env.NODE_ENV !== "test",
    });

    await fastify.register(cors, {
        origin: ["http://localhost:5173", "https://notes.samdriver.xyz"],
    });

    fastify.get("/health", async () => {
        return { status: "ok" };
    });

    await fastify.register(entriesRoutes, { prefix: "/entries" });
    await fastify.register(syncRoutes, { prefix: "/sync" });

    return fastify;
}

export async function startServer(): Promise<FastifyInstance> {
    const fastify = await buildApp();

    try {
        await ensureStorageDirectories();
        await fastify.listen({ port: 3013, host: "0.0.0.0" });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }

    return fastify;
}
