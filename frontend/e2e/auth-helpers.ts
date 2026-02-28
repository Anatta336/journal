import type { Page } from "@playwright/test";

export const TEST_PASSWORD = "testpassword";
export const API_BASE = `http://localhost:${process.env.VITE_BACKEND_PORT || "3014"}`;

let cachedToken: string | null = null;

export async function getAuthToken(): Promise<string> {
    if (cachedToken) return cachedToken;
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: TEST_PASSWORD }),
    });
    if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
    }
    const { token } = await response.json();
    cachedToken = token;
    return token;
}

export async function setPageAuthToken(page: Page): Promise<void> {
    const token = await getAuthToken();
    await page.addInitScript((t) => {
        localStorage.setItem("auth_token", t);
    }, token);
}

export async function apiRequest(
    path: string,
    options: RequestInit = {},
): Promise<Response> {
    const token = await getAuthToken();
    return fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
        },
    });
}

export interface EntryResponse {
    id: string;
    creationDate: string;
    lastUpdated: string;
    content: string;
    tags?: string[];
}

export async function createEntry(
    content: string,
    tags?: string[],
): Promise<EntryResponse> {
    const response = await apiRequest("/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, tags }),
    });
    return response.json();
}

export async function updateEntry(
    id: string,
    content: string,
): Promise<EntryResponse> {
    const response = await apiRequest(`/entries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
    });
    return response.json();
}

export async function deleteEntry(id: string): Promise<void> {
    await apiRequest(`/entries/${id}`, { method: "DELETE" });
}

export async function deleteAllEntries(): Promise<void> {
    const response = await apiRequest("/entries");
    if (!response.ok) return;
    const entries = await response.json();
    if (!Array.isArray(entries)) return;
    for (const entry of entries) {
        await apiRequest(`/entries/${entry.id}`, { method: "DELETE" });
    }
}
