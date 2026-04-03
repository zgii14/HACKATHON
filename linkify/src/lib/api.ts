import { parseApiError } from "./errors";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type FetchOptions = RequestInit & {
    token?: string | null;
};

export async function apiFetch<T>(
    path: string,
    options: FetchOptions = {}
): Promise<T> {
    const { token, headers, body, ...rest } = options;
    const h = new Headers(headers);
    if (token) {
        h.set("Authorization", `Bearer ${token}`);
    }
    // Auto-set Content-Type for JSON bodies
    if (body && !h.has("Content-Type")) {
        h.set("Content-Type", "application/json");
    }

    const res = await fetch(`${API_BASE.replace(/\/$/, "")}${path}`, {
        ...rest,
        body,
        headers: h,
    });

    if (!res.ok) {
        // Jika backend balas 401, token mungkin expired tepat saat request berlangsung
        // (Clerk sedang silent refresh). Lempar AUTH_NOT_READY agar React Query
        // retry dengan token baru — bukan tampilkan error ke user.
        if (res.status === 401) {
            throw new Error("AUTH_NOT_READY");
        }
        const message = await parseApiError(res);
        throw new Error(message);
    }

    if (res.status === 204) {
        return undefined as T;
    }

    return res.json() as Promise<T>;
}
