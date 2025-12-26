<script setup lang="ts">
import { useJournalInit } from '@/composables/useJournal'

const { isOnline, isSyncing } = useJournalInit()
</script>

<template>
    <div class="app">
        <header class="app-header">
            <h1>Journal</h1>
            <div class="header-right">
                <span class="sync-status" :class="{ syncing: isSyncing }" data-testid="sync-status">
                    <template v-if="isSyncing">Syncing...</template>
                </span>
                <span
                    class="connection-status"
                    :class="{ online: isOnline, offline: !isOnline }"
                    data-testid="connection-status"
                >
                    {{ isOnline ? 'Online' : 'Offline' }}
                </span>
                <router-link to="/settings" class="settings-link" data-testid="settings-link">
                    Settings
                </router-link>
            </div>
        </header>
        <main class="app-main">
            <router-view />
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
    --color-success: #10b981;
    --color-warning: #f59e0b;
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    --font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-size-base: 1rem;
    --font-size-sm: 0.875rem;
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
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
}

.app-header h1 {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
}

.header-right {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    font-size: var(--font-size-sm);
}

.connection-status {
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--border-radius);
    font-weight: 500;
}

.connection-status.online {
    background-color: color-mix(in srgb, var(--color-success) 15%, transparent);
    color: var(--color-success);
}

.connection-status.offline {
    background-color: color-mix(in srgb, var(--color-warning) 15%, transparent);
    color: var(--color-warning);
}

.sync-status {
    color: var(--color-primary);
    min-width: 70px;
}

.sync-status.syncing {
    animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.settings-link {
    color: var(--color-primary);
    text-decoration: none;
}

.settings-link:hover {
    text-decoration: underline;
}

.app-main {
    padding: var(--spacing-lg);
    max-width: 800px;
    margin: 0 auto;
}
</style>
