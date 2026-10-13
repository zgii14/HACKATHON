import { parseApiErrorDetail } from "./errors";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type FetchOptions = RequestInit & {
    token?: string | null;
};

export class ApiError extends Error {
    status: number;
    /** Kode error terstruktur dari backend, mis. "GITHUB_REQUIRED". */
    code?: string;

    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
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

    if (body && !(typeof FormData !== "undefined" && body instanceof FormData) && !h.has("Content-Type")) {
        h.set("Content-Type", "application/json");
    }

    const res = await fetch(`${API_BASE.replace(/\/$/, "")}${path}`, {
        ...rest,
        body,
        headers: h,
    });

    if (!res.ok) {
        const { message, code } = await parseApiErrorDetail(res);
        throw new ApiError(message, res.status, code);
    }

    if (res.status === 204) {
        return undefined as T;
    }

    return res.json() as Promise<T>;
}

/** Sama seperti apiFetch tapi mengembalikan Blob (untuk file: PDF, dsb). */
export async function apiFetchBlob(
    path: string,
    options: FetchOptions = {}
): Promise<Blob> {
    const { token, headers, body, ...rest } = options;
    const h = new Headers(headers);
    if (token) {
        h.set("Authorization", `Bearer ${token}`);
    }
    const res = await fetch(`${API_BASE.replace(/\/$/, "")}${path}`, { ...rest, body, headers: h });
    if (!res.ok) {
        const { message, code } = await parseApiErrorDetail(res);
        throw new ApiError(message, res.status, code);
    }
    return res.blob();
}
