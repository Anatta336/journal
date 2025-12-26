<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { computed } from 'vue'

const props = defineProps<{
    editor: Editor | undefined
}>()

const isBold = computed(() => props.editor?.isActive('bold') ?? false)
const isItalic = computed(() => props.editor?.isActive('italic') ?? false)
const isCode = computed(() => props.editor?.isActive('code') ?? false)
const isCodeBlock = computed(() => props.editor?.isActive('codeBlock') ?? false)
const isBulletList = computed(() => props.editor?.isActive('bulletList') ?? false)

function toggleBold() {
    props.editor?.chain().focus().toggleBold().run()
}

function toggleItalic() {
    props.editor?.chain().focus().toggleItalic().run()
}

function toggleCode() {
    props.editor?.chain().focus().toggleCode().run()
}

function toggleCodeBlock() {
    props.editor?.chain().focus().toggleCodeBlock().run()
}

function toggleBulletList() {
    props.editor?.chain().focus().toggleBulletList().run()
}
</script>

<template>
    <div class="editor-toolbar" role="toolbar" aria-label="Text formatting">
        <button
            type="button"
            :class="['toolbar-button', { active: isBold }]"
            :aria-pressed="isBold"
            title="Bold"
            data-testid="toolbar-bold"
            @click="toggleBold"
        >
            <strong>B</strong>
        </button>
        <button
            type="button"
            :class="['toolbar-button', { active: isItalic }]"
            :aria-pressed="isItalic"
            title="Italic"
            data-testid="toolbar-italic"
            @click="toggleItalic"
        >
            <em>I</em>
        </button>
        <button
            type="button"
            :class="['toolbar-button', { active: isCode }]"
            :aria-pressed="isCode"
            title="Inline Code"
            data-testid="toolbar-code"
            @click="toggleCode"
        >
            <code>&lt;/&gt;</code>
        </button>
        <button
            type="button"
            :class="['toolbar-button', { active: isCodeBlock }]"
            :aria-pressed="isCodeBlock"
            title="Code Block"
            data-testid="toolbar-code-block"
            @click="toggleCodeBlock"
        >
            <span class="code-block-icon">{ }</span>
        </button>
        <button
            type="button"
            :class="['toolbar-button', { active: isBulletList }]"
            :aria-pressed="isBulletList"
            title="Bullet List"
            data-testid="toolbar-bullet-list"
            @click="toggleBulletList"
        >
            <span class="bullet-icon">•</span>
        </button>
    </div>
</template>

<style scoped>
.editor-toolbar {
    display: flex;
    gap: var(--spacing-xs, 0.25rem);
    padding: var(--spacing-xs, 0.25rem);
    border-bottom: 1px solid var(--color-border, #e0e0e0);
    background-color: var(--color-bg-subtle, #f8f9fa);
}

.toolbar-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 2rem;
    padding: 0 var(--spacing-sm, 0.5rem);
    border: 1px solid transparent;
    border-radius: var(--border-radius, 0.375rem);
    background-color: transparent;
    color: var(--color-text, #1a1a1a);
    font-size: 0.875rem;
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;
}

.toolbar-button:hover {
    background-color: var(--color-hover-bg, #e9ecef);
}

.toolbar-button:focus-visible {
    outline: 2px solid var(--color-primary, #2563eb);
    outline-offset: 1px;
}

.toolbar-button.active {
    background-color: var(--color-primary, #2563eb);
    color: white;
}

.toolbar-button code {
    font-family: monospace;
    font-size: 0.75rem;
}

.code-block-icon {
    font-family: monospace;
    font-weight: bold;
}

.bullet-icon {
    font-size: 1.25rem;
    line-height: 1;
}
</style>
