<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useJournal } from '@/composables/useJournal'

const router = useRouter()
const { entryPreviews, isLoading, isSyncing, loadEntries, removeEntry } = useJournal()
const deleteErrors = ref<Record<string, string>>({})

function formatDate(isoDate: string): string {
    const date = new Date(isoDate)
    const day = date.getDate().toString().padStart(2, '0')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
}

async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this entry?')) return

    deleteErrors.value[id] = ''
    try {
        await removeEntry(id)
    } catch {
        deleteErrors.value[id] = 'Failed to delete entry'
    }
}

function navigateToEntry(id: string) {
    router.push(`/entries/${id}`)
}

function navigateToNew() {
    router.push('/entries/new')
}

onMounted(loadEntries)
</script>

<template>
    <div class="entry-list">
        <div class="list-header">
            <h2>Journal Entries</h2>
            <button class="new-entry-btn" @click="navigateToNew" data-testid="new-entry-btn">
                New Entry
            </button>
        </div>

        <div v-if="isLoading && entryPreviews.length === 0" class="loading">
            <template v-if="isSyncing">Syncing entries...</template>
            <template v-else>Loading entries...</template>
        </div>

        <div v-else-if="entryPreviews.length === 0" class="empty-state">
            No journal entries yet. Create your first entry!
        </div>

        <ul v-else class="entries" data-testid="entries-list">
            <li v-for="entry in entryPreviews" :key="entry.id" class="entry-item">
                <div class="entry-content" @click="navigateToEntry(entry.id)">
                    <span class="entry-date">{{ formatDate(entry.creationDate) }}</span>
                    <span v-if="entry.syncStatus === 'pending'" class="sync-indicator" title="Pending sync">●</span>
                </div>
                <div class="entry-actions">
                    <button
                        class="delete-btn"
                        @click.stop="handleDelete(entry.id)"
                        :data-testid="`delete-btn-${entry.id}`"
                    >
                        Delete
                    </button>
                    <span v-if="deleteErrors[entry.id]" class="delete-error">
                        {{ deleteErrors[entry.id] }}
                    </span>
                </div>
            </li>
        </ul>
    </div>
</template>

<style scoped>
.entry-list {
    width: 100%;
}

.list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-lg);
}

.list-header h2 {
    margin: 0;
    font-size: var(--font-size-lg);
}

.new-entry-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    font-size: var(--font-size-base);
}

.new-entry-btn:hover {
    background-color: var(--color-primary-hover);
}

.loading,
.empty-state {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--color-text);
    opacity: 0.7;
}

.entries {
    list-style: none;
    padding: 0;
    margin: 0;
}

.entry-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-sm);
    transition: background-color 0.15s;
}

.entry-item:hover {
    background-color: var(--color-hover);
}

.entry-content {
    flex: 1;
    cursor: pointer;
}

.entry-date {
    font-weight: 500;
}

.sync-indicator {
    color: var(--color-warning, #f59e0b);
    margin-left: 0.5rem;
    font-size: 0.75rem;
}

.entry-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.delete-btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: transparent;
    color: #dc2626;
    border: 1px solid #dc2626;
    border-radius: var(--border-radius);
    cursor: pointer;
    font-size: 0.875rem;
}

.delete-btn:hover {
    background-color: #fef2f2;
}

.delete-error {
    color: #dc2626;
    font-size: 0.875rem;
}
</style>
