/**
 * Pesan fallback berdasarkan HTTP status code.
 * Ditampilkan saat backend tidak mengembalikan pesan error spesifik.
 */
const STATUS_MESSAGES: Record<number, string> = {
    400: "Permintaan tidak valid. Periksa kembali data yang kamu masukkan.",
    401: "Sesi login kamu telah berakhir. Silakan login ulang.",
    403: "Kamu tidak memiliki akses ke fitur ini.",
    404: "Data yang diminta tidak ditemukan.",
    408: "Permintaan timeout. Periksa koneksi internetmu.",
    413: "File yang diupload terlalu besar.",
    422: "Data yang dikirim tidak valid. Periksa kembali inputmu.",
    429: "Terlalu banyak permintaan. Silakan tunggu sebentar lalu coba lagi.",
    500: "Terjadi kesalahan pada server. Coba lagi nanti.",
    502: "Layanan AI sedang tidak tersedia. Coba beberapa saat lagi.",
    503: "Server sedang dalam maintenance. Coba lagi nanti.",
    504: "Server tidak merespons. Periksa koneksimu dan coba lagi.",
};

type FastApiValidationError = {
    loc?: (string | number)[];
    msg?: string;
    type?: string;
};

/**
 * Parse response error dari FastAPI menjadi pesan yang human-readable.
 *
 * FastAPI mengembalikan error dalam format:
 * - `{ "detail": "pesan string" }` → untuk HTTPException
 * - `{ "detail": [{ loc, msg, type }] }` → untuk validation error (422)
 * - `{ "detail": { "code", "message" } }` → error terstruktur (mis. GITHUB_REQUIRED)
 */
export async function parseApiError(res: Response): Promise<string> {
    return (await parseApiErrorDetail(res)).message;
}

/** Sama seperti parseApiError, plus `code` bila backend mengirim error terstruktur. */
export async function parseApiErrorDetail(res: Response): Promise<{ message: string; code?: string }> {
    const statusFallback = STATUS_MESSAGES[res.status] ?? `Error ${res.status}`;

    let text = "";
    try {
        text = await res.text();
    } catch {
        return { message: statusFallback };
    }

    if (!text.trim()) return { message: statusFallback };

    // Coba parse sebagai JSON
    try {
        const json = JSON.parse(text);

        // Format 1: { "detail": "string" } — HTTPException standard FastAPI
        if (typeof json.detail === "string" && json.detail.trim()) {
            return { message: json.detail.trim() };
        }

        // Format terstruktur: { "detail": { "code": "...", "message": "..." } }
        if (json.detail && typeof json.detail === "object" && !Array.isArray(json.detail)) {
            const code = typeof json.detail.code === "string" ? json.detail.code : undefined;
            const message = typeof json.detail.message === "string" && json.detail.message.trim() ? json.detail.message.trim() : statusFallback;
            return { message, code };
        }

        // Format 2: { "detail": [{loc, msg, type}] } — Pydantic validation error
        if (Array.isArray(json.detail) && json.detail.length > 0) {
            const messages = (json.detail as FastApiValidationError[])
                .map((e) => {
                    const field = e.loc?.filter((l) => l !== "body").pop();
                    const fieldStr = field ? `'${field}'` : "";
                    return [fieldStr, e.msg].filter(Boolean).join(": ");
                })
                .filter(Boolean);

            if (messages.length > 0) {
                return { message: messages.join(" · ") };
            }
        }

        // Format 3: { "message": "..." } — format non-standard
        if (typeof json.message === "string" && json.message.trim()) {
            return { message: json.message.trim() };
        }
    } catch {
        // Bukan JSON — mungkin plain text dari server/proxy
        const trimmed = text.trim();
        // Jangan tampilkan HTML error page (nginx/proxy)
        if (trimmed && !trimmed.startsWith("<")) {
            return { message: trimmed };
        }
    }

    return { message: statusFallback };
}
