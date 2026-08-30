"use client";

import { PageHeader, Reveal } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast, Bounce } from "react-toastify";

export default function RecruiterSettingsPage() {
    const { withAuth, authReady } = useApi();
    const qc = useQueryClient();
    const [name, setName] = useState("");

    const { data: req } = useQuery<any>({
        queryKey: ["recruiter-request"],
        queryFn: () => withAuth("/me/recruiter-request"),
        enabled: authReady,
    });

    useEffect(() => {
        if (req?.company_name) setName(req.company_name);
    }, [req?.company_name]);

    const mut = useMutation({
        mutationFn: () => withAuth("/me/recruiter-profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ company_name: name }) }),
        onSuccess: () => {
            toast.success("Nama perusahaan diperbarui — chat akan tampil nama baru", { transition: Bounce });
            qc.invalidateQueries({ queryKey: ["recruiter-request"] });
            qc.invalidateQueries({ queryKey: ["chat-conversations"] });
            qc.invalidateQueries({ queryKey: ["admin-recruiters"] });
        },
        onError: (e: any) => toast.error(e.message || "Gagal update"),
    });

    return (
        <div className="w-full max-w-2xl space-y-6">
            <PageHeader crumb="dasbor / perusahaan / pengaturan" title="Pengaturan Perusahaan" sub="Ubah nama perusahaan yang tampil di chat. Lowongan lama tetap nama lama." />
            <Reveal delay={0.06} className="rounded-xl border border-border bg-card p-5">
                <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Nama perusahaan *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="PT Maju Jaya" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30" />
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">Min 3 karakter. Tampil di daftar chat kandidat.</p>
                <div className="mt-4 flex gap-2">
                    <button onClick={() => mut.mutate()} disabled={mut.isPending || name.trim().length < 3} className="rounded-full bg-violet-600 px-5 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-40">
                        {mut.isPending ? "Menyimpan..." : "Simpan"}
                    </button>
                </div>
                {req && (
                    <div className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">
                        <p>Website: {req.company_website} · {req.industry} · {req.company_size}</p>
                        <p>WA PIC: {req.wa_pic} · Status: {req.status}</p>
                    </div>
                )}
            </Reveal>
        </div>
    );
}
