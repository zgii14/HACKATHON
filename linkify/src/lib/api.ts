import { parseApiError } from "./errors";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type FetchOptions = RequestInit & {
    token?: string | null;
};

export class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }
}

export async function apiFetch<T>(
    path: string,
    options: FetchOptions = {}
): Promise<T> {
    const { token, headers, body, ...rest } = options;
    const h = new Headers(headers);

    if (token) {
        h.set("Authorization", `Bearer ${token}`);
    }

    if (body && !h.has("Content-Type")) {
        h.set("Content-Type", "application/json");
    }

    const res = await fetch(`${API_BASE.replace(/\/$/, "")}${path}`, {
        ...rest,
        body,
        headers: h,
    });

    if (!res.ok) {
        const message = await parseApiError(res);
        throw new ApiError(message, res.status);
    }

    if (res.status === 204) {
        return undefined as T;
    }

    return res.json() as Promise<T>;
}
