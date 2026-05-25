"use client";

import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowRight,
    ArrowUpRight,
    BookOpen,
    Briefcase,
    ChevronRight,
    MapPin,
    Sparkles,
    Target,
    Wifi,
} from "lucide-react";
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

/* ── Score Ring ── */
function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
    const pct = Math.round(score * 100);
    const r = (size - 6) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    const color = pct >= 60 ? "#22c55e" : pct >= 30 ? "#f59e0b" : "#ef4444";
    return (
        <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-black/[0.06] dark:text-white/[0.06]" />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-700" />
            </svg>
            <span className="absolute text-xs font-bold" style={{ color }}>{pct}%</span>
        </div>
    );
}

/* ── Company Avatar ── */
function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
    const g = [
        "from-violet-500 to-fuchsia-500", "from-blue-500 to-cyan-400",
        "from-emerald-500 to-teal-400", "from-orange-500 to-amber-400",
        "from-pink-500 to-rose-400", "from-indigo-500 to-violet-400",
        "from-teal-500 to-green-400", "from-red-500 to-orange-400",
    ];
    const sz = size === "sm" ? "w-9 h-9 text-xs rounded-lg" : "w-11 h-11 text-sm rounded-xl";
    return (
        <div className={`${sz} bg-gradient-to-br ${g[name.charCodeAt(0) % g.length]} flex items-center justify-center text-white font-bold shrink-0`}>
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

/* ── Rank badge ── */
function RankBadge({ rank }: { rank: number }) {
    const styles = rank === 1
        ? "from-amber-300 to-orange-500 text-white shadow-lg shadow-amber-500/25"
        : rank === 2
        ? "from-slate-300 to-slate-500 text-white"
        : rank === 3
        ? "from-amber-700 to-amber-900 text-amber-200"
        : "from-black/[0.04] to-black/[0.08] dark:from-white/[0.06] dark:to-white/[0.1] text-muted-foreground";
    return (
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${styles} flex items-center justify-center text-xs font-bold shrink-0`}>
            {rank}
        </div>
    );
}

/* ── Hero Card (Rank 1) ── */
function HeroCard({ job }: { job: Job }) {
    return (
        <Link href={`/dashboard/jobs/${job.id}`} prefetch={false} className="block group">
            <div className="relative rounded-2xl border glass-border glass overflow-hidden transition-all duration-300 hover:glass-border-hover hover:shadow-2xl hover:shadow-black/10 hover:-translate-y-1">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-amber-500/[0.06] to-transparent rounded-bl-full pointer-events-none" />

                <div className="relative p-6">
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-500 dark:text-amber-400 font-semibold uppercase tracking-wider mb-4">
                        <Sparkles className="w-3 h-3" /> Best match
                    </div>

                    <div className="flex items-start gap-4">
                        <Avatar name={job.company} />
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-bold leading-snug group-hover:text-primary transition-colors">{job.title}</h2>
                            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
                                <span className="font-medium">{job.company}</span>
                                {job.location && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{job.location}</span>}
                                {job.is_remote && <span className="flex items-center gap-0.5 text-emerald-500"><Wifi className="w-3 h-3" />Remote</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">{job.description}</p>

                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {job.required_skills.slice(0, 6).map((s) => (
                                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-md glass-md border glass-border text-muted-foreground">{s}</span>
                                ))}
                                {job.required_skills.length > 6 && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-primary/[0.06] text-primary/70 font-medium">+{job.required_skills.length - 6}</span>
                                )}
                            </div>

                            <div className="flex gap-2 mt-4">
                                <Button size="sm" variant="outline" className="text-xs h-8" asChild>
                                    <Link href={`/dashboard/roadmap?job_id=${job.id}`} prefetch={false} onClick={(e) => e.stopPropagation()}>
                                        <BookOpen className="w-3 h-3 mr-1.5" /> Buat Roadmap
                                    </Link>
                                </Button>
                                <Button size="sm" className="text-xs h-8" asChild>
                                    <Link href={`/dashboard/jobs/${job.id}`} prefetch={false} onClick={(e) => e.stopPropagation()}>
                                        Lihat Detail <ArrowRight className="w-3 h-3 ml-1.5" />
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        {job.match_score != null && <ScoreRing score={job.match_score} size={56} />}
                    </div>
                </div>
            </div>
        </Link>
    );
}

/* ── Grid Card (Rank 2-3) ── */
function PodiumCard({ job, rank }: { job: Job; rank: number }) {
    return (
        <Link href={`/dashboard/jobs/${job.id}`} prefetch={false} className="block group">
            <div className="h-full rounded-2xl border glass-border glass p-4 transition-all duration-300 hover:glass-border-hover hover:shadow-xl hover:shadow-black/10 hover:-translate-y-0.5 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                    <RankBadge rank={rank} />
                    <Avatar name={job.company} size="sm" />
                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">{job.title}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                            <span>{job.company}</span>
                            {job.is_remote && <span className="text-emerald-500 flex items-center gap-0.5"><Wifi className="w-2.5 h-2.5" />Remote</span>}
                        </div>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                </div>

                <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-3">{job.description}</p>

                <div className="flex flex-wrap gap-1 mb-3">
                    {job.required_skills.slice(0, 4).map((s) => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md glass-md border glass-border text-muted-foreground">{s}</span>
                    ))}
                </div>

                {job.match_score != null && (
                    <div className="mt-auto pt-3 border-t glass-divider flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Match</span>
                        <ScoreRing score={job.match_score} size={36} />
                    </div>
                )}
            </div>
        </Link>
    );
}

/* ── List Card (Rank 4+) ── */
function ListCard({ job, rank }: { job: Job; rank: number }) {
    const pct = job.match_score != null ? Math.round(job.match_score * 100) : null;
    const barColor = pct != null ? (pct >= 60 ? "from-emerald-400 to-green-500" : pct >= 30 ? "from-amber-400 to-orange-500" : "from-rose-400 to-red-500") : "";
    const textColor = pct != null ? (pct >= 60 ? "text-emerald-500" : pct >= 30 ? "text-amber-500" : "text-rose-500") : "";

    return (
        <Link href={`/dashboard/jobs/${job.id}`} prefetch={false} className="block group">
            <div className="flex items-center gap-3 p-3 rounded-xl border glass-border glass transition-all duration-200 hover:glass-border-hover hover:shadow-md hover:-translate-y-0.5">
                <RankBadge rank={rank} />
                <Avatar name={job.company} size="sm" />
                <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">{job.title}</h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                        <span>{job.company}</span>
                        {job.location && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{job.location}</span>}
                        {job.is_remote && <span className="text-emerald-500 flex items-center gap-0.5"><Wifi className="w-2.5 h-2.5" />Remote</span>}
                    </div>
                </div>
                {pct != null && (
                    <div className="shrink-0 flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.06] overflow-hidden">
                            <div className={`h-full rounded-full bg-gradient-to-r ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-xs font-bold tabular-nums ${textColor}`}>{pct}%</span>
                    </div>
                )}
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors shrink-0" />
            </div>
        </Link>
    );
}

/* ── Main Page ── */
export default function RecommendedJobsPage() {
    const { withAuth, authReady } = useApi();

    const { data: jobs = [], isLoading } = useQuery({
        queryKey: ["jobs", "recommended"],
        queryFn: () => withAuth<Job[]>("/jobs/recommended"),
        enabled: authReady,
        staleTime: 5 * 60 * 1000,
    });

    // Loading
    if (isLoading) {
        return (
            <div className="space-y-4 max-w-[880px]">
                <div className="h-7 w-52 glass-md rounded-lg animate-pulse" />
                <div className="h-[200px] rounded-2xl border glass-border glass animate-pulse" />
                <div className="grid md:grid-cols-2 gap-3">
                    {[1, 2].map((i) => <div key={i} className="h-[220px] rounded-2xl border glass-border glass animate-pulse" />)}
                </div>
            </div>
        );
    }

    // Empty
    if (jobs.length === 0) {
        return (
            <div className="max-w-md mx-auto py-16 text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl glass-lg border glass-border mx-auto flex items-center justify-center">
                    <Target className="w-7 h-7 text-muted-foreground/60" />
                </div>
                <div className="space-y-1.5">
                    <h2 className="font-semibold text-lg">Belum ada rekomendasi</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Selesaikan onboarding agar kami bisa mencocokkan skill-mu dengan lowongan.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/onboarding">Mulai Onboarding</Link>
                </Button>
            </div>
        );
    }

    const hero = jobs[0];
    const podium = jobs.slice(1, 3);
    const rest = jobs.slice(3);
    const avgScore = jobs.slice(0, 5).reduce((s, j) => s + (j.match_score ?? 0), 0) / Math.min(5, jobs.length);

    return (
        <div className="space-y-5 max-w-[880px]">

            {/* Header */}
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Rekomendasi</h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        {jobs.length} lowongan · Rata-rata match top-5: <span className="font-medium text-foreground">{Math.round(avgScore * 100)}%</span>
                    </p>
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0">
                    <Link href="/dashboard/jobs">
                        <Briefcase className="w-3.5 h-3.5 mr-1.5" /> Browse Semua
                    </Link>
                </Button>
            </div>

            {/* Hero — #1 */}
            <HeroCard job={hero} />

            {/* Podium — #2 & #3 */}
            {podium.length > 0 && (
                <div className="grid md:grid-cols-2 gap-3">
                    {podium.map((job, i) => (
                        <PodiumCard key={job.id} job={job} rank={i + 2} />
                    ))}
                </div>
            )}

            {/* Rest — #4+ */}
            {rest.length > 0 && (
                <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Lowongan Lainnya</p>
                    {rest.map((job, i) => (
                        <ListCard key={job.id} job={job} rank={i + 4} />
                    ))}
                </div>
            )}
        </div>
    );
}
