<template>
    <div class="login-container">
        <form class="login-form" @submit.prevent="handleSubmit">
            <h1>Journal</h1>
            <div class="field">
                <label for="password">Password</label>
                <input
                    id="password"
                    v-model="password"
                    type="password"
                    autocomplete="current-password"
                    autofocus
                    :disabled="loading"
                    required
                />
            </div>
            <p v-if="error" class="error" role="alert">{{ error }}</p>
            <button type="submit" :disabled="loading || !password">
                {{ loading ? "Signing in…" : "Sign in" }}
            </button>
        </form>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { setToken } from "@/services/auth";

const router = useRouter();
const password = ref("");
const error = ref("");
const loading = ref(false);

async function handleSubmit(): Promise<void> {
    error.value = "";
    loading.value = true;
    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: password.value }),
        });
        if (response.ok) {
            const { token } = await response.json();
            setToken(token);
            await router.push("/");
        } else if (response.status === 401) {
            error.value = "Incorrect password. Please try again.";
        } else {
            error.value = "An error occurred. Please try again.";
        }
    } catch {
        error.value = "Could not connect to the server. Please try again.";
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped>
.login-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100dvh;
    padding: var(--spacing-md);
    background: var(--color-bg);
}

.login-form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    width: 100%;
    max-width: 360px;
}

h1 {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-primary);
    text-align: center;
}

.field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
}

label {
    font-size: var(--font-size-sm);
    font-weight: 500;
    color: var(--color-text);
}

input[type="password"] {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    background: var(--color-bg-subtle);
    color: var(--color-text);
    font-size: var(--font-size-base);
    outline: none;
    transition: border-color 0.15s;
}

input[type="password"]:focus {
    border-color: var(--color-primary);
}

input[type="password"]:disabled {
    opacity: 0.6;
}

.error {
    margin: 0;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--border-radius);
    background: color-mix(in srgb, var(--color-danger) 15%, transparent);
    color: var(--color-danger);
    font-size: var(--font-size-sm);
}

button[type="submit"] {
    padding: var(--spacing-sm) var(--spacing-md);
    border: none;
    border-radius: var(--border-radius);
    background: var(--color-primary);
    color: #fff;
    font-size: var(--font-size-base);
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.15s;
}

button[type="submit"]:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

button[type="submit"]:not(:disabled):hover {
    background: var(--color-primary-hover);
}
</style>
