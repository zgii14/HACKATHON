"use client";

// Hallmark · genre: modern-minimal · macrostructure: Workbench (app-surface) · theme: GitHire violet (locked)

import { ActionLink, BarFill, CountUp, EmptyState, JobListRow, PageHeader, Reveal, Spotlight } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

type Job = {
    id: string;
    title: string;
    company: string;
    description: string;
    required_skills: string[];
    location: string | null;
    is_remote: boolean;
    match_score: number | null;
};

export default function RecommendedJobsPage() {
    const { withAuth, authReady } = useApi();

    const { data: jobs = [], isLoading } = useQuery({
        queryKey: ["jobs", "recommended"],
        queryFn: () => withAuth<Job[]>("/jobs/recommended"),
        enabled: authReady,
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="w-full space-y-4">
                <div className="h-6 w-48 animate-pulse rounded bg-muted/50" />
                <div className="space-y-2 border-t border-border pt-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-12 animate-pulse rounded bg-muted/30" />
                    ))}
                </div>
            </div>
        );
    }

    if (jobs.length === 0) {
        return (
            <div className="w-full">
                <PageHeader crumb="dasbor / rekomendasi" title="Rekomendasi lowongan" />
                <div className="pt-8">
                    <EmptyState title="Belum ada rekomendasi">
                        Selesaikan{" "}
                        <Link href="/dashboard/onboarding" className="font-semibold text-primary hover:underline">
                            onboarding
                        </Link>{" "}
                        agar kami bisa mencocokkan skill-mu dengan lowongan.
                    </EmptyState>
                </div>
            </div>
        );
    }

    const avgScore = jobs.slice(0, 5).reduce((s, j) => s + (j.match_score ?? 0), 0) / Math.min(5, jobs.length);
    const [top, ...rest] = jobs;
    const topPct = top.match_score == null ? null : Math.round(top.match_score * 100);

    return (
        <div className="w-full">
            <PageHeader
                crumb="dasbor / rekomendasi"
                title="Rekomendasi lowongan"
                sub="Diurutkan dari match score tertinggi. Klik baris untuk lihat deskripsi lengkap."
                right={
                    <div className="flex flex-col items-start gap-1 md:items-end">
                        <div className="flex items-baseline gap-2">
                            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">rata-rata top-5</span>
                            <CountUp value={Math.round(avgScore * 100)} className="font-mono text-[24px] font-semibold tabular-nums tracking-tight" />
                            <span className="font-mono text-xs text-muted-foreground">%</span>
                        </div>
                        <Link
                            href="/dashboard/jobs"
                            className="font-mono text-[11.5px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            browse semua lowongan →
                        </Link>
                    </div>
                }
            />

            {/* ── Top pick: satu-satunya blok yang menonjol, jadi jangkar mata ── */}
            <Reveal delay={0.07}>
                <Spotlight className="mt-6 overflow-hidden rounded-lg border border-border border-l-2 border-l-primary bg-primary/[0.035] p-5 md:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.09em] text-primary">
                                Top match · pilihan teratas
                            </span>
                            <h2 className="mt-2 truncate text-[19px] font-bold leading-tight tracking-tight">{top.title}</h2>
                            <p className="mt-1 truncate text-[13px] text-muted-foreground">
                                {top.company}
                                {top.location ? ` · ${top.location}` : ""}
                                {top.is_remote ? " · remote" : ""}
                            </p>
                        </div>
                        {topPct != null && (
                            <div className="shrink-0 text-right">
                                <div className="flex items-baseline justify-end gap-0.5">
                                    <CountUp value={topPct} className="font-mono text-[30px] font-semibold leading-none tabular-nums tracking-tight" />
                                    <span className="font-mono text-sm text-muted-foreground">%</span>
                                </div>
                                <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">match</span>
                            </div>
                        )}
                    </div>

                    {topPct != null && <BarFill pct={topPct} className="mt-4 w-full" />}

                    {top.description && (
                        <p className="mt-4 max-w-prose text-[13px] leading-relaxed text-muted-foreground line-clamp-2">{top.description}</p>
                    )}

                    {top.required_skills.length > 0 && (
                        <p className="mt-3 text-xs leading-relaxed">
                            <span className="font-mono uppercase tracking-[0.06em] text-muted-foreground">skill · </span>
                            {top.required_skills.slice(0, 8).map((skill, i) => (
                                <span key={skill}>
                                    {i > 0 && <span className="mx-1.5 text-border">·</span>}
                                    <span className="font-medium text-foreground">{skill}</span>
                                </span>
                            ))}
                        </p>
                    )}

                    <div className="mt-5 flex flex-wrap items-center gap-4">
                        <ActionLink href={`/dashboard/jobs/${top.id}`}>
                            Lihat detail
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
                                <path d="M5 12h14M13 5l7 7-7 7" />
                            </svg>
                        </ActionLink>
                        <Link
                            href={`/dashboard/roadmap?job_id=${top.id}`}
                            prefetch={false}
                            className="text-[12.5px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            Buat roadmap
                        </Link>
                    </div>
                </Spotlight>
            </Reveal>

            {/* ── Sisanya: list ringkas, mulai dari peringkat 2 ── */}
            {rest.length > 0 && (
                <Reveal delay={0.13}>
                    <div className="mt-9 flex items-baseline justify-between border-b border-border pb-2.5">
                        <h3 className="text-[13px] font-bold tracking-tight">Rekomendasi lainnya</h3>
                        <span className="font-mono text-[11px] text-muted-foreground">{rest.length} lowongan</span>
                    </div>
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] gap-4 pb-2 pt-4">
                        <span className="w-6 font-mono text-[10.5px] font-medium uppercase tracking-[0.07em] text-muted-foreground">#</span>
                        <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.07em] text-muted-foreground">Posisi</span>
                        <span className="text-right font-mono text-[10.5px] font-medium uppercase tracking-[0.07em] text-muted-foreground">Match</span>
                        <span className="w-4" aria-hidden="true" />
                    </div>
                    <ul>
                        {rest.map((job, i) => (
                            <JobListRow key={job.id} job={job} rank={i + 2} index={i} />
                        ))}
                    </ul>
                    <p className="pt-3 font-mono text-[11.5px] text-muted-foreground">{jobs.length} lowongan cocok dengan profilmu</p>
                </Reveal>
            )}
        </div>
    );
}
