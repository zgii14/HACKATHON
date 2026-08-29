"use client";

import { PageHeader, Reveal } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

type Req = {
    id: string;
    user_id: string;
    company_name: string;
    company_website: string;
    industry: string;
    company_size: string;
    wa_pic: string;
    status: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
    user_email: string | null;
};

export default function AdminRecruitersPage() {
    const { withAuth, authReady } = useApi();
    const { data: profile } = useQuery({
        queryKey: ["profile"],
        queryFn: () => withAuth<{ is_admin?: boolean } | null>("/me/profile"),
        enabled: authReady,
    });
    const isAdmin = !!profile?.is_admin;
    const { data: reqs, isLoading } = useQuery<Req[]>({
        queryKey: ["admin-recruiters"],
        queryFn: () => withAuth("/admin/recruiters"),
        enabled: authReady && isAdmin,
    });

    if (!authReady) return <div className="p-8 font-mono text-sm text-muted-foreground">Memuat...</div>;
    if (!isAdmin) {
        return (
            <div className="w-full max-w-2xl">
                <PageHeader crumb="dasbor / admin" title="Akses ditolak" sub="Hanya admin" />
                <div className="mt-6 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm">Kamu bukan admin.</div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-3xl">
            <PageHeader crumb="dasbor / admin / recruiter" title="Daftar Recruiter" sub="Semua recruiter yang sudah approved. Klik untuk lihat detail." />
            <Reveal delay={0.06} className="pt-6">
                {isLoading && <p className="font-mono text-sm text-muted-foreground">Memuat...</p>}
                {reqs?.length === 0 && <div className="rounded-md border border-border p-8 text-center text-sm text-muted-foreground">Belum ada recruiter.</div>}
                <div className="space-y-3">
                    {reqs?.map((r) => (
                        <Link key={r.id} href={`/dashboard/admin/recruiter-requests/${r.id}`} className="block rounded-lg border border-border p-4 hover:bg-muted/30">
                            <div className="flex items-center justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold">{r.company_name} <span className="font-normal text-muted-foreground">· {r.industry}</span></p>
                                    <p className="mt-1 font-mono text-xs text-muted-foreground">{r.user_email} · {r.company_website} · {r.company_size} · {r.wa_pic}</p>
                                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">Approved by {r.reviewed_by} · {r.reviewed_at ? new Date(r.reviewed_at).toLocaleString("id-ID") : "-"}</p>
                                </div>
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600">approved</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </Reveal>
        </div>
    );
}
