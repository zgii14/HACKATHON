"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowRight,
    BookOpen,
    Briefcase,
    Building2,
    CheckCircle2,
    Circle,
    Clock,
    GraduationCap,
    Globe,
    MapPin,
    Search,
    SlidersHorizontal,
    TrendingUp,
    Wallet,
    Wifi,
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

function getScoreStyle(score: number | null) {
    if (score == null) return { bar: "bg-muted", text: "text-muted-foreground", label: "—" };
    const pct = Math.round(score * 100);
    if (pct >= 60) return { bar: "bg-green-500", text: "text-green-500", label: `${pct}%` };
    if (pct >= 30) return { bar: "bg-amber-500", text: "text-amber-500", label: `${pct}%` };
    return { bar: "bg-rose-500", text: "text-rose-400", label: `${pct}%` };
}

function CompanyAvatar({ name }: { name: string }) {
    const colors = [
        "bg-violet-500", "bg-blue-500", "bg-emerald-500",
        "bg-orange-500", "bg-pink-500", "bg-cyan-500",
        "bg-indigo-500", "bg-teal-500",
    ];
    const color = colors[name.charCodeAt(0) % colors.length];
    return (
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

function JobCard({ job }: { job: Job }) {
    const score = getScoreStyle(job.match_score);
    const pct = job.match_score != null ? Math.round(job.match_score * 100) : null;

    return (
        <Link href={`/dashboard/jobs/${job.id}`}>
            <div className="group relative flex gap-4 p-4 rounded-xl border bg-card hover:bg-muted/30 hover:border-primary/30 hover:shadow-md transition-all duration-200">
                {/* Left score bar */}
                <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${score.bar} opacity-70`} />

                <div className="pl-2 flex gap-3 w-full min-w-0">
                    {/* Company avatar */}
                    <CompanyAvatar name={job.company} />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <h3 className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
                                    {job.title}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center flex-wrap gap-x-2 gap-y-0.5">
                                    <span>{job.company}</span>
                                    {job.location && (
                                        <span className="flex items-center gap-0.5">
                                            <MapPin className="w-2.5 h-2.5" />{job.location}
                                        </span>
                                    )}
                                    {job.is_remote && (
                                        <span className="flex items-center gap-0.5 text-emerald-500">
                                            <Wifi className="w-2.5 h-2.5" />Remote
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5">
                                {pct != null && (
                                    <span className={`text-xs font-bold ${score.text}`}>{pct}%</span>
                                )}
                                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                            </div>
                        </div>

                        {/* Description snippet */}
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
                            {job.description}
                        </p>

                        {/* Info baris: gaji, pengalaman, pendidikan */}
                        {(job.salary || job.min_experience || job.min_education || job.work_type) && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                                {job.salary && (
                                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                                        <Wallet className="w-3 h-3" />{job.salary}
                                    </span>
                                )}
                                {job.min_experience && (
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <Clock className="w-3 h-3" />{job.min_experience}
                                    </span>
                                )}
                                {job.min_education && (
                                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                        <GraduationCap className="w-3 h-3" />{job.min_education}
                                    </span>
                                )}
                                {job.work_type && (
                                    <span className="flex items-center gap-1 text-[11px] text-blue-500">
                                        <Briefcase className="w-3 h-3" />{job.work_type}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Skills */}
                        <div className="flex flex-wrap gap-1 mt-2">
                            {job.required_skills.slice(0, 6).map((s) => (
                                <span key={s} className="text-[11px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
                                    {s}
                                </span>
                            ))}
                            {job.required_skills.length > 6 && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                                    +{job.required_skills.length - 6}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
}

const LOCATION_FILTERS = [
    { key: "Semua",   label: "Semua",   icon: Globe },
    { key: "Remote",  label: "Remote",  icon: Wifi },
    { key: "On-site", label: "On-site", icon: Building2 },
] as const;
type Filter = typeof LOCATION_FILTERS[number]["key"];

const SCORE_FILTERS = [
    { key: "Semua",  label: "Semua",  icon: TrendingUp },
    { key: "High",   label: "≥60%",  icon: CheckCircle2 },
    { key: "Medium", label: "≥30%",  icon: Circle },
] as const;
type ScoreFilter = typeof SCORE_FILTERS[number]["key"];

export default function JobsPage() {
    const { withAuth, isLoaded, isSignedIn } = useApi();
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState<Filter>("Semua");
    const [scoreFilter, setScoreFilter] = useState<ScoreFilter>("Semua");
    const [filterOpen, setFilterOpen] = useState(false);
    const [displayCount, setDisplayCount] = useState(12);
    const PAGE_SIZE = 12;

    const { data: jobs = [], isLoading } = useQuery({
        queryKey: ["jobs", "browse"],
        queryFn: () => withAuth<Job[]>("/jobs?include_match=true"),
        enabled: isLoaded && isSignedIn,
        staleTime: 10 * 60 * 1000, // 10 menit — job data jarang berubah
    });

    const filtered = useMemo(() => {
        let result = jobs;
        if (filter === "Remote") result = result.filter((j) => j.is_remote);
        if (filter === "On-site") result = result.filter((j) => !j.is_remote);
        if (scoreFilter === "High") result = result.filter((j) => (j.match_score ?? 0) >= 0.6);
        if (scoreFilter === "Medium") result = result.filter((j) => (j.match_score ?? 0) >= 0.3);
        if (q.trim()) {
            const s = q.toLowerCase();
            result = result.filter(
                (j) =>
                    j.title.toLowerCase().includes(s) ||
                    j.company.toLowerCase().includes(s) ||
                    j.required_skills.some((sk) => sk.toLowerCase().includes(s))
            );
        }
        return result;
    }, [jobs, q, filter, scoreFilter]);

    // Reset displayCount setiap kali filter/search berubah
    const filterKey = `${q}|${filter}|${scoreFilter}`;
    const [lastFilterKey, setLastFilterKey] = useState(filterKey);
    if (filterKey !== lastFilterKey) {
        setLastFilterKey(filterKey);
        setDisplayCount(PAGE_SIZE);
    }

    const visible = filtered.slice(0, displayCount);
    const hasMore = displayCount < filtered.length;
    const remaining = filtered.length - displayCount;

    const remoteCount = jobs.filter((j) => j.is_remote).length;
    const onsiteCount = jobs.filter((j) => !j.is_remote).length;
    const hasActiveFilter = filter !== "Semua" || scoreFilter !== "Semua";

    return (
        <div className="space-y-5 max-w-3xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Browse Lowongan</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {jobs.length} lowongan tersedia · Match score dihitung dari profil skillmu
                </p>
            </div>

            {/* Search + filter icon */}
            <div className="flex gap-2 items-center">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari judul, perusahaan, atau skill…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Single filter button with dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setFilterOpen((v) => !v)}
                        className={`relative flex items-center justify-center w-10 h-10 rounded-lg border transition-all ${
                            hasActiveFilter
                                ? "border-primary/60 bg-primary/10 text-primary"
                                : "border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                        title="Filter"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        {hasActiveFilter && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />
                        )}
                    </button>

                    {/* Dropdown panel */}
                    {filterOpen && (
                        <>
                            {/* Backdrop */}
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setFilterOpen(false)}
                            />
                            <div className="absolute right-0 top-12 z-20 w-60 rounded-xl border bg-card shadow-lg p-3 space-y-3">
                                {/* Lokasi */}
                                <div>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Lokasi</p>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {LOCATION_FILTERS.map(({ key, label, icon: Icon }) => {
                                            const count = key === "Semua" ? jobs.length : key === "Remote" ? remoteCount : onsiteCount;
                                            return (
                                                <button
                                                    key={key}
                                                    onClick={() => { setFilter(key as Filter); }}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                                        filter === key
                                                            ? "bg-primary/10 border-primary/40 text-primary"
                                                            : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                                                    }`}
                                                >
                                                    <Icon className="w-3 h-3" />
                                                    {label}
                                                    <span className="text-[10px] opacity-50">{count}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="border-t" />

                                {/* Match score */}
                                <div>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Match Score</p>
                                    <div className="flex gap-1.5 flex-wrap">
                                        {SCORE_FILTERS.map(({ key, label, icon: Icon }) => (
                                            <button
                                                key={key}
                                                onClick={() => { setScoreFilter(key as ScoreFilter); }}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                                    scoreFilter === key
                                                        ? key === "High"   ? "bg-green-500/10 border-green-500/40 text-green-500"
                                                        : key === "Medium" ? "bg-amber-500/10 border-amber-500/40 text-amber-600"
                                                        : "bg-primary/10 border-primary/40 text-primary"
                                                        : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                                                }`}
                                            >
                                                <Icon className="w-3 h-3" />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Reset */}
                                {hasActiveFilter && (
                                    <button
                                        onClick={() => { setFilter("Semua"); setScoreFilter("Semua"); }}
                                        className="w-full text-xs text-muted-foreground hover:text-foreground text-center pt-1 border-t"
                                    >
                                        Reset filter
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Result info */}
            {!isLoading && (
                <p className="text-xs text-muted-foreground">
                    {filtered.length > 0 ? (
                        <>
                            Menampilkan{" "}
                            <span className="font-medium text-foreground">
                                {Math.min(displayCount, filtered.length)}
                            </span>
                            {" "}dari{" "}
                            <span className="font-medium text-foreground">{filtered.length}</span>
                            {" "}lowongan{q ? ` untuk "${q}"` : ""}
                        </>
                    ) : q ? (
                        <>0 hasil untuk &quot;{q}&quot;</>
                    ) : null}
                </p>
            )}

            {/* Loading skeleton */}
            {isLoading && (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-28 rounded-xl border bg-muted/30 animate-pulse" />
                    ))}
                </div>
            )}

            {/* Job list */}
            {!isLoading && (
                <div className="space-y-2">
                    {filtered.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">Tidak ada lowongan yang cocok</p>
                            <p className="text-sm mt-1">Coba ubah kata kunci atau filter</p>
                        </div>
                    )}
                    {visible.map((job) => (
                        <JobCard key={job.id} job={job} />
                    ))}
                </div>
            )}

            {/* Load More */}
            {!isLoading && hasMore && (
                <div className="flex flex-col items-center gap-2 pt-2">
                    <button
                        onClick={() => setDisplayCount((c) => c + PAGE_SIZE)}
                        className="group flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border bg-muted/40 hover:bg-muted hover:border-primary/30 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200"
                    >
                        <span>Tampilkan {Math.min(PAGE_SIZE, remaining)} lowongan lagi</span>
                        <span className="text-xs text-muted-foreground/60">({remaining} tersisa)</span>
                    </button>
                    <p className="text-xs text-muted-foreground/50">
                        {Math.min(displayCount, filtered.length)} dari {filtered.length} ditampilkan
                    </p>
                </div>
            )}
        </div>
    );
}
