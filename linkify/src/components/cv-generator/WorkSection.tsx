"use client";

import { EmptyState, Reveal, SecTitle, Spotlight } from "@/components/dashboard/ui";
import type { ExperienceItem } from "@/hooks/useCvForm";
import { Trash2 } from "lucide-react";

type Props = {
    workExperience: ExperienceItem[];
    setWorkExperience: React.Dispatch<React.SetStateAction<ExperienceItem[]>>;
};

export function WorkSection({ workExperience, setWorkExperience }: Props) {
    const addWork = () => {
        setWorkExperience((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                company: "",
                role: "",
                location: "",
                period: "",
                bullets: [{ id: crypto.randomUUID(), text: "" }],
            },
        ]);
    };

    const removeWork = (id: string) => {
        setWorkExperience((prev) => prev.filter((w) => w.id !== id));
    };

    const updateWorkField = (id: string, field: keyof Omit<ExperienceItem, "id" | "bullets">, value: string) => {
        setWorkExperience((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    };

    const handleBulletChange = (workId: string, bulletId: string, val: string) => {
        setWorkExperience((prev) =>
            prev.map((w) =>
                w.id === workId ? { ...w, bullets: w.bullets.map((b) => (b.id === bulletId ? { ...b, text: val } : b)) } : w
            )
        );
    };

    const addBullet = (workId: string) => {
        setWorkExperience((prev) =>
            prev.map((w) => (w.id === workId ? { ...w, bullets: [...w.bullets, { id: crypto.randomUUID(), text: "" }] } : w))
        );
    };

    const removeBullet = (workId: string, bulletId: string) => {
        setWorkExperience((prev) =>
            prev.map((w) => (w.id === workId ? { ...w, bullets: w.bullets.filter((b) => b.id !== bulletId) } : w))
        );
    };

    return (
        <Reveal delay={0.4} className="pt-8">
            <section>
                <SecTitle
                    title="4. Pengalaman Kerja"
                    meta={
                        <button
                            type="button"
                            onClick={addWork}
                            className="rounded-md border border-border px-3 py-1.5 text-[12.5px] font-semibold hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            + Tambah Kerja
                        </button>
                    }
                />
                <div className="divide-y divide-border/60">
                    {workExperience.map((work) => (
                        <Spotlight key={work.id} className="rounded-md">
                            <div className="relative space-y-3 border-b border-border/60 py-4 last:border-b-0">
                                <button
                                    type="button"
                                    onClick={() => removeWork(work.id)}
                                    className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-rose-500"
                                    aria-label="Hapus pengalaman kerja"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>

                                <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Nama Perusahaan / Organisasi
                                        </label>
                                        <input
                                            value={work.company}
                                            onChange={(e) => updateWorkField(work.id, "company", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: Coding Camp 2026"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Lokasi
                                        </label>
                                        <input
                                            value={work.location}
                                            onChange={(e) => updateWorkField(work.id, "location", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: Bengkulu, Indonesia"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Jabatan / Posisi
                                        </label>
                                        <input
                                            value={work.role}
                                            onChange={(e) => updateWorkField(work.id, "role", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: AI Engineer"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Periode (Tanggal)
                                        </label>
                                        <input
                                            value={work.period}
                                            onChange={(e) => updateWorkField(work.id, "period", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: Jan 2026 - Sekarang"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between">
                                        <label className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Deskripsi Tugas / Pencapaian
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => addBullet(work.id)}
                                            className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            + Tambah poin
                                        </button>
                                    </div>

                                    {work.bullets.map((b) => (
                                        <div key={b.id} className="flex items-center gap-2">
                                            <input
                                                value={b.text}
                                                onChange={(e) => handleBulletChange(work.id, b.id, e.target.value)}
                                                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                                placeholder="Tulis kontribusi..."
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeBullet(work.id, b.id)}
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
                    {workExperience.length === 0 && (
                        <EmptyState title="Belum ada riwayat pekerjaan">Tambah pengalaman pertama — klik &quot;Tambah&quot; di atas.</EmptyState>
                    )}
                </div>
            </section>
        </Reveal>
    );
}
