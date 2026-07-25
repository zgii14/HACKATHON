"use client";

// Hallmark · genre: modern-minimal · macrostructure: Workbench (app-surface) · theme: GitHire violet (locked)

import { JobListRow, PageHeader, Reveal } from "@/components/dashboard/ui";
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

function FilterBtn({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-[12.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                active
                    ? "border-primary/50 bg-primary/[0.08] text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
            }`}
        >
            {children}
        </button>
    );
}

export default function JobsPage() {
    const { withAuth, authReady } = useApi();
    const [q, setQ] = useState("");
    const [locFilter, setLocFilter] = useState<"all" | "remote" | "onsite">("all");
    const [scoreFilter, setScoreFilter] = useState<"all" | "high" | "mid">("all");
    const [displayCount, setDisplayCount] = useState(15);
    const PAGE_SIZE = 15;

    const { data: jobs = [], isLoading } = useQuery({
        queryKey: ["jobs", "browse"],
        queryFn: () => withAuth<Job[]>("/jobs?include_match=true"),
        enabled: authReady,
        staleTime: 10 * 60 * 1000,
    });

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
                sub="Semua posisi tersedia dengan match score terhadap profilmu. Klik baris untuk deskripsi lengkap."
                right={<div className="font-mono text-[12px] text-muted-foreground"><span className="text-foreground">{jobs.length}</span> posisi</div>}
            />

            {/* Toolbar filter */}
            <Reveal delay={0.05}>
                <div className="flex flex-wrap items-center gap-2.5 pt-5" role="search">
                    <input
                        type="search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Cari judul, perusahaan, atau skill…"
                        aria-label="Cari lowongan"
                        className="min-w-[220px] max-w-[340px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-[13px] transition-colors placeholder:text-muted-foreground hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                    />
                    <FilterBtn active={locFilter === "all"} onClick={() => setLocFilter("all")}>Semua</FilterBtn>
                    <FilterBtn active={locFilter === "remote"} onClick={() => setLocFilter("remote")}>Remote</FilterBtn>
                    <FilterBtn active={locFilter === "onsite"} onClick={() => setLocFilter("onsite")}>On-site</FilterBtn>
                    <span className="h-5 w-px bg-border" aria-hidden="true" />
                    <FilterBtn active={scoreFilter === "high"} onClick={() => setScoreFilter(scoreFilter === "high" ? "all" : "high")}>≥ 60%</FilterBtn>
                    <FilterBtn active={scoreFilter === "mid"} onClick={() => setScoreFilter(scoreFilter === "mid" ? "all" : "mid")}>≥ 30%</FilterBtn>
                    {hasActiveFilter && (
                        <button
                            type="button"
                            onClick={() => { setLocFilter("all"); setScoreFilter("all"); }}
                            className="text-[12px] font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            Reset
                        </button>
                    )}
                    <span className="ml-auto font-mono text-[11.5px] text-muted-foreground">{filtered.length} hasil</span>
                </div>
            </Reveal>

            {isLoading ? (
                <div className="mt-5 space-y-2 border-t border-border pt-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-12 animate-pulse rounded bg-muted/30" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="mt-5 border-y border-border py-14 text-center">
                    <p className="text-[15px] font-bold">Tidak ada hasil</p>
                    <p className="mt-1.5 text-[13.5px] text-muted-foreground">Coba ubah kata kunci atau reset filter.</p>
                </div>
            ) : (
                <Reveal delay={0.1} className="mt-5">
                    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] gap-4 pb-2">
                        <span className="w-6 font-mono text-[10.5px] font-medium uppercase tracking-[0.07em] text-muted-foreground">#</span>
                        <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.07em] text-muted-foreground">Posisi</span>
                        <span className="text-right font-mono text-[10.5px] font-medium uppercase tracking-[0.07em] text-muted-foreground">Match</span>
                        <span className="w-4" aria-hidden="true" />
                    </div>
                    <ul>
                        {visible.map((job, i) => (
                            <JobListRow key={job.id} job={job} rank={i + 1} index={i} />
                        ))}
                    </ul>
                    {hasMore && (
                        <div className="pt-4">
                            <button
                                type="button"
                                onClick={() => setDisplayCount((c) => c + PAGE_SIZE)}
                                className="w-full rounded-md border border-border py-2.5 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
