"use client";

import { PageHeader, Reveal, CountUp } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Users, ClipboardList, ArrowRight } from "lucide-react";
import Link from "next/link";

type BillingStatus = {
    is_premium: boolean;
    jobs: { used: number; limit: number; remaining: number };
    screening: { used: number; limit: number | null; remaining: number | null };
    chat: { used: number; limit: number; remaining: number };
};

type RecruiterJob = {
    id: string;
    title: string;
    company: string;
    applicant_count: number;
};

export default function RecruiterDashboardPage() {
    const { withAuth, authReady } = useApi();

    const { data: billing } = useQuery<BillingStatus>({
        queryKey: ["billing-status"],
        queryFn: () => withAuth("/recruiter/billing/status"),
        enabled: authReady,
    });

    const { data: jobs = [] } = useQuery<RecruiterJob[]>({
        queryKey: ["my-jobs"],
        queryFn: () => withAuth("/recruiter/jobs/my-jobs"),
        enabled: authReady,
    });

    // Hitung pelamar masuk total dan perlu review (applied)
    const totalPelamar = jobs.reduce((acc, j) => acc + (j.applicant_count || 0), 0);

    // Untuk perlu review, kita pakai totalPelamar sebagai proxy (detail per status butuh fetch per job)
    // Simpel: tampilkan total pelamar, user klik Review untuk detail
    const perluReview = totalPelamar; // nanti bisa filter applied di detail

    return (
        <div className="w-full space-y-6">
            <PageHeader crumb="dasbor / perusahaan" title="Dashboard Perusahaan" sub="Ringkasan lowongan & pelamar. Paket menentukan batas lowongan." />

            {/* 3 kolom ringkas — tanpa screening/chat */}
            <div className="grid gap-4 md:grid-cols-3">
                <Reveal delay={0.06}>
                    <div className="rounded-xl border border-border bg-card p-5">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Briefcase className="size-4 text-violet-600" /> Lowongan total
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-3xl font-bold tracking-tight">
                                <CountUp value={billing?.jobs.used ?? jobs.length} />
                            </span>
                            <span className="font-mono text-xs text-muted-foreground">/ {billing?.jobs.limit ?? 2}</span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                            {billing?.is_premium ? "Premium · 10 slot" : "Free · 2 slot"} · {billing?.jobs.remaining ?? 0} sisa
                        </p>
                        <Link href="/dashboard/recruiter/jobs/new" className="mt-4 inline-flex text-xs font-medium text-violet-600 hover:underline">
                            Buat lowongan <ArrowRight className="ml-1 size-3.5" />
                        </Link>
                    </div>
                </Reveal>
                <Reveal delay={0.12}>
                    <div className="rounded-xl border border-border bg-card p-5">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <Users className="size-4 text-violet-600" /> Pelamar masuk
                        </div>
                        <div className="mt-3 text-3xl font-bold tracking-tight">
                            <CountUp value={totalPelamar} />
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">Total dari {jobs.length} lowongan</p>
                        <Link href="/dashboard/recruiter/jobs" className="mt-4 inline-flex text-xs font-medium text-violet-600 hover:underline">
                            Lihat lowongan <ArrowRight className="ml-1 size-3.5" />
                        </Link>
                    </div>
                </Reveal>
                <Reveal delay={0.18}>
                    <div className="rounded-xl border border-border bg-card p-5">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <ClipboardList className="size-4 text-amber-600" /> Perlu review
                        </div>
                        <div className="mt-3 text-3xl font-bold tracking-tight">
                            <CountUp value={perluReview} />
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">Buka detail lowongan untuk review</p>
                        <Link href="/dashboard/recruiter/candidates" className="mt-4 inline-flex text-xs font-medium text-amber-600 hover:underline">
                            Cari kandidat <ArrowRight className="ml-1 size-3.5" />
                        </Link>
                    </div>
                </Reveal>
            </div>

            {/* Lowongan terbaru */}
            <Reveal delay={0.24}>
                <div className="rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border px-5 py-3">
                        <h3 className="text-sm font-semibold">Lowongan terbaru</h3>
                        <Link href="/dashboard/recruiter/jobs" className="text-xs font-medium text-violet-600 hover:underline">
                            Lihat semua
                        </Link>
                    </div>
                    <div className="divide-y divide-border/50">
                        {jobs.slice(0, 5).map((j) => (
                            <Link key={j.id} href={`/dashboard/recruiter/jobs/${j.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{j.title}</p>
                                    <p className="truncate text-xs text-muted-foreground">{j.company}</p>
                                </div>
                                <span className="ml-3 shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                                    {j.applicant_count} pelamar
                                </span>
                            </Link>
                        ))}
                        {jobs.length === 0 && <p className="px-5 py-8 text-center text-xs text-muted-foreground">Belum ada lowongan. Buat yang pertama.</p>}
                    </div>
                </div>
            </Reveal>
        </div>
    );
}
