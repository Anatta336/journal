import {
    getAllEntriesIncludingTrashed,
    getEntry as getLocalEntry,
    saveEntry as saveLocalEntry,
    hardDeleteEntry,
    setSyncState,
    type LocalEntry,
} from './db'
import { calculateEntryHash, calculateGlobalHash } from '@/utils/hash'

const API_BASE = '/api'

interface ManifestEntry {
    id: string
    hash?: string
    lastUpdated: string
}

interface ServerEntry {
    id: string
    content: string
    creationDate: string
    lastUpdated: string
    hash?: string
    tags?: string[]
}

let isSyncing = false
let syncListeners: Array<(syncing: boolean) => void> = []
let currentSyncPromise: Promise<boolean> | null = null

export function onSyncStateChange(listener: (syncing: boolean) => void): () => void {
    syncListeners.push(listener)
    return () => {
        syncListeners = syncListeners.filter((l) => l !== listener)
    }
}

function notifySyncState(syncing: boolean) {
    isSyncing = syncing
    syncListeners.forEach((l) => l(syncing))
}

export function getIsSyncing(): boolean {
    return isSyncing
}

export async function waitForSync(): Promise<boolean> {
    if (currentSyncPromise) {
        return currentSyncPromise
    }
    return true
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    try {
        const response = await fetch(url, { ...options, signal: controller.signal })
        return response
    } finally {
        clearTimeout(timeoutId)
    }
}

async function getServerGlobalHash(): Promise<string | null> {
    try {
        const response = await fetchWithTimeout(`${API_BASE}/sync/status`)
        if (!response.ok) return null
        const data = await response.json()
        return data.globalHash
    } catch {
        return null
    }
}

async function getServerManifest(): Promise<ManifestEntry[]> {
    const response = await fetchWithTimeout(`${API_BASE}/sync/manifest`)
    if (!response.ok) throw new Error('Failed to fetch manifest')
    return response.json()
}

async function getServerEntry(id: string): Promise<ServerEntry | null> {
    try {
        const response = await fetchWithTimeout(`${API_BASE}/sync/entries/${id}`)
        if (!response.ok) return null
        return response.json()
    } catch {
        return null
    }
}

async function batchUpdate(
    updates: ServerEntry[],
    deletions: string[]
): Promise<{ updated: number; deleted: number }> {
    const response = await fetchWithTimeout(`${API_BASE}/sync/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates, deletions }),
    })
    if (!response.ok) throw new Error('Batch update failed')
    return response.json()
}

export async function sync(): Promise<boolean> {
    if (isSyncing) {
        return waitForSync()
    }
    if (!navigator.onLine) return false

    notifySyncState(true)

    currentSyncPromise = (async () => {
        try {
            const serverGlobalHash = await getServerGlobalHash()
            if (serverGlobalHash === null) {
                return false
            }

            const localEntries = await getAllEntriesIncludingTrashed()
            const activeLocalEntries = localEntries.filter((e) => !e.trashed && e.syncStatus === 'synced')
            const localGlobalHash = await calculateGlobalHash(activeLocalEntries)

            if (serverGlobalHash === localGlobalHash) {
                const pendingEntries = localEntries.filter(
                    (e) => e.syncStatus === 'pending' || e.trashed
                )
                if (pendingEntries.length === 0) {
                    await setSyncState({ lastSyncTime: new Date().toISOString(), globalHash: serverGlobalHash })
                    return true
                }
            }

            const serverManifest = await getServerManifest()
            const serverMap = new Map(serverManifest.map((e) => [e.id, e]))
            const localMap = new Map(localEntries.map((e) => [e.id, e]))

            const entriesToDownload: string[] = []
            const entriesToUpload: LocalEntry[] = []
            const entriesToDelete: string[] = []

            for (const serverEntry of serverManifest) {
                const local = localMap.get(serverEntry.id)
                if (!local) {
                    entriesToDownload.push(serverEntry.id)
                } else if (!local.trashed && local.syncStatus === 'synced') {
                    if (serverEntry.hash !== local.hash) {
                        const serverTime = new Date(serverEntry.lastUpdated).getTime()
                        const localTime = new Date(local.lastUpdated).getTime()
                        if (serverTime > localTime) {
                            entriesToDownload.push(serverEntry.id)
                        } else if (localTime > serverTime) {
                            entriesToUpload.push(local)
                        }
                    }
                }
            }

            for (const local of localEntries) {
                if (local.trashed) {
                    if (serverMap.has(local.id) || local.syncStatus === 'pending') {
                        entriesToDelete.push(local.id)
                    }
                } else if (local.syncStatus === 'pending') {
                    if (!entriesToUpload.find((e) => e.id === local.id)) {
                        entriesToUpload.push(local)
                    }
                } else if (!serverMap.has(local.id) && local.syncStatus === 'synced') {
                    await hardDeleteEntry(local.id)
                }
            }

            if (entriesToUpload.length > 0 || entriesToDelete.length > 0) {
                const updates = entriesToUpload.map((e) => ({
                    id: e.id,
                    content: e.content,
                    creationDate: e.creationDate,
                    lastUpdated: e.lastUpdated,
                    hash: e.hash,
                    tags: e.tags,
                }))
                await batchUpdate(updates, entriesToDelete)

                for (const entry of entriesToUpload) {
                    entry.syncStatus = 'synced'
                    await saveLocalEntry(entry)
                }
                for (const id of entriesToDelete) {
                    await hardDeleteEntry(id)
                }
            }

            for (const id of entriesToDownload) {
                const serverEntry = await getServerEntry(id)
                if (serverEntry) {
                    const localEntry: LocalEntry = {
                        id: serverEntry.id,
                        content: serverEntry.content,
                        creationDate: serverEntry.creationDate,
                        lastUpdated: serverEntry.lastUpdated,
                        hash: serverEntry.hash,
                        tags: serverEntry.tags,
                        trashed: false,
                        syncStatus: 'synced',
                    }
                    await saveLocalEntry(localEntry)
                }
            }

            const newServerHash = await getServerGlobalHash()
            await setSyncState({
                lastSyncTime: new Date().toISOString(),
                globalHash: newServerHash || undefined,
            })

            return true
        } catch (error) {
            console.error('Sync failed:', error)
            return false
        } finally {
            notifySyncState(false)
            currentSyncPromise = null
        }
    })()

    return currentSyncPromise
}

let syncInterval: ReturnType<typeof setInterval> | null = null

export function startPeriodicSync(intervalMs = 5 * 60 * 1000): void {
    if (syncInterval) return
    syncInterval = setInterval(() => {
        if (navigator.onLine) {
            sync()
        }
    }, intervalMs)
}

export function stopPeriodicSync(): void {
    if (syncInterval) {
        clearInterval(syncInterval)
        syncInterval = null
    }
}

export async function registerBackgroundSync(): Promise<void> {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
            const registration = await navigator.serviceWorker.ready
            await (registration as any).sync.register('journal-sync')
        } catch {
            // Background sync not supported, fallback handled by online event
        }
    }
}

export async function createEntry(content: string, tags?: string[]): Promise<LocalEntry> {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const hash = await calculateEntryHash(content)

    const entry: LocalEntry = {
        id,
        content,
        creationDate: now,
        lastUpdated: now,
        hash,
        tags,
        trashed: false,
        syncStatus: 'pending',
    }

    await saveLocalEntry(entry)

    if (navigator.onLine) {
        sync()
    } else {
        registerBackgroundSync()
    }

    return entry
}

export async function updateEntry(id: string, content: string, tags?: string[]): Promise<LocalEntry | null> {
    const existing = await getLocalEntry(id)
    if (!existing || existing.trashed) return null

    const hash = await calculateEntryHash(content)
    const now = new Date().toISOString()

    const updated: LocalEntry = {
        ...existing,
        content,
        lastUpdated: now,
        hash,
        tags,
        syncStatus: 'pending',
    }

    await saveLocalEntry(updated)

    if (navigator.onLine) {
        sync()
    } else {
        registerBackgroundSync()
    }

    return updated
}

export async function deleteEntryAndSync(id: string): Promise<void> {
    const existing = await getLocalEntry(id)
    if (!existing) return

    existing.trashed = true
    existing.syncStatus = 'pending'
    existing.lastUpdated = new Date().toISOString()

    await saveLocalEntry(existing)

    if (navigator.onLine) {
        sync()
    } else {
        registerBackgroundSync()
    }
}
