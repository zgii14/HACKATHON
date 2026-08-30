"use client";

import { EmptyState, Reveal, SecTitle, Spotlight } from "@/components/dashboard/ui";
import type { OrgItem } from "@/hooks/useCvForm";
import { Trash2 } from "lucide-react";

type Props = {
    orgExperience: OrgItem[];
    setOrgExperience: React.Dispatch<React.SetStateAction<OrgItem[]>>;
};

export function OrgSection({ orgExperience, setOrgExperience }: Props) {
    const addOrg = () => {
        setOrgExperience((prev) => [
            ...prev,
            {
                id: crypto.randomUUID(),
                organization: "",
                role: "",
                location: "",
                period: "",
                bullets: [{ id: crypto.randomUUID(), text: "" }],
            },
        ]);
    };

    const removeOrg = (id: string) => {
        setOrgExperience((prev) => prev.filter((o) => o.id !== id));
    };

    const updateField = (id: string, field: keyof Omit<OrgItem, "id" | "bullets">, value: string) => {
        setOrgExperience((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    };

    const handleBulletChange = (orgId: string, bulletId: string, val: string) => {
        setOrgExperience((prev) =>
            prev.map((o) =>
                o.id === orgId ? { ...o, bullets: o.bullets.map((b) => (b.id === bulletId ? { ...b, text: val } : b)) } : o
            )
        );
    };

    const addBullet = (orgId: string) => {
        setOrgExperience((prev) =>
            prev.map((o) => (o.id === orgId ? { ...o, bullets: [...o.bullets, { id: crypto.randomUUID(), text: "" }] } : o))
        );
    };

    const removeBullet = (orgId: string, bulletId: string) => {
        setOrgExperience((prev) =>
            prev.map((o) => (o.id === orgId ? { ...o, bullets: o.bullets.filter((b) => b.id !== bulletId) } : o))
        );
    };

    return (
        <Reveal delay={0.47} className="pt-8">
            <section>
                <SecTitle
                    title="5. Pengalaman Organisasi"
                    meta={
                        <button
                            type="button"
                            onClick={addOrg}
                            className="rounded-md border border-border px-3 py-1.5 text-[12.5px] font-semibold hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            + Tambah Organisasi
                        </button>
                    }
                />
                <div className="divide-y divide-border/60">
                    {orgExperience.map((org) => (
                        <Spotlight key={org.id} className="rounded-md">
                            <div className="relative space-y-3 border-b border-border/60 py-4 last:border-b-0">
                                <button
                                    type="button"
                                    onClick={() => removeOrg(org.id)}
                                    className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-rose-500"
                                    aria-label="Hapus organisasi"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>

                                <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Nama Organisasi
                                        </label>
                                        <input
                                            value={org.organization}
                                            onChange={(e) => updateField(org.id, "organization", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: MOSTANEER"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Lokasi
                                        </label>
                                        <input
                                            value={org.location}
                                            onChange={(e) => updateField(org.id, "location", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: Universitas Bengkulu"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Divisi / Peran
                                        </label>
                                        <input
                                            value={org.role}
                                            onChange={(e) => updateField(org.id, "role", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: Anggota Keuangan"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Periode (Tanggal)
                                        </label>
                                        <input
                                            value={org.period}
                                            onChange={(e) => updateField(org.id, "period", e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                            placeholder="Contoh: Jan 2023 - Des 2023"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between">
                                        <label className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                            Deskripsi Tugas / Kontribusi
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => addBullet(org.id)}
                                            className="rounded-md border border-border px-2 py-1 text-[11px] font-semibold hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            + Tambah poin
                                        </button>
                                    </div>

                                    {org.bullets.map((b) => (
                                        <div key={b.id} className="flex items-center gap-2">
                                            <input
                                                value={b.text}
                                                onChange={(e) => handleBulletChange(org.id, b.id, e.target.value)}
                                                className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                                placeholder="Tulis kontribusi..."
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeBullet(org.id, b.id)}
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
                    {orgExperience.length === 0 && (
                        <EmptyState title="Belum ada riwayat organisasi">Tambah organisasi pertama — klik &quot;Tambah&quot; di atas.</EmptyState>
                    )}
                </div>
            </section>
        </Reveal>
    );
}
