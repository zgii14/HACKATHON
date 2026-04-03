"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, MapPin, Medal, Wifi } from "lucide-react";
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

function CompanyAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
    const colors = [
        "bg-violet-500", "bg-blue-500", "bg-emerald-500",
        "bg-orange-500", "bg-pink-500", "bg-cyan-500",
        "bg-indigo-500", "bg-teal-500",
    ];
    const color = colors[name.charCodeAt(0) % colors.length];
    const sz = size === "lg" ? "w-14 h-14 text-xl rounded-2xl" : size === "sm" ? "w-8 h-8 text-xs rounded-lg" : "w-10 h-10 text-sm rounded-xl";
    return (
        <div className={`${sz} ${color} flex items-center justify-center text-white font-bold shrink-0`}>
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

function RankMedal({ rank }: { rank: number }) {
    if (rank === 1) return <span className="text-2xl">🥇</span>;
    if (rank === 2) return <span className="text-2xl">🥈</span>;
    if (rank === 3) return <span className="text-2xl">🥉</span>;
    return (
        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
            {rank}
        </div>
    );
}

function ScoreRing({ score }: { score: number }) {
    const pct = Math.round(score * 100);
    const color = pct >= 60 ? "#22c55e" : pct >= 30 ? "#f59e0b" : "#ef4444";
    const r = 22;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;

    return (
        <div className="relative w-14 h-14 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
                <circle
                    cx="28" cy="28" r={r} fill="none"
                    stroke={color} strokeWidth="4"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: "stroke-dashoffset 0.8s ease" }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
            </div>
        </div>
    );
}

function TopJobCard({ job, rank }: { job: Job; rank: number }) {
    const pct = job.match_score != null ? Math.round(job.match_score * 100) : 0;
    const isTop3 = rank <= 3;

    return (
        <Link href={`/dashboard/jobs/${job.id}`}>
            <div className={`group relative p-5 rounded-2xl border transition-all duration-200 hover:shadow-lg
                ${isTop3
                    ? "bg-gradient-to-br from-card to-muted/20 border-primary/20 hover:border-primary/40"
                    : "bg-card hover:bg-muted/30 hover:border-muted-foreground/20"
                }`}
            >
                <div className="flex items-start gap-4">
                    {/* Rank */}
                    <div className="flex flex-col items-center gap-2 pt-1">
                        <RankMedal rank={rank} />
                    </div>

                    {/* Company + info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                            <CompanyAvatar name={job.company} size={isTop3 ? "md" : "sm"} />
                            <div className="min-w-0 flex-1">
                                <h3 className={`font-semibold leading-tight group-hover:text-primary transition-colors ${isTop3 ? "text-base" : "text-sm"}`}>
                                    {job.title}
                                </h3>
                                <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                                    <span className="text-xs text-muted-foreground">{job.company}</span>
                                    {job.location && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                            <MapPin className="w-2.5 h-2.5" />{job.location}
                                        </span>
                                    )}
                                    {job.is_remote && (
                                        <span className="text-xs text-emerald-500 flex items-center gap-0.5">
                                            <Wifi className="w-2.5 h-2.5" />Remote
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Description (only top 3) */}
                        {isTop3 && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                                {job.description}
                            </p>
                        )}

                        {/* Skills */}
                        <div className="flex flex-wrap gap-1 mt-2">
                            {job.required_skills.slice(0, isTop3 ? 6 : 4).map((s) => (
                                <span key={s} className="text-[11px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                                    {s}
                                </span>
                            ))}
                            {job.required_skills.length > (isTop3 ? 6 : 4) && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
                                    +{job.required_skills.length - (isTop3 ? 6 : 4)}
                                </span>
                            )}
                        </div>

                        {/* Action buttons for top 3 */}
                        {isTop3 && (
                            <div className="flex gap-2 mt-3">
                                <Button size="sm" variant="outline" className="text-xs h-7" asChild>
                                    <Link href={`/dashboard/roadmap?job_id=${job.id}`} onClick={(e) => e.stopPropagation()}>
                                        <BookOpen className="w-3 h-3 mr-1" />
                                        Buat Roadmap
                                    </Link>
                                </Button>
                                <Button size="sm" className="text-xs h-7" asChild>
                                    <Link href={`/dashboard/jobs/${job.id}`} onClick={(e) => e.stopPropagation()}>
                                        Detail <ArrowRight className="w-3 h-3 ml-1" />
                                    </Link>
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Score ring */}
                    {job.match_score != null && (
                        <ScoreRing score={job.match_score} />
                    )}
                </div>
            </div>
        </Link>
    );
}

export default function RecommendedJobsPage() {
    const { withAuth, isLoaded, isSignedIn } = useApi();

    const { data: jobs = [], isLoading } = useQuery({
        queryKey: ["jobs", "recommended"],
        queryFn: () => withAuth<Job[]>("/jobs/recommended"),
        enabled: isLoaded && isSignedIn,
        staleTime: 5 * 60 * 1000, // 5 menit
    });

    if (isLoading) {
        return (
            <div className="space-y-3 max-w-3xl">
                <div className="h-6 w-48 bg-muted rounded animate-pulse" />
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-32 rounded-2xl border bg-muted/30 animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
                ))}
            </div>
        );
    }

    if (jobs.length === 0) {
        return (
            <div className="max-w-md py-12 text-center space-y-3">
                <p className="text-5xl">🎯</p>
                <h2 className="font-semibold text-lg">Belum ada rekomendasi</h2>
                <p className="text-sm text-muted-foreground">
                    Selesaikan onboarding terlebih dahulu agar kami bisa mencocokkan skill kamu dengan lowongan yang ada.
                </p>
                <Button asChild>
                    <Link href="/dashboard/onboarding">Mulai Onboarding</Link>
                </Button>
            </div>
        );
    }

    const topJobs = jobs.slice(0, 3);
    const restJobs = jobs.slice(3);
    const avgScore = jobs.slice(0, 5).reduce((s, j) => s + (j.match_score ?? 0), 0) / Math.min(5, jobs.length);

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Medal className="w-6 h-6 text-amber-500" />
                        Rekomendasi Untukmu
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {jobs.length} lowongan diurutkan berdasarkan kecocokan skill · Avg match top-5:{" "}
                        <span className="font-medium text-foreground">{Math.round(avgScore * 100)}%</span>
                    </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/jobs">Browse Semua</Link>
                </Button>
            </div>

            {/* Top 3 podium */}
            <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🏆 Top Match</p>
                {topJobs.map((job, i) => (
                    <TopJobCard key={job.id} job={job} rank={i + 1} />
                ))}
            </div>

            {/* Rest of jobs */}
            {restJobs.length > 0 && (
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lowongan Lainnya</p>
                    {restJobs.map((job, i) => (
                        <TopJobCard key={job.id} job={job} rank={i + 4} />
                    ))}
                </div>
            )}
        </div>
    );
}
