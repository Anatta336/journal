export interface HashableMetadata {
    tags?: string[]
}

function normalizeMetadata(metadata?: HashableMetadata): Record<string, unknown> {
    const normalized: Record<string, unknown> = {}
    if (metadata?.tags && metadata.tags.length > 0) {
        normalized.tags = [...metadata.tags].sort()
    }
    return normalized
}

export async function calculateEntryHash(content: string, metadata?: HashableMetadata): Promise<string> {
    const normalizedMeta = normalizeMetadata(metadata)
    const metaString = Object.keys(normalizedMeta).length > 0
        ? JSON.stringify(normalizedMeta)
        : ""
    const encoder = new TextEncoder()
    const data = encoder.encode(content + metaString)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function calculateGlobalHash(entryHashes: { id: string; hash?: string }[]): Promise<string> {
    const sorted = [...entryHashes].sort((a, b) => a.id.localeCompare(b.id))
    const concatenated = sorted.map((e) => e.hash || '').join('')
    return calculateEntryHash(concatenated)
}
