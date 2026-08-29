"use client";

import { PageHeader, Reveal, CountUp } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ShieldCheck, Users, Clock, Crown, Briefcase } from "lucide-react";

type Stats = {
    pending: number;
    approved: number;
    total: number;
    premium: number;
    total_jobs: number;
};

export default function AdminDashboardPage() {
    const { withAuth, authReady } = useApi();
    const { data: profile } = useQuery({
        queryKey: ["profile"],
        queryFn: () => withAuth<{ is_admin?: boolean } | null>("/me/profile"),
        enabled: authReady,
    });
    const isAdmin = !!profile?.is_admin;

    const { data: stats, isLoading } = useQuery<Stats>({
        queryKey: ["admin-stats"],
        queryFn: () => withAuth("/admin/stats"),
        enabled: authReady && isAdmin,
    });

    const { data: reqs } = useQuery<any[]>({
        queryKey: ["admin-recruiter-requests"],
        queryFn: () => withAuth("/admin/recruiter-requests?status=pending"),
        enabled: authReady && isAdmin,
    });

    if (!authReady) return <div className="p-8 font-mono text-sm text-muted-foreground">Memuat...</div>;
    if (!isAdmin) {
        return (
            <div className="w-full max-w-2xl">
                <PageHeader crumb="dasbor / admin" title="Akses ditolak" sub="Hanya admin.githire@gmail.com" />
                <div className="mt-6 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm">Kamu bukan admin.</div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            <PageHeader crumb="dasbor / admin" title="Dashboard Admin" sub="Kelola permohonan recruiter, lihat recruiter & lowongan." />

            <div className="grid gap-4 md:grid-cols-4">
                <Reveal delay={0.06}>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                        <div className="flex items-center gap-2 text-xs font-medium text-amber-600"><Clock className="size-4" /> Pending</div>
                        <div className="mt-2 text-2xl font-bold"><CountUp value={stats?.pending ?? 0} /></div>
                        <p className="font-mono text-[11px] text-muted-foreground">Menunggu review</p>
                    </div>
                </Reveal>
                <Reveal delay={0.1}>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                        <div className="flex items-center gap-2 text-xs font-medium text-emerald-600"><ShieldCheck className="size-4" /> Approved</div>
                        <div className="mt-2 text-2xl font-bold"><CountUp value={stats?.approved ?? 0} /></div>
                        <p className="font-mono text-[11px] text-muted-foreground">Recruiter aktif</p>
                    </div>
                </Reveal>
                <Reveal delay={0.14}>
                    <div className="rounded-xl border border-border bg-card p-5">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Users className="size-4" /> Total permohonan</div>
                        <div className="mt-2 text-2xl font-bold"><CountUp value={stats?.total ?? 0} /></div>
                        <p className="font-mono text-[11px] text-muted-foreground">Semua status</p>
                    </div>
                </Reveal>
                <Reveal delay={0.18}>
                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
                        <div className="flex items-center gap-2 text-xs font-medium text-violet-600"><Crown className="size-4" /> Premium / Jobs</div>
                        <div className="mt-2 text-2xl font-bold"><CountUp value={stats?.premium ?? 0} /> <span className="text-sm font-normal text-muted-foreground">/ {stats?.total_jobs ?? 0}</span></div>
                        <p className="font-mono text-[11px] text-muted-foreground">Premium & lowongan</p>
                    </div>
                </Reveal>
            </div>

            <Reveal delay={0.22}>
                <div className="rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border px-5 py-3">
                        <h3 className="flex items-center gap-2 text-sm font-semibold"><Briefcase className="size-4" /> Permohonan terbaru (pending)</h3>
                        <Link href="/dashboard/admin/recruiter-requests" className="text-xs font-medium text-violet-600 hover:underline">Lihat semua</Link>
                    </div>
                    <div className="divide-y divide-border/50">
                        {isLoading && <p className="p-5 font-mono text-xs text-muted-foreground">Memuat...</p>}
                        {reqs?.slice(0, 5).map((r: any) => (
                            <Link key={r.id} href={`/dashboard/admin/recruiter-requests/${r.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{r.company_name} <span className="text-xs text-muted-foreground">· {r.industry}</span></p>
                                    <p className="truncate font-mono text-xs text-muted-foreground">{r.user_email} · {r.company_size}</p>
                                </div>
                                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600">pending</span>
                            </Link>
                        ))}
                        {reqs?.length === 0 && <p className="p-5 text-center text-xs text-muted-foreground">Tidak ada pending.</p>}
                    </div>
                </div>
            </Reveal>

            <Reveal delay={0.26}>
                <div className="flex gap-3">
                    <Link href="/dashboard/admin/recruiter-requests" className="rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700">Kelola permohonan</Link>
                    <Link href="/dashboard/admin/recruiters" className="rounded-full border border-border px-4 py-2 text-xs font-bold hover:bg-muted">Lihat recruiter</Link>
                </div>
            </Reveal>
        </div>
    );
}
