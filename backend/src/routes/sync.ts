import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
    calculateGlobalHash,
    getManifest,
    saveEntry,
    deleteEntry,
    getEntry,
    Entry,
} from "../services/storage.js";

const entrySchema = z.object({
    id: z.string().uuid(),
    content: z.string(),
    creationDate: z.string(),
    lastUpdated: z.string(),
    hash: z.string().optional(),
});

const batchRequestSchema = z.object({
    updates: z.array(entrySchema).optional().default([]),
    deletions: z.array(z.string().uuid()).optional().default([]),
});

export const syncRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get("/status", async () => {
        const globalHash = await calculateGlobalHash();
        return { globalHash };
    });

    fastify.get("/manifest", async () => {
        const manifest = await getManifest();
        return manifest;
    });

    fastify.get("/entries/:id", async (request, reply) => {
        const paramsSchema = z.object({ id: z.string().uuid() });
        const parseResult = paramsSchema.safeParse(request.params);
        if (!parseResult.success) {
            return reply.status(400).send({
                error: "Invalid request",
                details: parseResult.error.issues,
            });
        }

        const entry = await getEntry(parseResult.data.id);
        if (!entry) {
            return reply.status(404).send({ error: "Entry not found" });
        }
        return entry;
    });

    fastify.post("/batch", async (request, reply) => {
        const parseResult = batchRequestSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({
                error: "Invalid request",
                details: parseResult.error.issues,
            });
        }

        const { updates, deletions } = parseResult.data;

        const savedEntries: Entry[] = [];
        for (const entry of updates) {
            const saved = await saveEntry(entry);
            savedEntries.push(saved);
        }

        const deletedIds: string[] = [];
        for (const id of deletions) {
            const deleted = await deleteEntry(id);
            if (deleted) {
                deletedIds.push(id);
            }
        }

        return {
            updated: savedEntries.length,
            deleted: deletedIds.length,
        };
    });
};
