import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAllFullEntries, getEntry } from "../services/storage.js";

export function createMcpServer(): McpServer {
    const server = new McpServer({
        name: "journal",
        version: "1.0.0",
    });

    server.tool(
        "list_tags",
        "List all tags with the count of entries each tag has",
        {},
        async () => {
            const entries = await getAllFullEntries();
            const tagCounts = new Map<string, number>();

            for (const entry of entries) {
                if (entry.tags) {
                    for (const tag of entry.tags) {
                        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                    }
                }
            }

            const tags = Array.from(tagCounts.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([tag, count]) => ({ tag, count }));

            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(tags, null, 2),
                    },
                ],
            };
        },
    );

    server.tool(
        "list_entries_by_tag",
        "List journal entries that have a given tag. Returns date, tags, and a preview of each entry.",
        { tag: z.string().describe("The tag to filter entries by") },
        async ({ tag }) => {
            const allEntries = await getAllFullEntries();
            const filtered = allEntries
                .filter(
                    (entry) => entry.tags && entry.tags.includes(tag),
                )
                .sort(
                    (a, b) =>
                        new Date(b.creationDate).getTime() -
                        new Date(a.creationDate).getTime(),
                )
                .map((entry) => ({
                    id: entry.id,
                    creationDate: entry.creationDate,
                    tags: entry.tags,
                    preview: entry.content.slice(0, 200),
                }));

            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(filtered, null, 2),
                    },
                ],
            };
        },
    );

    server.tool(
        "get_entry",
        "Get the full details of a journal entry by its ID",
        {
            id: z
                .string()
                .uuid()
                .describe("The UUID of the entry to retrieve"),
        },
        async ({ id }) => {
            const entry = await getEntry(id);
            if (!entry) {
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: "Entry not found",
                        },
                    ],
                    isError: true,
                };
            }

            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(
                            {
                                id: entry.id,
                                creationDate: entry.creationDate,
                                lastUpdated: entry.lastUpdated,
                                tags: entry.tags,
                                content: entry.content,
                            },
                            null,
                            2,
                        ),
                    },
                ],
            };
        },
    );

    return server;
}
