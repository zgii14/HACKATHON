"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowRight,
    Bookmark,
    BookOpen,
    Briefcase,
    CheckCircle2,
    Github,
    MapPin,
    Send,
    Target,
    TrendingUp,
    Wifi,
    Zap,
} from "lucide-react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────
type Profile = {
    github_username: string | null;
    merged_skills: string[] | null;
    updated_at: string | null;
} | null;

type Job = {
    id: string;
    title: string;
    company: string;
    location: string | null;
    is_remote: boolean;
    match_score: number | null;
    required_skills: string[];
};

type SkillGap = {
    missing_skills: string[];
    has_profile: boolean;
    user_skill_count: number;
    total_job_skills: number;
    weak_skills: string[];
    github_backed_count: number;
};

type BookmarkedJob = {
    job_id: string;
    title: string;
    company: string;
    location: string | null;
    is_remote: boolean;
    total_steps: number;
    completed_steps: number;
    match_score: number | null;
};

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatCard({
    icon,
    label,
    value,
    sub,
    color = "text-primary",
    href,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    sub?: string;
    color?: string;
    href?: string;
}) {
    const inner = (
        <Card className={href ? "hover:border-primary/40 transition-colors cursor-pointer" : ""}>
            <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className={`text-3xl font-bold ${color}`}>{value}</p>
                        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
                    </div>
                    <div className="p-2 rounded-lg bg-muted/60">{icon}</div>
                </div>
            </CardContent>
        </Card>
    );
    return href ? <Link href={href}>{inner}</Link> : inner;
}

function ScoreBadge({ score }: { score: number | null }) {
    if (score == null) return null;
    const pct = Math.round(score * 100);
    const cls =
        pct >= 60 ? "bg-green-500/15 text-green-500 border-green-500/30" :
        pct >= 30 ? "bg-amber-500/15 text-amber-500 border-amber-500/30" :
                   "bg-rose-500/15 text-rose-500 border-rose-500/30";
    return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
            {pct}%
        </span>
    );
}

function BookmarkProgressBar({
    done,
    total,
    compact = false,
}: {
    done: number;
    total: number;
    compact?: boolean;
}) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const gradient =
        pct === 100 ? "from-green-500 to-emerald-500" :
        pct >= 50   ? "from-violet-500 to-purple-500" :
                      "from-primary to-violet-500";
    return (
        <div className="space-y-1">
            {!compact && (
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{done}/{total} langkah</span>
                    <span className="font-medium">{pct}%</span>
                </div>
            )}
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                    className={`h-1.5 rounded-full bg-gradient-to-r ${gradient} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            {compact && (
                <p className="text-xs text-muted-foreground">{pct}% · {done}/{total} langkah</p>
            )}
        </div>
    );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function DashboardHomePage() {
    const { withAuth, isLoaded, isSignedIn } = useApi();
    const { user } = useUser();

    const { data: profile } = useQuery({
        queryKey: ["profile"],
        queryFn: () => withAuth<Profile | null>("/me/profile"),
        enabled: isLoaded && isSignedIn,
        staleTime: 10 * 60 * 1000, // 10 menit
        retry: (failureCount, error) => {
            if ((error as Error).message === "AUTH_NOT_READY") return false;
            return failureCount < 2;
        },
    });

    const { data: gap } = useQuery({
        queryKey: ["skill-gap"],
        queryFn: () => withAuth<SkillGap>("/me/skill-gap"),
        enabled: isLoaded && isSignedIn && !!profile?.merged_skills?.length,
        staleTime: 5 * 60 * 1000, // 5 menit
        retry: false,
    });

    const { data: recommended } = useQuery({
        queryKey: ["jobs", "recommended"],
        queryFn: () => withAuth<Job[]>("/jobs/recommended"),
        enabled: isLoaded && isSignedIn && !!profile?.merged_skills?.length,
        staleTime: 5 * 60 * 1000, // 5 menit
        retry: false,
    });

    const { data: bookmarks = [], isLoading: bookmarksLoading } = useQuery({
        queryKey: ["bookmarks"],
        queryFn: () => withAuth<BookmarkedJob[]>("/me/bookmarks"),
        enabled: isLoaded && isSignedIn && !!profile?.merged_skills?.length,
        retry: false,
    });

    const { data: applications = [] } = useQuery({
        queryKey: ["applications"],
        queryFn: () => withAuth<{ id: string; status: string }[]>("/applications"),
        enabled: isLoaded && isSignedIn && !!profile?.merged_skills?.length,
        staleTime: 60_000,
        retry: false,
    });

    const hasProfile = !!profile?.merged_skills?.length;
    const firstName = user?.firstName ?? user?.username ?? "kamu";
    const greeting =
        new Date().getHours() < 12 ? "Selamat pagi" :
        new Date().getHours() < 18 ? "Selamat siang" :
        "Selamat malam";

    // Stat derivations
    const skillCount = profile?.merged_skills?.length ?? 0;
    const githubBacked = gap?.github_backed_count ?? 0;
    const gapCount = gap?.missing_skills.length ?? 0;
    const weakCount = gap?.weak_skills?.length ?? 0;
    const top3Reco = (recommended ?? []).slice(0, 3);

    // Bookmark stats
    const activeBookmarks = bookmarks.length;
    const finishedBookmarks = bookmarks.filter(
        (b) => b.total_steps > 0 && b.completed_steps === b.total_steps
    ).length;

    // Overall roadmap progress across all bookmarks
    const totalAllSteps = bookmarks.reduce((s, b) => s + b.total_steps, 0);
    const doneAllSteps = bookmarks.reduce((s, b) => s + b.completed_steps, 0);
    const overallPct = totalAllSteps > 0 ? Math.round((doneAllSteps / totalAllSteps) * 100) : null;

    // Applications stats
    const appCount = applications.length;
    const interviewCount = applications.filter((a) => a.status === "interview").length;
    const offerCount = applications.filter((a) => a.status === "offer").length;

    return (
        <div className="space-y-8 max-w-4xl">

            {/* ── Greeting header ── */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">
                    {greeting}, {firstName}.
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    {hasProfile
                        ? `Profil tersinkron dari GitHub @${profile?.github_username ?? "—"}.`
                        : "Mulai dengan mensinkronkan profil GitHub dan CV-mu."
                    }
                </p>
            </div>

            {/* ── Onboarding banner ── */}
            {!hasProfile && (
                <Card className="border-primary/40 bg-primary/5">
                    <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-5 pb-5">
                        <div className="flex items-start gap-3">
                            <Zap className="w-8 h-8 text-primary shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold">Profil belum dilengkapi</p>
                                <p className="text-sm text-muted-foreground">
                                    Sync GitHub + CV untuk membuka job matching, skill gap, dan roadmap AI.
                                </p>
                            </div>
                        </div>
                        <Button asChild className="shrink-0">
                            <Link href="/dashboard/onboarding">
                                Mulai Onboarding <ArrowRight className="w-4 h-4 ml-1" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* ── Stat cards ── */}
            {hasProfile && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard
                        icon={<Zap className="w-4 h-4 text-primary" />}
                        label="Total skill"
                        value={skillCount}
                        sub={`${githubBacked} terbukti di GitHub`}
                        color="text-primary"
                    />
                    <StatCard
                        icon={<Target className="w-4 h-4 text-amber-500" />}
                        label="Skill gap"
                        value={gapCount}
                        sub={weakCount > 0 ? `+${weakCount} perlu diperdalam` : "perlu dipelajari"}
                        color="text-amber-500"
                        href="/dashboard/skill-gap"
                    />
                    <StatCard
                        icon={<Bookmark className="w-4 h-4 text-violet-500" />}
                        label="Job dikejar"
                        value={activeBookmarks}
                        sub={activeBookmarks > 0 ? `${finishedBookmarks} selesai` : "Belum ada target"}
                        color="text-violet-500"
                        href="/dashboard/my-roadmaps"
                    />
                    <StatCard
                        icon={<Send className="w-4 h-4 text-emerald-500" />}
                        label="Lamaranku"
                        value={appCount}
                        sub={
                            offerCount > 0
                                ? `${offerCount} offer diterima! 🎉`
                                : interviewCount > 0
                                ? `${interviewCount} sedang interview`
                                : appCount > 0
                                ? "Pantau statusnya"
                                : "Belum ada lamaran"
                        }
                        color={offerCount > 0 ? "text-emerald-500" : appCount > 0 ? "text-emerald-500" : "text-muted-foreground"}
                        href="/dashboard/applications"
                    />
                </div>
            )}

            {/* ── Bookmark section (fokus utama) ── */}
            {hasProfile && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Bookmark className="w-4 h-4 text-violet-500" />
                            Job yang Sedang Dikejar
                        </h2>
                        <Link
                            href="/dashboard/my-roadmaps"
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                            Lihat semua <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>

                    {bookmarksLoading ? (
                        <div className="space-y-2">
                            {[...Array(2)].map((_, i) => (
                                <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : bookmarks.length === 0 ? (
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
                                <Bookmark className="w-8 h-8 text-muted-foreground/40" />
                                <p className="font-medium text-sm">Belum ada job yang dikejar</p>
                                <p className="text-xs text-muted-foreground text-center max-w-xs">
                                    Buka detail job lalu klik "Buat Roadmap untuk Job Ini" untuk mulai tracking progress belajarmu.
                                </p>
                                <Button asChild size="sm" variant="outline">
                                    <Link href="/dashboard/jobs">Browse Lowongan</Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid md:grid-cols-2 gap-3">
                            {bookmarks.slice(0, 4).map((b) => {
                                const isDone = b.total_steps > 0 && b.completed_steps === b.total_steps;
                                return (
                                    <Link
                                        key={b.job_id}
                                        href={`/dashboard/roadmap?job_id=${b.job_id}`}
                                        className="group block"
                                    >
                                        <Card className={`hover:border-primary/40 transition-colors h-full ${isDone ? "border-green-500/30 bg-green-500/5" : ""}`}>
                                            <CardContent className="pt-4 pb-4 px-4 space-y-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium leading-snug truncate group-hover:text-primary transition-colors">
                                                            {b.title}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                            {b.company}
                                                            {b.location && (
                                                                <span className="flex items-center gap-0.5">
                                                                    <MapPin className="w-2.5 h-2.5" />{b.location}
                                                                </span>
                                                            )}
                                                            {b.is_remote && (
                                                                <span className="flex items-center gap-0.5 text-emerald-500">
                                                                    <Wifi className="w-2.5 h-2.5" />Remote
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                    <ScoreBadge score={b.match_score} />
                                                </div>
                                                <BookmarkProgressBar
                                                    done={b.completed_steps}
                                                    total={b.total_steps}
                                                    compact
                                                />
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── Main 2-col grid: Rekomendasi + Skill Gap ── */}
            {hasProfile && (
                <div className="grid md:grid-cols-5 gap-4">

                    {/* Rekomendasi job (col 3) */}
                    <Card className="md:col-span-3">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                                    <CardTitle className="text-base">Top Job Match</CardTitle>
                                </div>
                                <Link
                                    href="/dashboard/jobs/recommended"
                                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                >
                                    Lihat semua <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                            <CardDescription className="text-xs">3 lowongan paling cocok berdasarkan skillmu</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {top3Reco.length === 0 && (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                    Belum ada rekomendasi.
                                </p>
                            )}
                            {top3Reco.map((job, i) => (
                                <Link
                                    key={job.id}
                                    href={`/dashboard/jobs/${job.id}`}
                                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-lg font-bold text-muted-foreground/30 w-5 shrink-0">{i + 1}</span>
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm truncate">{job.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {job.company}{job.location ? ` · ${job.location}` : ""}{job.is_remote ? " · Remote" : ""}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <ScoreBadge score={job.match_score} />
                                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Skill gap + GitHub info (col 2) */}
                    <div className="md:col-span-2 space-y-4">
                        {/* Skill gap quick view */}
                        <Card>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Target className="w-4 h-4 text-muted-foreground" />
                                        <CardTitle className="text-base">Skill Gap</CardTitle>
                                    </div>
                                    <Link
                                        href="/dashboard/skill-gap"
                                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                    >
                                        Detail <ArrowRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {gapCount > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {(gap?.missing_skills ?? []).slice(0, 6).map((s) => (
                                            <Badge key={s} variant="outline" className="text-xs font-normal text-amber-600 border-amber-500/40">
                                                {s}
                                            </Badge>
                                        ))}
                                        {gapCount > 6 && (
                                            <Badge variant="secondary" className="text-xs">
                                                +{gapCount - 6} lagi
                                            </Badge>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-green-500 flex items-center gap-1">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Semua skill market sudah dikuasai!
                                    </p>
                                )}
                                {weakCount > 0 && (
                                    <p className="text-xs text-orange-500 mt-2 flex items-center gap-1">
                                        {weakCount} skill di CV belum terbukti di GitHub
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* GitHub info */}
                        <Card>
                            <CardContent className="flex items-center gap-3 pt-4 pb-4">
                                <Github className="w-5 h-5 shrink-0 text-muted-foreground" />
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">@{profile?.github_username ?? "—"}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {skillCount} skill · {githubBacked} terbukti GitHub
                                    </p>
                                </div>
                                <Button asChild variant="ghost" size="sm" className="shrink-0 ml-auto text-xs">
                                    <Link href="/dashboard/onboarding">Update</Link>
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Quick: Browse jobs */}
                        <Card className="bg-primary/5 border-primary/20">
                            <CardContent className="flex items-center justify-between pt-4 pb-4 gap-3">
                                <div>
                                    <p className="text-sm font-medium">Cari target job baru?</p>
                                    <p className="text-xs text-muted-foreground">Browse & buat roadmap dari halaman lowongan</p>
                                </div>
                                <Button asChild size="sm" className="shrink-0">
                                    <Link href="/dashboard/jobs">
                                        <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                                        Browse
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
