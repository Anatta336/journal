<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useJournal } from '@/composables/useJournal'

const { syncNow, forceRefresh, isSyncing, lastSyncTime, isOnline, refreshProgress } = useJournal()

const buildNumber = __BUILD_NUMBER__
const storageUsed = ref<string>('')
const syncResult = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const forceRefreshResult = ref<{ type: 'success' | 'error'; text: string } | null>(null)
const isForceRefreshing = ref(false)

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

async function handleForceRefresh() {
    const confirmed = window.confirm(
        'Force Refresh will overwrite all local changes with server data. ' +
        'Any unsynced local entries will be lost, and entries deleted on the server will be removed locally. ' +
        'Are you sure you want to continue?'
    )
    if (!confirmed) return

    forceRefreshResult.value = null
    isForceRefreshing.value = true
    try {
        await forceRefresh()
        forceRefreshResult.value = { type: 'success', text: 'Force refresh completed successfully' }
    } catch (error) {
        forceRefreshResult.value = {
            type: 'error',
            text: error instanceof Error ? error.message : 'Force refresh failed. Please try again.',
        }
    } finally {
        isForceRefreshing.value = false
        await updateStorageEstimate()
    }
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

            <div class="setting-row force-refresh-row">
                <button
                    class="force-refresh-btn"
                    @click="handleForceRefresh"
                    :disabled="isSyncing || isForceRefreshing || !isOnline"
                    data-testid="force-refresh-btn"
                >
                    {{ isForceRefreshing ? 'Refreshing...' : 'Force Refresh' }}
                </button>
                <span
                    v-if="isForceRefreshing && refreshProgress.total > 0"
                    class="refresh-progress"
                    data-testid="refresh-progress"
                >
                    {{ refreshProgress.current }}/{{ refreshProgress.total }}
                </span>
                <span
                    v-else-if="forceRefreshResult"
                    class="sync-result"
                    :class="forceRefreshResult.type"
                    data-testid="force-refresh-result"
                >
                    {{ forceRefreshResult.text }}
                </span>
                <span
                    v-else-if="!isOnline"
                    class="offline-message"
                    data-testid="force-refresh-offline-msg"
                >
                    Offline - Force refresh requires network
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

        <section class="settings-section">
            <h3>About</h3>

            <div class="setting-row">
                <span class="setting-label">Build Number:</span>
                <span class="setting-value" data-testid="build-number">
                    {{ buildNumber }}
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

.force-refresh-row {
    margin-top: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--color-border, #e5e7eb);
}

.force-refresh-btn {
    padding: 0.5rem 1rem;
    background: var(--color-danger, #dc2626);
    color: white;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
}

.force-refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.force-refresh-btn:hover:not(:disabled) {
    background: var(--color-danger-hover, #b91c1c);
}

.refresh-progress {
    font-size: 0.875rem;
    color: var(--color-text-muted, #6b7280);
}

.offline-message {
    font-size: 0.875rem;
    color: var(--color-text-muted, #6b7280);
}
</style>
