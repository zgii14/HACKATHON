"use client";

// Hallmark · genre: modern-minimal · macrostructure: Workbench (app-surface) · theme: GitHire violet (locked)
// Joblet-style: 2-col card grid (1-col mobile), top match difiturkan dengan border/background violet.

import { CountUp, EmptyState, JobCard, PageHeader, Reveal } from "@/components/dashboard/ui";
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
    salary: string | null;
    min_experience: string | null;
    work_type: string | null;
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
                <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-56 animate-pulse rounded-lg border border-border bg-muted/30" />
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

    return (
        <div className="w-full">
            <PageHeader
                crumb="dasbor / rekomendasi"
                title="Rekomendasi lowongan"
                sub="Diurutkan dari match score tertinggi. Klik kartu untuk detail lengkap."
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

            <Reveal delay={0.1} className="mt-6">
                <div className="flex items-baseline justify-between border-b border-border pb-2.5">
                    <h2 className="text-[15px] font-bold tracking-tight">
                        <strong className="text-primary">{jobs.length}</strong> rekomendasi cocok untukmu
                    </h2>
                    <span className="font-mono text-[11px] text-muted-foreground">diurutkan by match</span>
                </div>
                <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {jobs.map((job, i) => (
                        <JobCard key={job.id} job={job} rank={i + 1} index={i} featured={i === 0} />
                    ))}
                </ul>
            </Reveal>
        </div>
    );
}
