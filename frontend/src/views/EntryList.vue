<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useJournal } from '@/composables/useJournal'
import EntryPreview from '@/components/EntryPreview.vue'

const router = useRouter()
const { entryPreviews, isLoading, isSyncing, loadEntries, removeEntry, saveNewEntry } = useJournal()
const deleteErrors = ref<Record<string, string>>({})
const showFilters = ref(false)
const selectedTags = ref<Set<string>>(new Set())

const allTags = computed(() => {
    const tagMap = new Map<string, string>()
    for (const entry of entryPreviews.value) {
        if (entry.tags) {
            for (const tag of entry.tags) {
                const lowerTag = tag.toLowerCase()
                if (!tagMap.has(lowerTag)) {
                    tagMap.set(lowerTag, tag)
                }
            }
        }
    }
    return Array.from(tagMap.values()).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
})

const hasActiveFilters = computed(() => selectedTags.value.size > 0)

const filteredEntries = computed(() => {
    if (selectedTags.value.size === 0) {
        return entryPreviews.value
    }
    return entryPreviews.value.filter((entry) => {
        if (!entry.tags || entry.tags.length === 0) return false
        const entryTagsLower = entry.tags.map((t) => t.toLowerCase())
        for (const selectedTag of selectedTags.value) {
            if (!entryTagsLower.includes(selectedTag.toLowerCase())) {
                return false
            }
        }
        return true
    })
})

function formatDate(isoDate: string): string {
    const date = new Date(isoDate)
    const day = date.getDate().toString().padStart(2, '0')
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
}

function toggleFilter(tag: string) {
    const lowerTag = tag.toLowerCase()
    const newSelected = new Set(selectedTags.value)
    let found = false
    for (const t of newSelected) {
        if (t.toLowerCase() === lowerTag) {
            newSelected.delete(t)
            found = true
            break
        }
    }
    if (!found) {
        newSelected.add(tag)
    }
    selectedTags.value = newSelected
}

function isTagSelected(tag: string): boolean {
    const lowerTag = tag.toLowerCase()
    for (const t of selectedTags.value) {
        if (t.toLowerCase() === lowerTag) return true
    }
    return false
}

function clearFilters() {
    selectedTags.value = new Set()
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

async function createAndNavigateToNew() {
    const entry = await saveNewEntry('', undefined)
    router.push(`/entries/${entry.id}?new=1`)
}

onMounted(loadEntries)
</script>

<template>
    <div class="entry-list">
        <div class="list-header">
            <h2>Journal Entries</h2>
            <button class="new-entry-btn" @click="createAndNavigateToNew" data-testid="new-entry-btn">
                New Entry
            </button>
        </div>

        <div v-if="allTags.length > 0" class="filter-section">
            <button
                class="filter-toggle-btn"
                :class="{ active: hasActiveFilters }"
                @click="showFilters = !showFilters"
                data-testid="filter-toggle-btn"
            >
                Filters{{ hasActiveFilters ? ` (${selectedTags.size})` : '' }}
            </button>
            <div v-if="showFilters" class="filter-panel" data-testid="filter-panel">
                <button
                    v-if="hasActiveFilters"
                    class="clear-filters-btn"
                    @click="clearFilters"
                    data-testid="clear-filters-btn"
                >
                    Remove all filters
                </button>
                <div class="filter-tags">
                    <button
                        v-for="tag in allTags"
                        :key="tag"
                        class="filter-tag"
                        :class="{ selected: isTagSelected(tag) }"
                        @click="toggleFilter(tag)"
                        :data-testid="`filter-tag-${tag}`"
                    >
                        {{ tag }}
                    </button>
                </div>
            </div>
        </div>

        <div v-if="isLoading && entryPreviews.length === 0" class="loading">
            <template v-if="isSyncing">Syncing entries...</template>
            <template v-else>Loading entries...</template>
        </div>

        <div v-else-if="entryPreviews.length === 0" class="empty-state">
            No journal entries yet. Create your first entry!
        </div>

        <div v-else-if="filteredEntries.length === 0" class="empty-state">
            No entries match the selected filters.
        </div>

        <ul v-else class="entries" data-testid="entries-list">
            <li v-for="entry in filteredEntries"
                :key="entry.id"
                class="entry-item"
                @click="navigateToEntry(entry.id)"
                :data-testid="`entry-${entry.id}`"
            >
                <div class="entry-content">
                    <div class="entry-header">
                        <span class="entry-date">{{ formatDate(entry.creationDate) }}</span>
                        <span v-if="entry.syncStatus === 'pending'" class="sync-indicator" title="Pending sync">●</span>
                    </div>
                    <EntryPreview :content="entry.preview" />
                    <div v-if="entry.tags && entry.tags.length > 0" class="entry-tags">
                        <span
                            v-for="tag in entry.tags"
                            :key="tag"
                            class="tag-badge"
                            :data-testid="`entry-tag-${tag}`"
                        >
                            {{ tag }}
                        </span>
                    </div>
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
    margin-bottom: var(--spacing-sm);
}

.list-header h2 {
    margin: 0;
    font-size: var(--font-size-lg);
}

.new-entry-btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    font-size: var(--font-size-sm);
}

.new-entry-btn:hover {
    background-color: var(--color-primary-hover);
}

.filter-section {
    margin-bottom: var(--spacing-md);
}

.filter-toggle-btn {
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: var(--color-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    cursor: pointer;
    font-size: var(--font-size-base);
}

.filter-toggle-btn:hover {
    background-color: var(--color-hover-bg);
}

.filter-toggle-btn.active {
    border-color: var(--color-primary);
    color: var(--color-primary);
}

.filter-panel {
    margin-top: var(--spacing-sm);
    padding: var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    background-color: var(--color-bg);
}

.clear-filters-btn {
    margin-bottom: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: transparent;
    color: var(--color-primary);
    border: none;
    cursor: pointer;
    font-size: 0.875rem;
    text-decoration: underline;
}

.clear-filters-btn:hover {
    color: var(--color-primary-hover);
}

.filter-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    max-height: 200px;
    overflow-y: auto;
}

.filter-tag {
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--color-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: 999px;
    cursor: pointer;
    font-size: 0.875rem;
    opacity: 0.6;
    transition: opacity 0.15s, border-color 0.15s;
}

.filter-tag:hover {
    opacity: 0.8;
}

.filter-tag.selected {
    opacity: 1;
    border-color: var(--color-primary);
    background-color: var(--color-primary);
    color: white;
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
    cursor: pointer;
    padding: var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    margin-bottom: var(--spacing-sm);
    --preview-fade-color: var(--color-bg);
}

.entry-item:hover {
    background-color: var(--color-hover-bg);
    --preview-fade-color: var(--color-hover-bg);
}

.entry-content {
    flex: 1;
}

.entry-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.entry-date {
    font-weight: 500;
}

.sync-indicator {
    color: var(--color-warning, #f59e0b);
    font-size: 0.75rem;
}

.entry-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
}

.tag-badge {
    display: inline-block;
    padding: 2px 8px;
    background-color: var(--color-tag-bg, #e5e7eb);
    color: var(--color-tag-text, #374151);
    border-radius: 999px;
    font-size: 0.75rem;
}

.entry-actions {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
}

.delete-btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    background-color: var(--color-danger, #d1584b);
    color: var(--color-text, #ffffff);
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    font-size: var(--font-size-sm);
}

.delete-btn:hover {
    background-color: var(--color-danger-hover, #ba4b3e);
}

.delete-error {
    color: var(--color-danger, #d1584b);
    font-size: var(--font-size-sm);
}
</style>
