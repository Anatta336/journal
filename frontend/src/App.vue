<script setup lang="ts">
import { ref } from "vue";
import { useJournalInit } from "@/composables/useJournal";
import { useRoute } from "vue-router";
import { logout, logoutAll } from "@/services/auth";

const { isOnline, isSyncing } = useJournalInit();
const route = useRoute();

const confirmingLogoutAll = ref(false);
const logoutAllError = ref("");

async function handleLogout(): Promise<void> {
    await logout();
}

async function handleLogoutAll(): Promise<void> {
    logoutAllError.value = "";
    try {
        await logoutAll();
    } catch {
        logoutAllError.value = "Could not connect to server. Please try again when online.";
    }
}

function cancelLogoutAll(): void {
    confirmingLogoutAll.value = false;
    logoutAllError.value = "";
}
</script>

<template>
    <div class="app">
        <template v-if="route.name !== 'login'">
            <header class="app-header">
                <router-link to="/entries" data-testid="back-link">
                    <h1>Journal</h1>
                </router-link>
                <div class="header-right">
                    <router-link
                        to="/settings"
                        class="settings-link"
                        data-testid="settings-link"
                    >
                        Settings
                    </router-link>
                    <button
                        class="logout-btn"
                        data-testid="logout-btn"
                        @click="handleLogout"
                    >
                        Log out
                    </button>
                    <template v-if="confirmingLogoutAll">
                        <span
                            v-if="logoutAllError"
                            class="logout-all-error"
                            data-testid="logout-all-error"
                        >{{ logoutAllError }}</span>
                        <span v-else class="confirm-text">Invalidate all tokens?</span>
                        <button
                            class="logout-btn danger"
                            data-testid="logout-all-confirm-btn"
                            @click="handleLogoutAll"
                        >
                            Confirm
                        </button>
                        <button
                            class="logout-btn"
                            data-testid="logout-all-cancel-btn"
                            @click="cancelLogoutAll"
                        >
                            Cancel
                        </button>
                    </template>
                    <button
                        v-else
                        class="logout-btn danger"
                        data-testid="logout-all-btn"
                        @click="confirmingLogoutAll = true"
                    >
                        Invalidate all tokens
                    </button>
                    <span
                        class="sync-status"
                        :class="{ syncing: isSyncing }"
                        data-testid="sync-status"
                    >
                        <template v-if="isSyncing">Syncing...</template>
                    </span>
                    <span
                        class="connection-status"
                        :class="{ online: isOnline, offline: !isOnline }"
                        data-testid="connection-status"
                    >
                        {{ isOnline ? "Online" : "Offline" }}
                    </span>
                </div>
            </header>
            <main class="app-main">
                <router-view />
            </main>
        </template>
        <template v-else>
            <router-view />
        </template>
    </div>
</template>

<style scoped>
.app {
    --color-bg: #1f1f1f;
    --color-bg-subtle: #181818;
    --color-bg-focus: #2d2d2f;
    --color-text: #cccccc;
    --color-border: #2b2b2b;
    --color-primary: #3d77d0;
    --color-primary-hover: #2b4ea0;
    --color-hover-bg: #373838;
    --color-code-bg: #3b3d41;
    --color-code-text: #aedafc;
    --color-select-bg: #344e76;
    --color-success: #10b981;
    --color-warning: #f59e0b;
    --color-danger: #d1584b;
    --color-danger-hover: #ba4b3e;

    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
    --font-family:
        system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        sans-serif;
    --font-size-base: 1rem;
    --font-size-sm: 0.875rem;
    --font-size-lg: 1.25rem;
    --border-radius: 0.375rem;

    min-height: 100vh;
    font-family: var(--font-family);
    font-size: var(--font-size-base);
    color: var(--color-text);
    background-color: var(--color-bg);
    padding: var(--spacing-sm);
}

.app-header {
    padding: 0 0 var(--spacing-sm) 0;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
}

.app-header a {
    text-decoration: none;
}

.app-header a:hover {
    text-decoration: underline;
}

.app-header h1 {
    margin: 0;
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-primary);
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
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

.settings-link {
    color: var(--color-primary);
    text-decoration: none;
}

.settings-link:hover {
    text-decoration: underline;
}

.logout-btn {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--color-primary);
    font-size: var(--font-size-sm);
    font-family: inherit;
}

.logout-btn:hover {
    text-decoration: underline;
}

.logout-btn.danger {
    color: var(--color-danger);
}

.logout-btn.danger:hover {
    color: var(--color-danger-hover);
}

.confirm-text {
    font-size: var(--font-size-sm);
    color: var(--color-danger);
}

.logout-all-error {
    font-size: var(--font-size-sm);
    color: var(--color-warning);
}

.app-main {
    padding: var(--spacing-sm) 0 0 0;
    max-width: 800px;
    margin: 0 auto;
}
</style>
