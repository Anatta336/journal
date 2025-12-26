export async function calculateEntryHash(content: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function calculateGlobalHash(entryHashes: { id: string; hash?: string }[]): Promise<string> {
    const sorted = [...entryHashes].sort((a, b) => a.id.localeCompare(b.id))
    const concatenated = sorted.map((e) => e.hash || '').join('')
    return calculateEntryHash(concatenated)
}
