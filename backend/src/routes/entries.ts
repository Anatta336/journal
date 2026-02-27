import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
    getAllEntries,
    getEntry,
    createEntry,
    updateEntry,
    deleteEntry,
} from "../services/storage.js";

const tagSchema = z
    .string()
    .min(1)
    .max(20)
    .regex(
        /^[a-zA-Z0-9-]+$/,
        "Tags must contain only alphanumeric characters and hyphens",
    );

const entryContentSchema = z.object({
    content: z.string().min(1, "Content is required"),
    tags: z.array(tagSchema).optional(),
});

const idParamsSchema = z.object({
    id: z.string().uuid("Invalid entry ID format"),
});

export const entriesRoutes: FastifyPluginAsync = async (fastify) => {
    fastify.get("/", async () => {
        const entries = await getAllEntries();
        return entries;
    });

    fastify.post("/", async (request, reply) => {
        const parseResult = entryContentSchema.safeParse(request.body);
        if (!parseResult.success) {
            return reply.status(400).send({
                error: "Invalid request",
                details: parseResult.error.issues,
            });
        }

        const entry = await createEntry(
            parseResult.data.content,
            parseResult.data.tags,
        );
        return reply.status(201).send(entry);
    });

    fastify.get("/:id", async (request, reply) => {
        const parseResult = idParamsSchema.safeParse(request.params);
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

    fastify.put("/:id", async (request, reply) => {
        const paramsResult = idParamsSchema.safeParse(request.params);
        if (!paramsResult.success) {
            return reply.status(400).send({
                error: "Invalid request",
                details: paramsResult.error.issues,
            });
        }

        const bodyResult = entryContentSchema.safeParse(request.body);
        if (!bodyResult.success) {
            return reply.status(400).send({
                error: "Invalid request",
                details: bodyResult.error.issues,
            });
        }

        const entry = await updateEntry(
            paramsResult.data.id,
            bodyResult.data.content,
            bodyResult.data.tags,
        );
        if (!entry) {
            return reply.status(404).send({ error: "Entry not found" });
        }

        return entry;
    });

    fastify.delete("/:id", async (request, reply) => {
        const parseResult = idParamsSchema.safeParse(request.params);
        if (!parseResult.success) {
            return reply.status(400).send({
                error: "Invalid request",
                details: parseResult.error.issues,
            });
        }

        const deleted = await deleteEntry(parseResult.data.id);
        if (!deleted) {
            return reply.status(404).send({ error: "Entry not found" });
        }

        return reply.status(204).send();
    });
};
