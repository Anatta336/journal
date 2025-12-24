<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import EditorToolbar from './EditorToolbar.vue'
import { EscapedChar, MarkdownEscape } from '@/extensions/MarkdownEscape'

const editor = useEditor({
    extensions: [
        StarterKit,
        Markdown,
        EscapedChar,
        MarkdownEscape,
    ],
    content: '',
    editorProps: {
        attributes: {
            'data-testid': 'editor-content',
        },
    },
})

function escapeMarkdownChars(text: string, hasEscapedMark: boolean): string {
    if (!hasEscapedMark) return text
    return text.replace(/([*_`#\[\]])/g, '\\$1')
}

function serializeNode(node: Record<string, unknown>): string {
    if (node.type === 'text') {
        const text = node.text as string
        const marks = (node.marks as Array<{ type: string }>) || []
        const hasEscapedMark = marks.some(m => m.type === 'escapedChar')
        return escapeMarkdownChars(text, hasEscapedMark)
    }
    return ''
}

function getMarkdown(): string {
    if (!editor.value) return ''
    const manager = editor.value.storage.markdown?.manager
    if (!manager) return ''

    const json = editor.value.getJSON()

    const processContent = (content: Record<string, unknown>[]): void => {
        for (const node of content) {
            if (node.type === 'text') {
                const marks = (node.marks as Array<{ type: string }>) || []
                const hasEscapedMark = marks.some(m => m.type === 'escapedChar')
                if (hasEscapedMark) {
                    node.text = escapeMarkdownChars(node.text as string, true)
                    node.marks = marks.filter(m => m.type !== 'escapedChar')
                }
            }
            if (node.content && Array.isArray(node.content)) {
                processContent(node.content as Record<string, unknown>[])
            }
        }
    }

    if (json.content) {
        processContent(json.content as Record<string, unknown>[])
    }

    return manager.serialize(json)
}

function setMarkdown(content: string): void {
    if (!editor.value) return
    const manager = editor.value.storage.markdown?.manager
    if (!manager) {
        editor.value.commands.setContent(content)
        return
    }
    const parsed = manager.parse(content)
    editor.value.commands.setContent(parsed)
}

defineExpose({
    editor,
    getMarkdown,
    setMarkdown,
})
</script>

<template>
    <div class="journal-editor">
        <EditorToolbar :editor="editor" />
        <EditorContent :editor="editor" class="editor-content" />
    </div>
</template>

<style scoped>
.journal-editor {
    border: 1px solid var(--color-border, #e0e0e0);
    border-radius: var(--border-radius, 0.375rem);
    overflow: hidden;
    background-color: var(--color-bg, #ffffff);
}

.editor-content {
    min-height: 300px;
    padding: var(--spacing-md, 1rem);
}

.editor-content :deep(.tiptap) {
    outline: none;
    min-height: 280px;
    line-height: 1.6;
}

.editor-content :deep(.tiptap:focus) {
    background-color: var(--color-bg-focus, #fafafa);
}

.editor-content :deep(.tiptap p) {
    margin: 0 0 0.75em 0;
}

.editor-content :deep(.tiptap p:last-child) {
    margin-bottom: 0;
}

.editor-content :deep(.tiptap strong) {
    font-weight: 600;
}

.editor-content :deep(.tiptap em) {
    font-style: italic;
}

.editor-content :deep(.tiptap code) {
    background-color: var(--color-code-bg, #f3f4f6);
    border-radius: 0.25rem;
    padding: 0.125rem 0.375rem;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    font-size: 0.875em;
    color: var(--color-code-text, #374151);
}

.editor-content :deep(.tiptap pre) {
    background-color: var(--color-code-bg, #1f2937);
    border-radius: var(--border-radius, 0.375rem);
    padding: var(--spacing-md, 1rem);
    margin: 0.75em 0;
    overflow-x: auto;
}

.editor-content :deep(.tiptap pre code) {
    background-color: transparent;
    padding: 0;
    font-size: 0.875rem;
    color: var(--color-code-block-text, #e5e7eb);
    line-height: 1.5;
}

.editor-content :deep(.tiptap ul) {
    list-style-type: disc;
    padding-left: 1.5rem;
    margin: 0.75em 0;
}

.editor-content :deep(.tiptap ul li) {
    margin: 0.25em 0;
}

.editor-content :deep(.tiptap ul li p) {
    margin: 0;
}

.editor-content :deep([data-escaped]) {
    /* Escaped characters look identical to regular text */
}
</style>
