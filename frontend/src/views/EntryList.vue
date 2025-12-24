<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

interface EntryPreview {
    id: string
    creationDate: string
    lastUpdated: string
    preview: string
}

const router = useRouter()
const entries = ref<EntryPreview[]>([])
const loading = ref(true)
const deleteErrors = ref<Record<string, string>>({})

function formatDate(isoDate: string): string {
    const date = new Date(isoDate)
    const day = date.getDate().toString().padStart(2, '0')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
}

async function fetchEntries() {
    try {
        const response = await fetch('http://localhost:3013/entries')
        if (!response.ok) throw new Error('Failed to fetch entries')
        const data = await response.json()
        entries.value = data.sort((a: EntryPreview, b: EntryPreview) =>
            new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime()
        )
    } catch (error) {
        console.error('Failed to fetch entries:', error)
    } finally {
        loading.value = false
    }
}

async function deleteEntry(id: string) {
    if (!confirm('Are you sure you want to delete this entry?')) return

    deleteErrors.value[id] = ''
    try {
        const response = await fetch(`http://localhost:3013/entries/${id}`, {
            method: 'DELETE',
        })
        if (!response.ok) throw new Error('Failed to delete entry')
        entries.value = entries.value.filter(e => e.id !== id)
    } catch (error) {
        deleteErrors.value[id] = 'Failed to delete entry'
    }
}

function navigateToEntry(id: string) {
    router.push(`/entries/${id}`)
}

function navigateToNew() {
    router.push('/entries/new')
}

onMounted(fetchEntries)
</script>

<template>
    <div class="entry-list">
        <div class="list-header">
            <h2>Journal Entries</h2>
            <button class="new-entry-btn" @click="navigateToNew" data-testid="new-entry-btn">
                New Entry
            </button>
        </div>

        <div v-if="loading" class="loading">Loading entries...</div>

        <div v-else-if="entries.length === 0" class="empty-state">
            No journal entries yet. Create your first entry!
        </div>

        <ul v-else class="entries" data-testid="entries-list">
            <li v-for="entry in entries" :key="entry.id" class="entry-item">
                <div class="entry-content" @click="navigateToEntry(entry.id)">
                    <span class="entry-date">{{ formatDate(entry.creationDate) }}</span>
                </div>
                <div class="entry-actions">
                    <button
                        class="delete-btn"
                        @click.stop="deleteEntry(entry.id)"
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
