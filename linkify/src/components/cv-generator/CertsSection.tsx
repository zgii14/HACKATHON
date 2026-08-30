"use client";

import { EmptyState, Reveal, SecTitle, Spotlight } from "@/components/dashboard/ui";
import type { CertItem } from "@/hooks/useCvForm";
import { Trash2 } from "lucide-react";

type Props = {
    certifications: CertItem[];
    setCertifications: React.Dispatch<React.SetStateAction<CertItem[]>>;
};

export function CertsSection({ certifications, setCertifications }: Props) {
    const addCertificate = () => {
        setCertifications((prev) => [...prev, { id: crypto.randomUUID(), value: "" }]);
    };

    const handleChange = (id: string, val: string) => {
        setCertifications((prev) => prev.map((c) => (c.id === id ? { ...c, value: val } : c)));
    };

    const removeCertificate = (id: string) => {
        setCertifications((prev) => prev.filter((c) => c.id !== id));
    };

    return (
        <Reveal delay={0.68} className="pt-8">
            <section>
                <SecTitle
                    title="8. Sertifikat Penghargaan"
                    meta={
                        <button
                            type="button"
                            onClick={addCertificate}
                            className="rounded-md border border-border px-3 py-1.5 text-[12.5px] font-semibold hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            + Tambah Sertifikat
                        </button>
                    }
                />
                <div className="divide-y divide-border/60">
                    {certifications.map((cert) => (
                        <Spotlight key={cert.id} className="rounded-md">
                            <div className="flex items-center gap-2 border-b border-border/60 py-3 last:border-b-0">
                                <input
                                    value={cert.value}
                                    onChange={(e) => handleChange(cert.id, e.target.value)}
                                    className="flex-1 rounded-md border border-border bg-background px-3.5 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                    placeholder="Contoh: Introduction to Git and GitHub (Dicoding) - 2024"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeCertificate(cert.id)}
                                    className="text-muted-foreground transition-colors hover:text-rose-500"
                                    aria-label="Hapus sertifikat"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </Spotlight>
                    ))}
                    {certifications.length === 0 && (
                        <EmptyState title="Belum ada sertifikat">Tambah sertifikat pertama — klik &quot;Tambah&quot; di atas.</EmptyState>
                    )}
                </div>
            </section>
        </Reveal>
    );
}
