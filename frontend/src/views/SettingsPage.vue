<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useJournal } from '@/composables/useJournal'

const { syncNow, isSyncing, lastSyncTime } = useJournal()

const storageUsed = ref<string>('')
const syncResult = ref<{ type: 'success' | 'error'; text: string } | null>(null)

async function updateStorageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate()
        const used = estimate.usage || 0
        storageUsed.value = formatBytes(used)
    } else {
        storageUsed.value = 'Not available'
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function formatLastSync(isoDate?: string): string {
    if (!isoDate) return 'Never'
    const date = new Date(isoDate)
    return date.toLocaleString()
}

async function handleSyncNow() {
    syncResult.value = null
    const success = await syncNow()
    if (success) {
        syncResult.value = { type: 'success', text: 'Sync completed successfully' }
    } else {
        syncResult.value = { type: 'error', text: 'Sync failed. Please try again.' }
    }
    await updateStorageEstimate()
}

onMounted(() => {
    updateStorageEstimate()
})
</script>

<template>
    <div class="settings-page">
        <h2>Settings</h2>

        <section class="settings-section">
            <h3>Synchronization</h3>

            <div class="setting-row">
                <span class="setting-label">Last Sync:</span>
                <span class="setting-value" data-testid="last-sync-time">
                    {{ formatLastSync(lastSyncTime) }}
                </span>
            </div>

            <div class="setting-row">
                <button
                    class="sync-btn"
                    @click="handleSyncNow"
                    :disabled="isSyncing"
                    data-testid="sync-now-btn"
                >
                    {{ isSyncing ? 'Syncing...' : 'Sync Now' }}
                </button>
                <span
                    v-if="syncResult"
                    class="sync-result"
                    :class="syncResult.type"
                    data-testid="sync-result"
                >
                    {{ syncResult.text }}
                </span>
            </div>
        </section>

        <section class="settings-section">
            <h3>Storage</h3>

            <div class="setting-row">
                <span class="setting-label">Storage Used:</span>
                <span class="setting-value" data-testid="storage-used">
                    {{ storageUsed }}
                </span>
            </div>
        </section>
    </div>
</template>

<style scoped>
.settings-page {
    max-width: 600px;
}

.settings-page h2 {
    margin: 0 0 1.5rem;
    font-size: 1.5rem;
}

.settings-section {
    margin-bottom: 2rem;
    padding: 1rem;
    background: var(--color-bg-subtle, #f8f9fa);
    border-radius: 0.5rem;
}

.settings-section h3 {
    margin: 0 0 1rem;
    font-size: 1.1rem;
    color: var(--color-text, #1a1a1a);
}

.setting-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 0.75rem;
}

.setting-row:last-child {
    margin-bottom: 0;
}

.setting-label {
    font-weight: 500;
    min-width: 100px;
}

.setting-value {
    color: var(--color-text, #1a1a1a);
}

.sync-btn {
    padding: 0.5rem 1rem;
    background: var(--color-primary, #2563eb);
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
}

.sync-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.sync-btn:hover:not(:disabled) {
    background: var(--color-primary-hover, #1d4ed8);
}

.sync-result {
    font-size: 0.875rem;
}

.sync-result.success {
    color: var(--color-success, #10b981);
}

.sync-result.error {
    color: #ef4444;
}
</style>
