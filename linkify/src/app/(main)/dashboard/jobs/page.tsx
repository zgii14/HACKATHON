"use client";

// Hallmark · genre: modern-minimal · macrostructure: Workbench (app-surface) · theme: GitHire violet (locked)
// Joblet-style: search pill + filter chips + 2-col card grid (1-col mobile)

import { EmptyState, JobCard, PageHeader, Reveal } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

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
    min_education: string | null;
    min_experience: string | null;
    work_type: string | null;
};

function FilterChip({
    active,
    count,
    onClick,
    children,
}: {
    active: boolean;
    count?: number;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
            }`}
        >
            {children}
            {count != null && (
                <span
                    className={`rounded-full px-1.5 py-px font-mono text-[10.5px] tabular-nums ${
                        active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                >
                    {count}
                </span>
            )}
        </button>
    );
}

export default function JobsPage() {
    const { withAuth, authReady } = useApi();
    const [q, setQ] = useState("");
    const [locFilter, setLocFilter] = useState<"all" | "remote" | "onsite">("all");
    const [scoreFilter, setScoreFilter] = useState<"all" | "high" | "mid">("all");
    const [displayCount, setDisplayCount] = useState(12);
    const PAGE_SIZE = 12;

    const { data: jobs = [], isLoading } = useQuery({
        queryKey: ["jobs", "browse"],
        queryFn: () => withAuth<Job[]>("/jobs?include_match=true"),
        enabled: authReady,
        staleTime: 10 * 60 * 1000,
    });

    const remoteCount = useMemo(() => jobs.filter((j) => j.is_remote).length, [jobs]);
    const onsiteCount = jobs.length - remoteCount;
    const highCount = jobs.filter((j) => (j.match_score ?? 0) >= 0.6).length;
    const midCount = jobs.filter((j) => (j.match_score ?? 0) >= 0.3).length;

    const filtered = useMemo(() => {
        let r = jobs;
        if (locFilter === "remote") r = r.filter((j) => j.is_remote);
        if (locFilter === "onsite") r = r.filter((j) => !j.is_remote);
        if (scoreFilter === "high") r = r.filter((j) => (j.match_score ?? 0) >= 0.6);
        if (scoreFilter === "mid") r = r.filter((j) => (j.match_score ?? 0) >= 0.3);
        if (q.trim()) {
            const s = q.toLowerCase();
            r = r.filter(
                (j) =>
                    j.title.toLowerCase().includes(s) ||
                    j.company.toLowerCase().includes(s) ||
                    j.required_skills.some((sk) => sk.toLowerCase().includes(s))
            );
        }
        return r;
    }, [jobs, q, locFilter, scoreFilter]);

    const filterKey = `${q}|${locFilter}|${scoreFilter}`;
    const [lastKey, setLastKey] = useState(filterKey);
    if (filterKey !== lastKey) {
        setLastKey(filterKey);
        setDisplayCount(PAGE_SIZE);
    }

    const visible = filtered.slice(0, displayCount);
    const hasMore = visible.length < filtered.length;
    const remaining = filtered.length - visible.length;
    const hasActiveFilter = locFilter !== "all" || scoreFilter !== "all";

    return (
        <div className="w-full">
            <PageHeader
                crumb="dasbor / lowongan"
                title="Browse lowongan"
                sub="Semua posisi tersedia dengan match score terhadap profilmu. Klik kartu untuk detail."
                right={<div className="font-mono text-[12px] text-muted-foreground"><span className="text-foreground">{jobs.length}</span> posisi</div>}
            />

            {/* Toolbar: search pill (1 baris) + filter chips (1 baris) — Joblet-style */}
            <Reveal delay={0.05}>
                <div className="space-y-2.5 pt-5" role="search">
                    <div className="relative w-full max-w-xl">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                        <input
                            type="search"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Cari judul, perusahaan, atau skill…"
                            aria-label="Cari lowongan"
                            className="h-12 w-full rounded-full border border-border bg-background pl-10 pr-4 text-[13.5px] transition-colors placeholder:text-muted-foreground hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <FilterChip active={locFilter === "all"} onClick={() => setLocFilter("all")} count={jobs.length}>Semua</FilterChip>
                        <FilterChip active={locFilter === "remote"} onClick={() => setLocFilter(locFilter === "remote" ? "all" : "remote")} count={remoteCount}>Remote</FilterChip>
                        <FilterChip active={locFilter === "onsite"} onClick={() => setLocFilter(locFilter === "onsite" ? "all" : "onsite")} count={onsiteCount}>On-site</FilterChip>
                        <FilterChip active={scoreFilter === "high"} onClick={() => setScoreFilter(scoreFilter === "high" ? "all" : "high")} count={highCount}>≥ 60%</FilterChip>
                        <FilterChip active={scoreFilter === "mid"} onClick={() => setScoreFilter(scoreFilter === "mid" ? "all" : "mid")} count={midCount}>≥ 30%</FilterChip>
                        {hasActiveFilter && (
                            <button
                                type="button"
                                onClick={() => { setLocFilter("all"); setScoreFilter("all"); }}
                                className="text-[12px] font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            </Reveal>

            {isLoading ? (
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-56 animate-pulse rounded-lg border border-border bg-muted/30" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="mt-6 border-y border-border py-14 text-center">
                    <p className="text-[15px] font-bold">Tidak ada hasil</p>
                    <p className="mt-1.5 text-[13.5px] text-muted-foreground">Coba ubah kata kunci atau reset filter.</p>
                </div>
            ) : (
                <Reveal delay={0.1} className="mt-6">
                    <div className="flex items-baseline justify-between border-b border-border pb-2.5">
                        <h2 className="text-[15px] font-bold tracking-tight">
                            <strong className="text-primary">{filtered.length}</strong> lowongan tersedia
                        </h2>
                        <span className="font-mono text-[11px] text-muted-foreground">{filtered.length} hasil</span>
                    </div>
                    <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {visible.map((job, i) => (
                            <JobCard key={job.id} job={job} rank={i + 1} index={i} />
                        ))}
                    </ul>
                    {hasMore && (
                        <div className="pt-4">
                            <button
                                type="button"
                                onClick={() => setDisplayCount((c) => c + PAGE_SIZE)}
                                className="w-full rounded-full border border-border py-2.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                Muat {Math.min(PAGE_SIZE, remaining)} lagi ↓
                            </button>
                        </div>
                    )}
                </Reveal>
            )}
        </div>
    );
}
