"use client";

// Hallmark · genre: modern-minimal · macrostructure: Workbench (app-surface) · theme: GitHire violet (locked)

import { useApi } from "@/hooks/use-api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Loader2, Search, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";

type Role = "candidate" | "recruiter";

const OPTIONS: {
    role: Role;
    title: string;
    tag: string;
    desc: string;
    icon: typeof UserRound;
    href: string;
}[] = [
    {
        role: "candidate",
        title: "Saya Kandidat",
        tag: "CANDIDATE",
        desc: "Cari lowongan, cocokkan skill dari GitHub & CV, bikin roadmap, dan lamar pekerjaan.",
        icon: UserRound,
        href: "/dashboard",
    },
    {
        role: "recruiter",
        title: "Saya Recruiter",
        tag: "RECRUITER",
        desc: "Terbitkan lowongan, cari kandidat, dan screening pelamar otomatis dengan AI.",
        icon: Briefcase,
        href: "/dashboard/recruiter/jobs",
    },
];

export default function SelectRolePage() {
    const { withAuth } = useApi();
    const router = useRouter();
    const qc = useQueryClient();
    const [pending, setPending] = useState<Role | null>(null);

    const setRole = useMutation({
        mutationFn: (role: Role) =>
            withAuth("/me/role", { method: "POST", body: JSON.stringify({ role }) }),
        onSuccess: async (_data, role) => {
            await qc.invalidateQueries({ queryKey: ["profile"] });
            const dest = OPTIONS.find((o) => o.role === role)!.href;
            router.replace(dest);
        },
        onError: (err: unknown) => {
            setPending(null);
            toast.error((err as Error).message || "Gagal menyimpan pilihan. Coba lagi.");
        },
    });

    return (
        <div className="mx-auto w-full max-w-3xl py-6">
            <span className="font-mono text-[11px] uppercase tracking-[0.09em] text-primary">
                langkah awal
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Pilih peranmu di GitHire</h1>
            <p className="mt-1.5 max-w-prose text-[14px] text-muted-foreground">
                Pilihan ini menentukan tampilan dan fitur yang kamu akses. Kamu bisa mengubahnya nanti lewat pengaturan akun.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const busy = pending === opt.role;
                    const disabled = pending != null;
                    return (
                        <button
                            key={opt.role}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                                setPending(opt.role);
                                setRole.mutate(opt.role);
                            }}
                            className="group relative flex flex-col rounded-lg border border-border p-5 text-left transition-all duration-200 hover:border-primary/50 hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-transparent"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex size-10 items-center justify-center rounded-md border border-border bg-muted/30 text-primary transition-colors group-hover:border-primary/40">
                                    {busy ? <Loader2 className="size-5 animate-spin" /> : <Icon className="size-5" />}
                                </div>
                                <span className="font-mono text-[10px] uppercase tracking-[0.09em] text-muted-foreground">
                                    {opt.tag}
                                </span>
                            </div>
                            <h2 className="mt-4 text-[16px] font-bold tracking-tight">{opt.title}</h2>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{opt.desc}</p>
                            <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-[11.5px] font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                                {opt.role === "recruiter" ? <Search className="size-3.5" /> : null}
                                pilih ini →
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
