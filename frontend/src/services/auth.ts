const TOKEN_KEY = "auth_token";

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

export function handleUnauthorized(): void {
    clearToken();
    window.location.href = "/login";
}

export async function logout(): Promise<void> {
    const token = getToken();
    if (token) {
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch {
            // Proceed with local logout even if the server is unreachable
        }
    }
    clearToken();
    window.location.href = "/login";
}

export async function logoutAll(): Promise<void> {
    const token = getToken();
    if (token) {
        const response = await fetch("/api/auth/logout/all", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }
    }
    clearToken();
    window.location.href = "/login";
}
