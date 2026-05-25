"use client";

import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowUpRight,
    Briefcase,
    Building2,
    ChevronDown,
    Clock,
    Globe,
    GraduationCap,
    MapPin,
    Search,
    Sparkles,
    Wallet,
    Wifi,
    X,
} from "lucide-react";
import Link from "next/link";
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

/* ── Score bar (horizontal thin bar) ── */
function ScoreBar({ score }: { score: number | null }) {
    if (score == null) return null;
    const pct = Math.round(score * 100);
    const color = pct >= 60 ? "from-emerald-400 to-green-500" : pct >= 30 ? "from-amber-400 to-orange-500" : "from-rose-400 to-red-500";
    const textColor = pct >= 60 ? "text-emerald-400" : pct >= 30 ? "text-amber-400" : "text-rose-400";
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-[11px] font-bold tabular-nums ${textColor}`}>{pct}%</span>
        </div>
    );
}

/* ── Company avatar with gradient ── */
function Avatar({ name }: { name: string }) {
    const g = [
        "from-violet-500 to-fuchsia-500", "from-blue-500 to-cyan-400",
        "from-emerald-500 to-teal-400", "from-orange-500 to-amber-400",
        "from-pink-500 to-rose-400", "from-indigo-500 to-violet-400",
        "from-teal-500 to-green-400", "from-red-500 to-orange-400",
    ];
    return (
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${g[name.charCodeAt(0) % g.length]} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

/* ── Filter chip ── */
function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                active
                    ? "bg-primary/[0.1] border-primary/30 text-primary"
                    : "border-black/[0.08] dark:border-white/[0.06] text-muted-foreground hover:border-white/[0.12] hover:text-foreground"
            }`}
        >
            {children}
        </button>
    );
}

/* ── Job card (grid cell) ── */
function JobCell({ job }: { job: Job }) {
    return (
        <Link href={`/dashboard/jobs/${job.id}`} prefetch={false} className="block group">
            <div className="h-full rounded-2xl border glass-border glass p-4 transition-all duration-300 glass-border-hover glass-hover hover:shadow-2xl hover:shadow-black/10 hover:-translate-y-1 flex flex-col">

                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                    <Avatar name={job.company} />
                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                            {job.title}
                        </h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{job.company}</p>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>

                {/* Location + remote */}
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3 flex-wrap">
                    {job.location && (
                        <span className="flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />{job.location}
                        </span>
                    )}
                    {job.is_remote && (
                        <span className="flex items-center gap-0.5 text-emerald-400">
                            <Wifi className="w-2.5 h-2.5" />Remote
                        </span>
                    )}
                    {job.work_type && (
                        <span className="flex items-center gap-0.5 text-blue-400">
                            <Briefcase className="w-2.5 h-2.5" />{job.work_type}
                        </span>
                    )}
                </div>

                {/* Metadata row */}
                {(job.salary || job.min_experience) && (
                    <div className="flex gap-2 mb-3 flex-wrap">
                        {job.salary && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/[0.08] border border-emerald-500/15 text-emerald-400 font-medium flex items-center gap-1">
                                <Wallet className="w-2.5 h-2.5" />{job.salary}
                            </span>
                        )}
                        {job.min_experience && (
                            <span className="text-[10px] px-2 py-0.5 rounded-md glass-lg border glass-border text-muted-foreground flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />{job.min_experience}
                            </span>
                        )}
                    </div>
                )}

                {/* Skills */}
                <div className="flex flex-wrap gap-1 mb-3">
                    {job.required_skills.slice(0, 4).map((s) => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md glass-lg border glass-border text-muted-foreground">
                            {s}
                        </span>
                    ))}
                    {job.required_skills.length > 4 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/[0.06] text-primary/70 font-medium">
                            +{job.required_skills.length - 4}
                        </span>
                    )}
                </div>

                {/* Score bar — pushed to bottom */}
                <div className="mt-auto pt-2 border-t border-black/[0.06] dark:border-white/[0.04]">
                    <ScoreBar score={job.match_score} />
                </div>
            </div>
        </Link>
    );
}

/* ── Featured hero card (top match) ── */
function FeaturedCard({ job }: { job: Job }) {
    const pct = job.match_score != null ? Math.round(job.match_score * 100) : null;
    return (
        <Link href={`/dashboard/jobs/${job.id}`} prefetch={false} className="block group">
            <div className="relative rounded-2xl border glass-border glass overflow-hidden transition-all duration-300 hover:border-white/[0.12] hover:shadow-2xl hover:shadow-black/10 hover:-translate-y-1">
                {/* Gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500" />
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/[0.06] to-transparent rounded-bl-full" />

                <div className="relative p-5">
                    <div className="flex items-center gap-1.5 text-[10px] text-primary font-medium uppercase tracking-wider mb-3">
                        <Sparkles className="w-3 h-3" /> Best match for you
                    </div>

                    <div className="flex items-start gap-4">
                        <Avatar name={job.company} />
                        <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-base leading-snug group-hover:text-primary transition-colors">{job.title}</h3>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                                <span>{job.company}</span>
                                {job.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{job.location}</span>}
                                {job.is_remote && <span className="flex items-center gap-0.5 text-emerald-400"><Wifi className="w-3 h-3" />Remote</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{job.description}</p>

                            {/* Meta + skills */}
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {job.salary && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/[0.08] border border-emerald-500/15 text-emerald-400 font-medium flex items-center gap-1">
                                        <Wallet className="w-2.5 h-2.5" />{job.salary}
                                    </span>
                                )}
                                {job.required_skills.slice(0, 5).map((s) => (
                                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-md glass-lg border glass-border text-muted-foreground">{s}</span>
                                ))}
                            </div>
                        </div>

                        {/* Big score */}
                        {pct != null && (
                            <div className="shrink-0 text-right">
                                <p className={`text-3xl font-bold tabular-nums ${pct >= 60 ? "text-emerald-400" : "text-amber-400"}`}>{pct}%</p>
                                <p className="text-[10px] text-muted-foreground">match</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}

/* ── Main Page ── */
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

    const filtered = useMemo(() => {
        let r = jobs;
        if (locFilter === "remote") r = r.filter((j) => j.is_remote);
        if (locFilter === "onsite") r = r.filter((j) => !j.is_remote);
        if (scoreFilter === "high") r = r.filter((j) => (j.match_score ?? 0) >= 0.6);
        if (scoreFilter === "mid") r = r.filter((j) => (j.match_score ?? 0) >= 0.3);
        if (q.trim()) {
            const s = q.toLowerCase();
            r = r.filter((j) => j.title.toLowerCase().includes(s) || j.company.toLowerCase().includes(s) || j.required_skills.some((sk) => sk.toLowerCase().includes(s)));
        }
        return r;
    }, [jobs, q, locFilter, scoreFilter]);

    const filterKey = `${q}|${locFilter}|${scoreFilter}`;
    const [lastKey, setLastKey] = useState(filterKey);
    if (filterKey !== lastKey) { setLastKey(filterKey); setDisplayCount(PAGE_SIZE); }

    const topMatch = filtered.length > 0 && !q.trim() && locFilter === "all" && scoreFilter === "all" ? filtered[0] : null;
    const gridJobs = topMatch ? filtered.slice(1, displayCount + 1) : filtered.slice(0, displayCount);
    const totalAfterFeatured = topMatch ? filtered.length - 1 : filtered.length;
    const hasMore = gridJobs.length < totalAfterFeatured;
    const remaining = totalAfterFeatured - gridJobs.length;

    const hasActiveFilter = locFilter !== "all" || scoreFilter !== "all";

    return (
        <div className="space-y-5 max-w-[880px]">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Lowongan</h1>
                <p className="text-xs text-muted-foreground mt-1">{jobs.length} posisi tersedia</p>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Cari judul, perusahaan, atau skill…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    className="pl-10 h-11 rounded-xl glass-md border-black/[0.1] dark:border-white/[0.08] focus:border-primary/40 text-sm"
                />
                {q && (
                    <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Inline filter chips */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-muted-foreground mr-1">Filter:</span>
                <Chip active={locFilter === "all"} onClick={() => setLocFilter("all")}><Globe className="w-3 h-3" /> Semua</Chip>
                <Chip active={locFilter === "remote"} onClick={() => setLocFilter("remote")}><Wifi className="w-3 h-3" /> Remote</Chip>
                <Chip active={locFilter === "onsite"} onClick={() => setLocFilter("onsite")}><Building2 className="w-3 h-3" /> On-site</Chip>

                <span className="w-px h-4 bg-white/[0.08] mx-1" />

                <Chip active={scoreFilter === "all"} onClick={() => setScoreFilter("all")}>Semua skor</Chip>
                <Chip active={scoreFilter === "high"} onClick={() => setScoreFilter("high")}>≥60%</Chip>
                <Chip active={scoreFilter === "mid"} onClick={() => setScoreFilter("mid")}>≥30%</Chip>

                {hasActiveFilter && (
                    <button onClick={() => { setLocFilter("all"); setScoreFilter("all"); }} className="text-[11px] text-muted-foreground hover:text-foreground ml-1 underline underline-offset-2">
                        Reset
                    </button>
                )}
            </div>

            {/* Count */}
            {!isLoading && filtered.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">{filtered.length}</span> lowongan ditemukan{q ? ` untuk "${q}"` : ""}
                </p>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="grid md:grid-cols-2 gap-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-[200px] rounded-2xl border glass-border glass animate-pulse" />
                    ))}
                </div>
            )}

            {/* Content */}
            {!isLoading && (
                <>
                    {/* Empty */}
                    {filtered.length === 0 && (
                        <div className="text-center py-20">
                            <div className="w-14 h-14 rounded-2xl glass-lg border border-black/[0.1] dark:border-white/[0.08] mx-auto flex items-center justify-center mb-4">
                                <Search className="w-6 h-6 text-muted-foreground/30" />
                            </div>
                            <p className="font-medium text-sm">Tidak ada hasil</p>
                            <p className="text-xs text-muted-foreground mt-1">Coba ubah pencarian atau filter</p>
                        </div>
                    )}

                    {/* Featured top match */}
                    {topMatch && <FeaturedCard job={topMatch} />}

                    {/* Grid */}
                    {gridJobs.length > 0 && (
                        <div className="grid md:grid-cols-2 gap-3">
                            {gridJobs.map((job) => (
                                <JobCell key={job.id} job={job} />
                            ))}
                        </div>
                    )}

                    {/* Load more */}
                    {hasMore && (
                        <div className="flex justify-center pt-2">
                            <button
                                onClick={() => setDisplayCount((c) => c + PAGE_SIZE)}
                                className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-black/[0.1] dark:border-white/[0.08] glass hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:border-white/[0.12] text-sm text-muted-foreground hover:text-foreground transition-all"
                            >
                                Muat {Math.min(PAGE_SIZE, remaining)} lagi
                                <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
