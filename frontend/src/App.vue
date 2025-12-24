<script setup lang="ts">
import JournalEditor from './components/JournalEditor.vue'
</script>

<template>
    <div class="app">
        <header class="app-header">
            <h1>Journal</h1>
        </header>
        <main class="app-main">
            <JournalEditor />
        </main>
    </div>
</template>

<style scoped>
.app {
    --color-bg: #ffffff;
    --color-bg-subtle: #f8f9fa;
    --color-bg-focus: #fafafa;
    --color-text: #1a1a1a;
    --color-border: #e0e0e0;
    --color-primary: #2563eb;
    --color-primary-hover: #1d4ed8;
    --color-hover: #e9ecef;
    --color-code-bg: #f3f4f6;
    --color-code-text: #374151;
    --color-code-block-text: #e5e7eb;
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    --font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-size-base: 1rem;
    --font-size-lg: 1.25rem;
    --border-radius: 0.375rem;

    min-height: 100vh;
    font-family: var(--font-family);
    font-size: var(--font-size-base);
    color: var(--color-text);
    background-color: var(--color-bg);
}

.app-header {
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--color-border);
}

.app-header h1 {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
}

.app-main {
    padding: var(--spacing-lg);
    max-width: 800px;
    margin: 0 auto;
}
</style>
