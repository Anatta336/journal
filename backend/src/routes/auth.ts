import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { verifyPassword } from "../services/auth.js";
import { getDb } from "../db.js";

const loginBodySchema = z.object({
    password: z.string(),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.post("/login", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request, reply) => {
        const parseResult = loginBodySchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({
                error: "Invalid request",
                details: parseResult.error.issues,
            });
        }

        const { password } = parseResult.data;
        const valid = await verifyPassword(password);
        if (!valid) {
            return reply.status(401).send({ error: "Invalid password" });
        }

        const token = randomBytes(32).toString("hex");
        const tokenHash = createHash("sha256").update(token).digest("hex");
        const createdAt = new Date().toISOString();
        const ip = request.ip ?? "";
        const userAgent = request.headers["user-agent"] ?? "";

        const db = getDb();
        db.prepare(
            "INSERT INTO tokens (hash, created_at, ip, user_agent) VALUES (?, ?, ?, ?)",
        ).run(tokenHash, createdAt, ip, userAgent);

        return { token };
    });

    fastify.post("/logout", async (request, reply) => {
        const authHeader = request.headers.authorization!;
        const token = authHeader.slice(7);
        const tokenHash = createHash("sha256").update(token).digest("hex");
        const db = getDb();
        db.prepare(
            "UPDATE tokens SET invalidated_at = ? WHERE hash = ?",
        ).run(new Date().toISOString(), tokenHash);
        return reply.status(204).send();
    });

    fastify.post("/logout/all", async (_request, reply) => {
        const db = getDb();
        db.prepare(
            "UPDATE tokens SET invalidated_at = ? WHERE invalidated_at IS NULL",
        ).run(new Date().toISOString());
        return reply.status(204).send();
    });
};
