<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import JournalEditor from '@/components/JournalEditor.vue'
import { useJournal } from '@/composables/useJournal'
import { sync } from '@/services/sync'

const route = useRoute()
const router = useRouter()
const { getEntry, saveNewEntry, saveExistingEntry, entryPreviews, loadEntries } = useJournal()

const editorRef = ref<InstanceType<typeof JournalEditor> | null>(null)
const loading = ref(false)
const isSaving = ref(false)
const lastSavedAt = ref<Date | null>(null)
const saveError = ref(false)
const originalContent = ref('')
const currentContent = ref('')
const originalTags = ref<string[]>([])
const currentTags = ref<string[]>([])
const pendingContent = ref<string | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const tagInput = ref('')
const showTagDropdown = ref(false)
const tagInputRef = ref<HTMLInputElement | null>(null)

const isNewEntry = computed(() => route.name === 'entry-new')
const entryId = computed(() => route.params.id as string | undefined)

const lastSavedText = computed(() => {
    if (isSaving.value) return 'Saving…'
    if (saveError.value) return 'Save failed'
    if (!lastSavedAt.value) return ''
    return 'Last saved ' + lastSavedAt.value.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    })
})

const allExistingTags = computed(() => {
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
    return Array.from(tagMap.values())
})

const tagValidationRegex = /^[a-zA-Z0-9-]+$/

function isValidTag(tag: string): boolean {
    return tag.length >= 1 && tag.length <= 20 && tagValidationRegex.test(tag)
}

function normalizeTagInput(input: string): string {
    return input.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 20)
}

function hasTag(tag: string): boolean {
    const lowerTag = tag.toLowerCase()
    return currentTags.value.some((t) => t.toLowerCase() === lowerTag)
}

function getExistingTagCasing(tag: string): string | null {
    const lowerTag = tag.toLowerCase()
    for (const existingTag of allExistingTags.value) {
        if (existingTag.toLowerCase() === lowerTag) {
            return existingTag
        }
    }
    return null
}

const filteredTags = computed(() => {
    const search = tagInput.value.toLowerCase()
    if (!search) {
        return allExistingTags.value.filter((t) => !hasTag(t))
    }
    return allExistingTags.value.filter(
        (t) => t.toLowerCase().includes(search) && !hasTag(t)
    )
})

const canCreateTag = computed(() => {
    const input = tagInput.value.trim()
    if (!input || !isValidTag(input)) return false
    if (hasTag(input)) return false
    const existingMatch = getExistingTagCasing(input)
    if (existingMatch && !hasTag(existingMatch)) {
        return false
    }
    return !filteredTags.value.some((t) => t.toLowerCase() === input.toLowerCase())
})

function scheduleAutoSave() {
    if (currentContent.value.trim() === '') return
    if (debounceTimer !== null) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
        debounceTimer = null
        save()
    }, 1000)
}

function addTag(tag: string) {
    const existingCasing = getExistingTagCasing(tag)
    const tagToAdd = existingCasing || tag
    if (!hasTag(tagToAdd)) {
        currentTags.value = [...currentTags.value, tagToAdd]
        scheduleAutoSave()
    }
    tagInput.value = ''
    showTagDropdown.value = false
}

function removeTag(tag: string) {
    currentTags.value = currentTags.value.filter((t) => t.toLowerCase() !== tag.toLowerCase())
    scheduleAutoSave()
}

function handleTagInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
        event.preventDefault()
        const input = tagInput.value.trim()
        if (filteredTags.value.length > 0) {
            addTag(filteredTags.value[0])
        } else if (canCreateTag.value) {
            addTag(input)
        }
    } else if (event.key === 'Escape') {
        showTagDropdown.value = false
        tagInput.value = ''
    }
}

function handleTagInput(event: Event) {
    const input = event.target as HTMLInputElement
    tagInput.value = normalizeTagInput(input.value)
    showTagDropdown.value = true
}

function handleTagInputFocus() {
    showTagDropdown.value = true
}

function handleTagInputBlur() {
    setTimeout(() => {
        showTagDropdown.value = false
    }, 150)
}

function updateCurrentContent() {
    if (editorRef.value) {
        const markdown = editorRef.value.getMarkdown()
        currentContent.value = markdown
        scheduleAutoSave()
    }
}

function setEditorContent(content: string) {
    if (editorRef.value?.editor) {
        editorRef.value.setMarkdown(content)
        pendingContent.value = null
    } else {
        pendingContent.value = content
    }
}

async function fetchEntry() {
    if (!entryId.value) return

    loading.value = true
    try {
        let entry = await getEntry(entryId.value)
        if (!entry) {
            await sync()
            entry = await getEntry(entryId.value)
        }
        if (!entry) {
            router.push('/entries')
            return
        }
        originalContent.value = entry.content
        currentContent.value = entry.content
        originalTags.value = entry.tags ? [...entry.tags] : []
        currentTags.value = entry.tags ? [...entry.tags] : []
        await nextTick()
        setEditorContent(entry.content)
    } catch (error) {
        console.error('Failed to fetch entry:', error)
        router.push('/entries')
    } finally {
        loading.value = false
    }
}

async function save(skipNavigation = false) {
    if (isSaving.value) return
    if (editorRef.value) {
        currentContent.value = editorRef.value.getMarkdown()
    }
    const content = currentContent.value.trim()
    if (!content) return

    isSaving.value = true
    saveError.value = false

    try {
        const tagsToSave = currentTags.value.length > 0 ? [...currentTags.value] : undefined
        if (isNewEntry.value) {
            const entry = await saveNewEntry(content, tagsToSave)
            originalContent.value = content
            originalTags.value = currentTags.value.slice()
            lastSavedAt.value = new Date()
            if (!skipNavigation) {
                router.push(`/entries/${entry.id}`)
            }
        } else if (entryId.value) {
            await saveExistingEntry(entryId.value, content, tagsToSave)
            originalContent.value = content
            originalTags.value = currentTags.value.slice()
            lastSavedAt.value = new Date()
        }
    } catch (error) {
        console.error('Failed to save entry:', error)
        saveError.value = true
    } finally {
        isSaving.value = false
    }
}

function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') {
        save()
    }
}

function handleBeforeUnload() {
    save()
}

onBeforeRouteLeave(async () => {
    if (debounceTimer !== null) {
        clearTimeout(debounceTimer)
        debounceTimer = null
    }
    if (isNewEntry.value && currentContent.value.trim() === '') {
        return true
    }
    // Skip if nothing has changed since the last save (avoids double-save when
    // auto-save triggers navigation and this guard fires for that same navigation)
    const currentMarkdown = editorRef.value ? editorRef.value.getMarkdown().trim() : currentContent.value.trim()
    const contentSame = currentMarkdown === originalContent.value.trim()
    const tagsSame = JSON.stringify([...currentTags.value].sort()) === JSON.stringify([...originalTags.value].sort())
    if (contentSame && tagsSame) {
        return true
    }
    await save(true)
    return true
})

onMounted(async () => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)
    await loadEntries()
    if (!isNewEntry.value) {
        fetchEntry()
    }
})

onUnmounted(() => {
    if (debounceTimer !== null) {
        clearTimeout(debounceTimer)
        debounceTimer = null
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('beforeunload', handleBeforeUnload)
})

watch(() => route.params.id, (newId: string | string[] | undefined) => {
    if (newId) {
        fetchEntry()
    }
})

watch(editorRef, (editor) => {
    if (editor?.editor && pendingContent.value !== null) {
        editor.setMarkdown(pendingContent.value)
        pendingContent.value = null
    }
})
</script>

<template>
    <div class="editor-page">
        <div v-if="loading" class="loading">Loading entry...</div>

        <template v-else>
            <div class="tag-section" data-testid="tag-section">
                <div class="tag-input-container">
                    <div class="selected-tags">
                        <span
                            v-for="tag in currentTags"
                            :key="tag"
                            class="tag-badge"
                            :data-testid="`selected-tag-${tag}`"
                        >
                            {{ tag }}
                            <button
                                type="button"
                                class="tag-remove-btn"
                                @click="removeTag(tag)"
                                :data-testid="`remove-tag-${tag}`"
                            >
                                ×
                            </button>
                        </span>
                    </div>
                    <div class="tag-input-wrapper">
                        <input
                            ref="tagInputRef"
                            type="text"
                            class="tag-input"
                            placeholder="Add tags..."
                            :value="tagInput"
                            @input="handleTagInput"
                            @keydown="handleTagInputKeydown"
                            @focus="handleTagInputFocus"
                            @blur="handleTagInputBlur"
                            data-testid="tag-input"
                        />
                        <div v-if="showTagDropdown && (filteredTags.length > 0 || canCreateTag)" class="tag-dropdown" data-testid="tag-dropdown">
                            <button
                                v-for="tag in filteredTags"
                                :key="tag"
                                type="button"
                                class="tag-option"
                                @mousedown.prevent="addTag(tag)"
                                :data-testid="`tag-option-${tag}`"
                            >
                                {{ tag }}
                            </button>
                            <button
                                v-if="canCreateTag"
                                type="button"
                                class="tag-option tag-create"
                                @mousedown.prevent="addTag(tagInput.trim())"
                                data-testid="create-tag-option"
                            >
                                Create "{{ tagInput.trim() }}"
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <JournalEditor
                ref="editorRef"
                @update="updateCurrentContent"
            />

            <div class="editor-footer">
                <span
                    :class="['save-indicator', { error: saveError }]"
                    data-testid="save-indicator"
                >{{ lastSavedText }}</span>
            </div>
        </template>
    </div>
</template>

<style scoped>
.editor-page {
    width: 100%;
}

.loading {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--color-text);
    opacity: 0.7;
}

.tag-section {
    margin-bottom: var(--spacing-md);
}

.tag-input-container {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    background-color: var(--color-bg);
}

.selected-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
}

.tag-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background-color: var(--color-primary);
    color: white;
    border-radius: 999px;
    font-size: 0.875rem;
}

.tag-remove-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    background: transparent;
    border: none;
    color: white;
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    opacity: 0.8;
}

.tag-remove-btn:hover {
    opacity: 1;
}

.tag-input-wrapper {
    position: relative;
    flex: 1;
    min-width: 120px;
}

.tag-input {
    width: 100%;
    padding: var(--spacing-xs);
    border: none;
    background: transparent;
    font-size: var(--font-size-base);
    color: var(--color-text);
    outline: none;
}

.tag-input::placeholder {
    color: var(--color-text);
    opacity: 0.5;
}

.tag-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    max-height: 200px;
    overflow-y: auto;
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 100;
}

.tag-option {
    display: block;
    width: 100%;
    padding: var(--spacing-sm);
    text-align: left;
    background: transparent;
    border: none;
    color: var(--color-text);
    font-size: var(--font-size-base);
    cursor: pointer;
}

.tag-option:hover {
    background-color: var(--color-hover-bg);
}

.tag-create {
    color: var(--color-primary);
    font-style: italic;
}

.editor-footer {
    margin-top: var(--spacing-md);
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
}

.save-indicator {
    font-size: 0.75rem;
    opacity: 0.5;
    color: var(--color-text);
}

.save-indicator.error {
    color: var(--color-danger, #dc2626);
    opacity: 1;
}
</style>
