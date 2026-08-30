"use client";

import { EmptyState, Reveal, SecTitle, Spotlight } from "@/components/dashboard/ui";
import type { EducationItem } from "@/hooks/useCvForm";
import { Trash2 } from "lucide-react";

type Props = {
    education: EducationItem[];
    setEducation: React.Dispatch<React.SetStateAction<EducationItem[]>>;
};

export function EducationSection({ education, setEducation }: Props) {
    const addEducation = () => {
        setEducation((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                institution: "",
                location: "",
                major: "",
                degree: "",
                period: "",
                gpa: "",
            },
        ]);
    };

    const removeEducation = (id: string) => {
        setEducation((prev) => prev.filter((e) => e.id !== id));
    };

    const updateField = (id: string, field: keyof Omit<EducationItem, "id">, value: string) => {
        setEducation((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    };

    return (
        <Reveal delay={0.33} className="pt-8">
            <section>
                <SecTitle
                    title="3. Riwayat Pendidikan"
                    meta={
                        <button
                            type="button"
                            onClick={addEducation}
                            className="rounded-md border border-border px-3 py-1.5 text-[12.5px] font-semibold hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            + Tambah Sekolah
                        </button>
                    }
                />
                <div className="divide-y divide-border/60">
                    {education.map((edu) => (
                        <Spotlight key={edu.id} className="rounded-md">
                            <div className="relative space-y-3 border-b border-border/60 py-4 last:border-b-0">
                                <button
                                    type="button"
                                    onClick={() => removeEducation(edu.id)}
                                    className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-rose-500"
                                    aria-label="Hapus pendidikan"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                                <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Nama Universitas / Sekolah
                                        </label>
                                        <input
                                            value={edu.institution}
                                            onChange={(e) => updateField(edu.id, "institution", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: Universitas Bengkulu"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Lokasi
                                        </label>
                                        <input
                                            value={edu.location}
                                            onChange={(e) => updateField(edu.id, "location", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: Bengkulu, Indonesia"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Gelar / Bidang Studi
                                        </label>
                                        <input
                                            value={edu.degree}
                                            onChange={(e) => updateField(edu.id, "degree", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: Mahasiswa, Informatika"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Jurusan / Fokus
                                        </label>
                                        <input
                                            value={edu.major}
                                            onChange={(e) => updateField(edu.id, "major", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: Rekayasa Perangkat Lunak"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Periode (Tanggal)
                                        </label>
                                        <input
                                            value={edu.period}
                                            onChange={(e) => updateField(edu.id, "period", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: Agu 2022 - Sekarang"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            IPK / Rata-rata
                                        </label>
                                        <input
                                            value={edu.gpa}
                                            onChange={(e) => updateField(edu.id, "gpa", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: 3.86/4.00"
                                        />
                                    </div>
                                </div>
                            </div>
                        </Spotlight>
                    ))}
                    {education.length === 0 && (
                        <EmptyState title="Belum ada riwayat pendidikan">Tambah pendidikan pertama — klik &quot;Tambah&quot; di atas.</EmptyState>
                    )}
                </div>
            </section>
        </Reveal>
    );
}
