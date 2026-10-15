export type SaveQueueState = { status: "saving" | "saved" | "error"; error?: unknown };

/**
 * Antrian simpan tunggal: paling banyak satu `save` berjalan. Nilai yang masuk selama
 * save berjalan menunggu, dan hanya versi terbaru yang dikirim berikutnya.
 */
export function createSaveQueue<T>(save: (value: T) => Promise<void>, onState: (state: SaveQueueState) => void) {
    let pending: { value: T } | null = null;
    let running: Promise<boolean> | null = null;
    let lastOk = true;

    const drain = async (): Promise<boolean> => {
        while (pending) {
            const { value } = pending;
            pending = null;
            onState({ status: "saving" });
            try {
                await save(value);
            } catch (error) {
                // Pertahankan versi yang gagal untuk "Coba lagi", kecuali sudah ada yang lebih baru.
                if (!pending) pending = { value };
                onState({ status: "error", error });
                return false;
            }
        }
        onState({ status: "saved" });
        return true;
    };

    const queue = {
        push(value: T) {
            pending = { value };
        },
        hasPending() {
            return pending !== null || running !== null;
        },
        flush(): Promise<boolean> {
            if (running) return running.then(() => (pending ? queue.flush() : lastOk));
            if (!pending) return Promise.resolve(lastOk);
            running = drain().then((ok) => {
                lastOk = ok;
                running = null;
                return ok;
            });
            return running;
        },
    };
    return queue;
}
