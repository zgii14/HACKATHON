"use client";

import { EmptyState, Reveal, SecTitle, Spotlight } from "@/components/dashboard/ui";
import type { TrainingItem } from "@/hooks/useCvForm";
import { Trash2 } from "lucide-react";

type Props = {
    training: TrainingItem[];
    setTraining: React.Dispatch<React.SetStateAction<TrainingItem[]>>;
};

export function TrainingSection({ training, setTraining }: Props) {
    const addTraining = () => {
        setTraining((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                title: "",
                provider: "",
                location: "",
                period: "",
                bullets: [{ id: crypto.randomUUID(), text: "" }],
            },
        ]);
    };

    const removeTraining = (id: string) => {
        setTraining((prev) => prev.filter((t) => t.id !== id));
    };

    const updateField = (id: string, field: keyof Omit<TrainingItem, "id" | "bullets">, value: string) => {
        setTraining((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    };

    const handleBulletChange = (tId: string, bulletId: string, val: string) => {
        setTraining((prev) =>
            prev.map((t) =>
                t.id === tId ? { ...t, bullets: t.bullets.map((b) => (b.id === bulletId ? { ...b, text: val } : b)) } : t
            )
        );
    };

    const addBullet = (tId: string) => {
        setTraining((prev) =>
            prev.map((t) => (t.id === tId ? { ...t, bullets: [...t.bullets, { id: crypto.randomUUID(), text: "" }] } : t))
        );
    };

    const removeBullet = (tId: string, bulletId: string) => {
        setTraining((prev) =>
            prev.map((t) => (t.id === tId ? { ...t, bullets: t.bullets.filter((b) => b.id !== bulletId) } : t))
        );
    };

    return (
        <Reveal delay={0.54} className="pt-8">
            <section>
                <SecTitle
                    title="6. Pelatihan & Bootcamp"
                    meta={
                        <button
                            type="button"
                            onClick={addTraining}
                            className="rounded-md border border-border px-3 py-1.5 text-[12.5px] font-semibold hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            + Tambah Pelatihan
                        </button>
                    }
                />
                <div className="divide-y divide-border/60">
                    {training.map((t) => (
                        <Spotlight key={t.id} className="rounded-md">
                            <div className="relative space-y-3 border-b border-border/60 py-4 last:border-b-0">
                                <button
                                    type="button"
                                    onClick={() => removeTraining(t.id)}
                                    className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-rose-500"
                                    aria-label="Hapus pelatihan"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>

                                <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Judul Pelatihan
                                        </label>
                                        <input
                                            value={t.title}
                                            onChange={(e) => updateField(t.id, "title", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: Coding Camp 2025"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Penyelenggara / Provider
                                        </label>
                                        <input
                                            value={t.provider}
                                            onChange={(e) => updateField(t.id, "provider", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: DBS Foundation"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Lokasi
                                        </label>
                                        <input
                                            value={t.location}
                                            onChange={(e) => updateField(t.id, "location", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: Bengkulu (Remote)"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Periode (Tanggal)
                                        </label>
                                        <input
                                            value={t.period}
                                            onChange={(e) => updateField(t.id, "period", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: Feb 2025 - Juni 2025"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between">
                                        <label className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Deskripsi / Hasil Pelatihan
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => addBullet(t.id)}
                                            className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            + Tambah poin
                                        </button>
                                    </div>

                                    {t.bullets.map((b) => (
                                        <div key={b.id} className="flex items-center gap-2">
                                            <input
                                                value={b.text}
                                                onChange={(e) => handleBulletChange(t.id, b.id, e.target.value)}
                                                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                                placeholder="Tulis detail..."
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeBullet(t.id, b.id)}
                                                className="text-muted-foreground transition-colors hover:text-rose-500"
                                                aria-label="Hapus poin"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Spotlight>
                    ))}
                    {training.length === 0 && (
                        <EmptyState title="Belum ada riwayat pelatihan">Tambah pelatihan pertama — klik &quot;Tambah&quot; di atas.</EmptyState>
                    )}
                </div>
            </section>
        </Reveal>
    );
}
