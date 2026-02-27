import { ref, onMounted, onUnmounted, computed } from "vue";
import {
    getAllEntries,
    getEntry as getLocalEntry,
    getSyncState,
    type LocalEntry,
} from "@/services/db";
import {
    sync,
    createEntry,
    updateEntry,
    deleteEntryAndSync,
    onSyncStateChange,
    getIsSyncing,
    startPeriodicSync,
    stopPeriodicSync,
    forceRefresh as forceRefreshSync,
} from "@/services/sync";

export interface EntryPreview {
    id: string;
    creationDate: string;
    lastUpdated: string;
    preview: string;
    syncStatus: string;
    tags?: string[];
}

const entries = ref<LocalEntry[]>([]);
const isOnline = ref(navigator.onLine);
const isSyncing = ref(getIsSyncing());
const lastSyncTime = ref<string | undefined>();
const isInitialized = ref(false);
const isLoading = ref(true);
const refreshProgress = ref<{ current: number; total: number }>({
    current: 0,
    total: 0,
});

export function useJournal() {
    async function loadEntries() {
        isLoading.value = true;
        try {
            entries.value = await getAllEntries();
            const syncState = await getSyncState();
            lastSyncTime.value = syncState.lastSyncTime;
        } finally {
            isLoading.value = false;
        }
    }

    async function refreshEntries() {
        entries.value = await getAllEntries();
    }

    async function getEntry(id: string): Promise<LocalEntry | undefined> {
        return getLocalEntry(id);
    }

    async function saveNewEntry(
        content: string,
        tags?: string[],
    ): Promise<LocalEntry> {
        const entry = await createEntry(content, tags);
        await refreshEntries();
        return entry;
    }

    async function saveExistingEntry(
        id: string,
        content: string,
        tags?: string[],
    ): Promise<LocalEntry | null> {
        const updated = await updateEntry(id, content, tags);
        if (updated) {
            await refreshEntries();
        }
        return updated;
    }

    async function removeEntry(id: string): Promise<void> {
        await deleteEntryAndSync(id);
        await refreshEntries();
    }

    async function syncNow(): Promise<boolean> {
        const result = await sync();
        if (result) {
            await loadEntries();
        }
        return result;
    }

    async function forceRefresh(): Promise<void> {
        refreshProgress.value = { current: 0, total: 0 };
        await forceRefreshSync((current, total) => {
            refreshProgress.value = { current, total };
        });
        await loadEntries();
    }

    const entryPreviews = computed<EntryPreview[]>(() => {
        return entries.value.map((e) => ({
            id: e.id,
            creationDate: e.creationDate,
            lastUpdated: e.lastUpdated,
            preview: e.content.slice(0, 1000), // Avoid loading huge amounts of content.
            syncStatus: e.syncStatus,
            tags: e.tags,
        }));
    });

    function setupListeners() {
        const handleOnline = () => {
            isOnline.value = true;
            sync().then(() => refreshEntries());
        };
        const handleOffline = () => {
            isOnline.value = false;
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        const unsubscribeSyncState = onSyncStateChange((syncing) => {
            isSyncing.value = syncing;
            if (!syncing) {
                getSyncState().then((state) => {
                    lastSyncTime.value = state.lastSyncTime;
                });
                refreshEntries();
            }
        });

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            unsubscribeSyncState();
        };
    }

    async function initialize() {
        if (isInitialized.value) return;

        isInitialized.value = true;
        startPeriodicSync();

        if (navigator.onLine) {
            await sync();
        }
        await loadEntries();
    }

    return {
        entries,
        entryPreviews,
        isOnline,
        isSyncing,
        lastSyncTime,
        isLoading,
        refreshProgress,
        loadEntries,
        refreshEntries,
        getEntry,
        saveNewEntry,
        saveExistingEntry,
        removeEntry,
        syncNow,
        forceRefresh,
        setupListeners,
        initialize,
    };
}

export function useJournalInit() {
    const journal = useJournal();

    onMounted(() => {
        const cleanup = journal.setupListeners();
        journal.initialize();

        onUnmounted(() => {
            cleanup();
            stopPeriodicSync();
        });
    });

    return journal;
}
