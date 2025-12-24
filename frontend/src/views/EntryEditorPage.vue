<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import JournalEditor from '@/components/JournalEditor.vue'

const route = useRoute()
const router = useRouter()

const editorRef = ref<InstanceType<typeof JournalEditor> | null>(null)
const loading = ref(false)
const saving = ref(false)
const saveMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const originalContent = ref('')
const currentContent = ref('')
const hasUnsavedChanges = ref(false)
const pendingContent = ref<string | null>(null)

const isNewEntry = computed(() => route.name === 'entry-new')
const entryId = computed(() => route.params.id as string | undefined)

const isSaveDisabled = computed(() => {
    const trimmedContent = currentContent.value.trim()
    if (trimmedContent === '') return true
    if (!isNewEntry.value && trimmedContent === originalContent.value.trim()) return true
    return false
})

function updateCurrentContent() {
    if (editorRef.value) {
        const markdown = editorRef.value.getMarkdown()
        currentContent.value = markdown
        hasUnsavedChanges.value = markdown.trim() !== originalContent.value.trim()
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
        const response = await fetch(`http://localhost:3013/entries/${entryId.value}`)
        if (!response.ok) {
            if (response.status === 404) {
                router.push('/entries')
                return
            }
            throw new Error('Failed to fetch entry')
        }
        const entry = await response.json()
        originalContent.value = entry.content
        currentContent.value = entry.content
        await nextTick()
        setEditorContent(entry.content)
    } catch (error) {
        console.error('Failed to fetch entry:', error)
        router.push('/entries')
    } finally {
        loading.value = false
    }
}

async function save() {
    updateCurrentContent()
    const content = currentContent.value.trim()
    if (!content) return

    saving.value = true
    saveMessage.value = null

    try {
        if (isNewEntry.value) {
            const response = await fetch('http://localhost:3013/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            })
            if (!response.ok) throw new Error('Failed to create entry')
            const entry = await response.json()
            originalContent.value = content
            hasUnsavedChanges.value = false
            router.push(`/entries/${entry.id}`)
        } else {
            const response = await fetch(`http://localhost:3013/entries/${entryId.value}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            })
            if (!response.ok) throw new Error('Failed to save entry')
            originalContent.value = content
            hasUnsavedChanges.value = false
            saveMessage.value = { type: 'success', text: 'Saved' }
            setTimeout(() => {
                if (saveMessage.value?.type === 'success') {
                    saveMessage.value = null
                }
            }, 3000)
        }
    } catch (error) {
        saveMessage.value = { type: 'error', text: 'Failed to save entry' }
    } finally {
        saving.value = false
    }
}

function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (hasUnsavedChanges.value) {
        event.preventDefault()
    }
}

onBeforeRouteLeave(() => {
    if (hasUnsavedChanges.value) {
        return confirm('You have unsaved changes. Are you sure you want to leave?')
    }
    return true
})

onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
    if (!isNewEntry.value) {
        fetchEntry()
    }
})

onUnmounted(() => {
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
        <div class="editor-header">
            <router-link to="/entries" class="back-link" data-testid="back-link">
                ← Back to List
            </router-link>
        </div>

        <div v-if="loading" class="loading">Loading entry...</div>

        <template v-else>
            <JournalEditor
                ref="editorRef"
                @update="updateCurrentContent"
            />

            <div class="editor-footer">
                <button
                    class="save-btn"
                    :disabled="isSaveDisabled || saving"
                    @click="save"
                    data-testid="save-btn"
                >
                    {{ saving ? 'Saving...' : 'Save' }}
                </button>
                <span
                    v-if="saveMessage"
                    :class="['save-message', saveMessage.type]"
                    :data-testid="saveMessage.type === 'success' ? 'save-success' : 'save-error'"
                >
                    {{ saveMessage.text }}
                </span>
            </div>
        </template>
    </div>
</template>

<style scoped>
.editor-page {
    width: 100%;
}

.editor-header {
    margin-bottom: var(--spacing-md);
}

.back-link {
    color: var(--color-primary);
    text-decoration: none;
}

.back-link:hover {
    text-decoration: underline;
}

.loading {
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--color-text);
    opacity: 0.7;
}

.editor-footer {
    margin-top: var(--spacing-md);
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
}

.save-btn {
    padding: var(--spacing-sm) var(--spacing-lg);
    background-color: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--border-radius);
    cursor: pointer;
    font-size: var(--font-size-base);
}

.save-btn:hover:not(:disabled) {
    background-color: var(--color-primary-hover);
}

.save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.save-message {
    font-size: 0.875rem;
}

.save-message.success {
    color: #16a34a;
}

.save-message.error {
    color: #dc2626;
}
</style>
