<script setup lang="ts">
import { ref, onMounted, watch, nextTick, computed } from 'vue'
import { marked } from 'marked'

const props = defineProps<{
    content: string
}>()

const containerRef = ref<HTMLElement | null>(null)
const hasOverflow = ref(false)

const htmlContent = computed(() => {
    return marked.parse(props.content) as string
})

async function checkOverflow() {
    await nextTick()
    if (containerRef.value) {
        hasOverflow.value = containerRef.value.scrollHeight > containerRef.value.clientHeight
    }
}

onMounted(checkOverflow)
watch(() => props.content, checkOverflow)
</script>

<template>
    <div
        ref="containerRef"
        class="entry-preview"
        :class="{ 'has-overflow': hasOverflow }"
        v-html="htmlContent"
    ></div>
</template>

<style scoped>
.entry-preview {
    max-height: 90px;
    overflow-y: hidden;
    position: relative;
    margin-top: var(--spacing-sm);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    opacity: 0.8;
}

.entry-preview.has-overflow::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 20px;
    background: linear-gradient(to bottom, transparent, var(--preview-fade-color, var(--color-bg, #1f1f1f)));
    pointer-events: none;
}

/* Ensure preview content doesn't break layout */
.entry-preview :deep(p) {
    margin: 0 0 0.5em 0;
}

.entry-preview :deep(h1),
.entry-preview :deep(h2),
.entry-preview :deep(h3),
.entry-preview :deep(h4),
.entry-preview :deep(h5),
.entry-preview :deep(h6) {
    margin: 0 0 0.5em 0;
    font-size: 1em;
    font-weight: bold;
}

.entry-preview :deep(ul),
.entry-preview :deep(ol) {
    margin: 0 0 0.5em 0;
    padding-left: 1.5em;
}

.entry-preview :deep(blockquote) {
    margin: 0 0 0.5em 0;
    padding-left: 0.5em;
    border-left: 2px solid var(--color-border);
    opacity: 0.8;
}
</style>
