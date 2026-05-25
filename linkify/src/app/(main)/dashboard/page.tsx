"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowRight,
    ArrowUpRight,
    Bookmark,
    BookOpen,
    Briefcase,
    CheckCircle2,
    ChevronRight,
    ExternalLink,
    Github,
    GraduationCap,
    Send,
    Sparkles,
    Target,
    TrendingUp,
    UserRoundCheck,
    Wifi,
    Zap,
} from "lucide-react";
import Link from "next/link";

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

function DashboardPanel({
    children,
    className = "",
    href,
}: {
    children: React.ReactNode;
    className?: string;
    href?: string;
}) {
    const base = `rounded-2xl border glass-border glass backdrop-blur-md transition-all duration-300 ${className}`;

    if (href) {
        return (
            <Link
                href={href}
                prefetch={false}
                className={`${base} group block cursor-pointer hover:border-primary/40 hover:scale-[1.01] hover:shadow-[0_12px_30px_rgba(109,40,217,0.08)] dark:hover:shadow-[0_12px_30px_rgba(109,40,217,0.18)] hover:bg-black/[0.03] dark:hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60`}
            >
                {children}
            </Link>
        );
    }

    return <section className={base}>{children}</section>;
}

function SectionHeader({
    icon,
    title,
    action,
}: {
    icon: React.ReactNode;
    title: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
                {icon}
                <h2 className="truncate text-sm font-semibold">{title}</h2>
            </div>
            {action}
        </div>
    );
}

function ScoreRing({ score, size = 44 }: { score: number | null; size?: number }) {
    if (score == null) return null;

    const pct = Math.round(score * 100);
    const r = (size - 6) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    const color = pct >= 70 ? "#22c55e" : pct >= 45 ? "#f59e0b" : "#ef4444";

    return (
        <div className="relative flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-black/[0.08] dark:text-white/[0.08]"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    strokeWidth="3"
                    className="transition-all duration-700"
                />
            </svg>
            <span className="absolute text-[11px] font-bold tabular-nums" style={{ color }}>
                {pct}%
            </span>
        </div>
    );
}

function ProgressSlim({ done, total }: { done: number; total: number }) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const gradient =
        pct === 100
            ? "from-emerald-400 to-green-500"
            : pct >= 50
              ? "from-violet-400 to-purple-500"
              : "from-blue-500 to-violet-500";

    return (
        <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                <div
                    className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className="text-[11px] text-muted-foreground">
                {pct}% - {done}/{total || 0} langkah
            </p>
        </div>
    );
}

function StatTile({
    label,
    value,
    helper,
    icon,
    href,
    tone = "blue",
}: {
    label: string;
    value: string | number;
    helper: string;
    icon: React.ReactNode;
    href: string;
    tone?: "blue" | "amber" | "violet" | "emerald";
}) {
    const toneClass = {
        blue: "from-blue-500 to-cyan-500 shadow-blue-500/20",
        amber: "from-amber-500 to-orange-500 shadow-amber-500/20",
        violet: "from-violet-500 to-purple-600 shadow-violet-500/20",
        emerald: "from-emerald-500 to-green-600 shadow-emerald-500/20",
    }[tone];

    return (
        <DashboardPanel href={href}>
            <div className="flex min-h-[124px] flex-col justify-between p-4">
                <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {label}
                    </span>
                    <span className={`flex size-8 items-center justify-center rounded-lg bg-gradient-to-br ${toneClass} text-white shadow-lg`}>
                        {icon}
                    </span>
                </div>
                <div>
                    <p className="text-3xl font-bold tabular-nums">{value}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{helper}</p>
                </div>
            </div>
        </DashboardPanel>
    );
}

function LoadingOverview() {
    return (
        <div className="space-y-4">
            <div className="h-32 animate-pulse rounded-lg bg-muted/50" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-28 animate-pulse rounded-lg bg-muted/40" />
                ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="h-64 animate-pulse rounded-lg bg-muted/40" />
                <div className="h-64 animate-pulse rounded-lg bg-muted/40" />
            </div>
        </div>
    );
}

export default function DashboardHomePage() {
    const { withAuth, isLoaded, authReady } = useApi();
    const { user } = useUser();

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: () => withAuth<Profile | null>("/me/profile"),
        enabled: authReady,
        staleTime: 10 * 60 * 1000,
        retry: (failureCount, error) => {
            if ((error as Error).message === "AUTH_NOT_READY") return false;
            return failureCount < 2;
        },
    });

    const hasProfile = !!profile?.merged_skills?.length;

    const { data: gap } = useQuery({
        queryKey: ["skill-gap"],
        queryFn: () => withAuth<SkillGap>("/me/skill-gap"),
        enabled: authReady && hasProfile,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const { data: recommended } = useQuery({
        queryKey: ["jobs", "recommended"],
        queryFn: () => withAuth<Job[]>("/jobs/recommended"),
        enabled: authReady && hasProfile,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const { data: bookmarks = [], isLoading: bookmarksLoading } = useQuery({
        queryKey: ["bookmarks"],
        queryFn: () => withAuth<BookmarkedJob[]>("/me/bookmarks"),
        enabled: authReady && hasProfile,
        staleTime: 60_000,
        retry: false,
    });

    const { data: applications = [] } = useQuery({
        queryKey: ["applications"],
        queryFn: () => withAuth<{ id: string; status: string }[]>("/applications"),
        enabled: authReady && hasProfile,
        staleTime: 60_000,
        retry: false,
    });

    if (!isLoaded || (authReady && profileLoading)) {
        return <LoadingOverview />;
    }

    const firstName = user?.firstName ?? user?.username ?? "kamu";
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "pagi" : hour < 18 ? "siang" : "malam";

    const skillCount = profile?.merged_skills?.length ?? 0;
    const githubBacked = gap?.github_backed_count ?? 0;
    const gapCount = gap?.missing_skills.length ?? 0;
    const weakCount = gap?.weak_skills?.length ?? 0;
    const topMatches = (recommended ?? []).slice(0, 3);
    const primaryMatch = topMatches[0];

    const activeBookmarks = bookmarks.length;
    const finishedBookmarks = bookmarks.filter((b) => b.total_steps > 0 && b.completed_steps === b.total_steps).length;
    const activeRoadmap = bookmarks.find((b) => b.total_steps > 0 && b.completed_steps < b.total_steps) ?? bookmarks[0];
    const totalRoadmapSteps = bookmarks.reduce((sum, b) => sum + b.total_steps, 0);
    const completedRoadmapSteps = bookmarks.reduce((sum, b) => sum + b.completed_steps, 0);
    const roadmapPct = totalRoadmapSteps > 0 ? Math.round((completedRoadmapSteps / totalRoadmapSteps) * 100) : 0;

    const appCount = applications.length;
    const interviewCount = applications.filter((a) => a.status === "interview").length;
    const offerCount = applications.filter((a) => a.status === "offer").length;

    const readinessItems = [
        {
            label: "Skill profile",
            complete: skillCount > 0,
            helper: `${skillCount} skill terdeteksi`,
        },
        {
            label: "GitHub evidence",
            complete: githubBacked > 0,
            helper: `${githubBacked} skill terverifikasi`,
        },
        {
            label: "Job target",
            complete: activeBookmarks > 0,
            helper: activeBookmarks > 0 ? `${activeBookmarks} job dikejar` : "belum pilih target",
        },
        {
            label: "Application tracker",
            complete: appCount > 0,
            helper: appCount > 0 ? `${appCount} lamaran dicatat` : "belum ada lamaran",
        },
    ];
    const readinessScore = Math.round((readinessItems.filter((item) => item.complete).length / readinessItems.length) * 100);

    const nextAction = !hasProfile
        ? {
              title: "Lengkapi profil karier",
              description: "Hubungkan GitHub dan upload CV untuk membuka rekomendasi job, skill gap, dan roadmap personal.",
              href: "/dashboard/onboarding",
              cta: "Mulai onboarding",
              icon: <UserRoundCheck className="size-5" />,
          }
        : gapCount > 0
          ? {
                title: "Tutup skill gap prioritas",
                description: `Mulai dari ${gap?.missing_skills?.[0] ?? "skill paling dibutuhkan"} agar match score naik di lowongan relevan.`,
                href: "/dashboard/skill-gap",
                cta: "Lihat skill gap",
                icon: <Target className="size-5" />,
            }
          : activeRoadmap
            ? {
                  title: "Lanjutkan roadmap aktif",
                  description: `${activeRoadmap.title} sudah ${activeRoadmap.completed_steps}/${activeRoadmap.total_steps || 0} langkah selesai.`,
                  href: `/dashboard/roadmap?job_id=${activeRoadmap.job_id}`,
                  cta: "Buka roadmap",
                  icon: <GraduationCap className="size-5" />,
              }
            : primaryMatch
              ? {
                    title: "Pilih target job terbaik",
                    description: `${primaryMatch.title} punya match score terbaik dari rekomendasi saat ini.`,
                    href: `/dashboard/jobs/${primaryMatch.id}`,
                    cta: "Lihat detail job",
                    icon: <Briefcase className="size-5" />,
                }
              : {
                    title: "Cari lowongan baru",
                    description: "Browse lowongan fresh graduate dan buat roadmap dari job yang ingin dikejar.",
                    href: "/dashboard/jobs",
                    cta: "Browse jobs",
                    icon: <BookOpen className="size-5" />,
                };

    if (!hasProfile) {
        return (
            <div className="mx-auto max-w-2xl py-10">
                <DashboardPanel>
                    <div className="p-6 text-center sm:p-8">
                        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                            <Sparkles className="size-7" />
                        </div>
                        <p className="text-sm text-muted-foreground">Selamat {greeting}, {firstName}</p>
                        <h1 className="mt-2 text-2xl font-bold tracking-tight">Bangun profil GitHire dulu</h1>
                        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                            Setelah GitHub dan CV tersambung, dashboard ini akan menampilkan match score, skill gap,
                            roadmap belajar, dan status lamaran dalam satu alur kerja.
                        </p>
                        <Button asChild size="lg" className="mt-6">
                            <Link href="/dashboard/onboarding">
                                Mulai onboarding <ArrowRight className="ml-2 size-4" />
                            </Link>
                        </Button>
                    </div>
                </DashboardPanel>
            </div>
        );
    }

    return (
        <div className="mx-auto w-full max-w-6xl space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        <Sparkles className="size-3.5" />
                        Command Center
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Selamat {greeting}, {firstName}</h1>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                        Fokus hari ini: pilih langkah paling berdampak untuk naikkan match score dan lanjutkan proses lamaran.
                    </p>
                </div>

                {profile?.github_username ? (
                    <Link
                        href={`https://github.com/${profile.github_username}`}
                        target="_blank"
                        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    >
                        <Github className="size-4" />
                        @{profile.github_username}
                        <ExternalLink className="size-3.5" />
                    </Link>
                ) : (
                    <Button asChild variant="outline">
                        <Link href="/dashboard/onboarding">Update profil</Link>
                    </Button>
                )}
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
                <DashboardPanel href={nextAction.href} className="overflow-hidden">
                    <div className="relative min-h-[184px] p-5 sm:p-6">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.14] via-transparent to-emerald-500/[0.08]" />
                        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-primary via-emerald-500 to-transparent" />
                        <div className="relative flex h-full flex-col justify-between gap-6 sm:flex-row sm:items-end">
                            <div className="max-w-xl">
                                <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                                    {nextAction.icon}
                                </div>
                                <p className="text-xs font-medium uppercase tracking-wide text-primary">Langkah berikutnya</p>
                                <h2 className="mt-1 text-2xl font-bold tracking-tight">{nextAction.title}</h2>
                                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{nextAction.description}</p>
                            </div>
                            <div className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-foreground px-4 text-sm font-semibold text-background transition-transform group-hover:translate-x-1">
                                {nextAction.cta}
                                <ArrowRight className="size-4" />
                            </div>
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel>
                    <div className="p-5">
                        <SectionHeader
                            icon={<UserRoundCheck className="size-4 text-emerald-400" />}
                            title="Kesiapan profil"
                            action={<span className="text-sm font-bold tabular-nums text-emerald-400">{readinessScore}%</span>}
                        />
                        <div className="space-y-3">
                            {readinessItems.map((item) => (
                                <div key={item.label} className="flex items-start gap-3">
                                    <span
                                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                                            item.complete
                                                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                                                : "border-border bg-muted text-muted-foreground"
                                        }`}
                                    >
                                        {item.complete ? <CheckCircle2 className="size-3.5" /> : <span className="size-1.5 rounded-full bg-current" />}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium">{item.label}</p>
                                        <p className="text-xs text-muted-foreground">{item.helper}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </DashboardPanel>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatTile
                    href="/dashboard/profile"
                    label="Skill"
                    value={skillCount}
                    helper={`${githubBacked} verified GitHub`}
                    icon={<Zap className="size-4" />}
                    tone="blue"
                />
                <StatTile
                    href="/dashboard/skill-gap"
                    label="Gap"
                    value={gapCount}
                    helper={weakCount > 0 ? `${weakCount} skill perlu bukti` : "skill prioritas"}
                    icon={<Target className="size-4" />}
                    tone="amber"
                />
                <StatTile
                    href="/dashboard/my-roadmaps"
                    label="Roadmap"
                    value={activeBookmarks}
                    helper={`${finishedBookmarks} selesai`}
                    icon={<Bookmark className="size-4" />}
                    tone="violet"
                />
                <StatTile
                    href="/dashboard/applications"
                    label="Lamaran"
                    value={appCount}
                    helper={offerCount > 0 ? `${offerCount} offer` : interviewCount > 0 ? `${interviewCount} interview` : "status aktif"}
                    icon={<Send className="size-4" />}
                    tone="emerald"
                />
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                <DashboardPanel>
                    <div className="p-5">
                        <SectionHeader
                            icon={<Briefcase className="size-4 text-blue-400" />}
                            title="Top match"
                            action={
                                <Link
                                    href="/dashboard/jobs/recommended"
                                    className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    Semua <ChevronRight className="size-3" />
                                </Link>
                            }
                        />
                        <div className="space-y-2">
                            {topMatches.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                                    Belum ada rekomendasi. Update profil atau browse lowongan untuk mulai.
                                </div>
                            ) : (
                                topMatches.map((job, index) => (
                                    <Link
                                        key={job.id}
                                        href={`/dashboard/jobs/${job.id}`}
                                        prefetch={false}
                                        className="group flex min-h-[76px] items-center gap-3 rounded-lg border border-black/[0.06] p-3 transition-all duration-200 hover:border-primary/30 hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 dark:border-white/[0.06] dark:hover:bg-white/[0.04]"
                                    >
                                        <div
                                            className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${
                                                index === 0
                                                    ? "bg-gradient-to-br from-amber-300 to-orange-500"
                                                    : index === 1
                                                      ? "bg-gradient-to-br from-slate-400 to-slate-600"
                                                      : "bg-gradient-to-br from-violet-500 to-purple-600"
                                            }`}
                                        >
                                            {index + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                                                {job.title}
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                {job.company}
                                                {job.location ? ` - ${job.location}` : ""}
                                                {job.is_remote ? " - Remote" : ""}
                                            </p>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {job.required_skills.slice(0, 3).map((skill) => (
                                                    <Badge key={skill} variant="secondary" className="h-5 rounded-md px-1.5 text-[10px]">
                                                        {skill}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                        <ScoreRing score={job.match_score} size={42} />
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel>
                    <div className="p-5">
                        <SectionHeader
                            icon={<GraduationCap className="size-4 text-violet-400" />}
                            title="Roadmap aktif"
                            action={<span className="text-xs font-medium text-violet-400 tabular-nums">{roadmapPct}% total</span>}
                        />
                        {bookmarksLoading ? (
                            <div className="space-y-2">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <div key={index} className="h-[72px] animate-pulse rounded-lg bg-muted/40" />
                                ))}
                            </div>
                        ) : bookmarks.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border p-6 text-center">
                                <Bookmark className="mx-auto mb-3 size-6 text-muted-foreground/40" />
                                <p className="text-sm font-medium">Belum ada roadmap target</p>
                                <p className="mt-1 text-xs text-muted-foreground">Pilih lowongan, lalu buat roadmap belajar dari detail job.</p>
                                <Button asChild size="sm" className="mt-4">
                                    <Link href="/dashboard/jobs">Cari job</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {bookmarks.slice(0, 3).map((bookmark) => {
                                    const isDone = bookmark.total_steps > 0 && bookmark.completed_steps === bookmark.total_steps;

                                    return (
                                        <Link
                                            key={bookmark.job_id}
                                            href={`/dashboard/roadmap?job_id=${bookmark.job_id}`}
                                            prefetch={false}
                                            className="group block rounded-lg border border-black/[0.06] p-3 transition-all duration-200 hover:border-violet-500/30 hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 dark:border-white/[0.06] dark:hover:bg-white/[0.04]"
                                        >
                                            <div className="mb-2 flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium transition-colors group-hover:text-primary">
                                                        {isDone && <CheckCircle2 className="mr-1 inline size-3.5 text-emerald-400" />}
                                                        {bookmark.title}
                                                    </p>
                                                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                                                        {bookmark.company}
                                                        {bookmark.is_remote && (
                                                            <span className="inline-flex items-center gap-0.5 text-emerald-400">
                                                                <Wifi className="size-3" />
                                                                Remote
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <ScoreRing score={bookmark.match_score} size={36} />
                                            </div>
                                            <ProgressSlim done={bookmark.completed_steps} total={bookmark.total_steps} />
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </DashboardPanel>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_0.85fr_0.65fr]">
                <DashboardPanel href="/dashboard/skill-gap">
                    <div className="p-5">
                        <SectionHeader
                            icon={<Target className="size-4 text-amber-400" />}
                            title="Skill gap prioritas"
                            action={<ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />}
                        />
                        {gapCount > 0 ? (
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-1.5">
                                    {(gap?.missing_skills ?? []).slice(0, 8).map((skill) => (
                                        <Badge
                                            key={skill}
                                            variant="outline"
                                            className="border-amber-500/25 bg-amber-500/[0.06] text-xs font-normal text-amber-500 dark:text-amber-300"
                                        >
                                            {skill}
                                        </Badge>
                                    ))}
                                    {gapCount > 8 && (
                                        <Badge variant="secondary" className="text-xs">
                                            +{gapCount - 8}
                                        </Badge>
                                    )}
                                </div>
                                {weakCount > 0 && (
                                    <p className="flex items-center gap-1 text-xs text-orange-500 dark:text-orange-300">
                                        <TrendingUp className="size-3.5" />
                                        {weakCount} skill ada di CV tapi belum punya bukti kuat dari GitHub.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="flex items-center gap-2 text-sm text-emerald-500">
                                <CheckCircle2 className="size-4" />
                                Skill utama pasar sudah tertutup. Saatnya pilih target job.
                            </p>
                        )}
                    </div>
                </DashboardPanel>

                <DashboardPanel href="/dashboard/applications">
                    <div className="p-5">
                        <SectionHeader
                            icon={<Send className="size-4 text-emerald-400" />}
                            title="Status lamaran"
                            action={<ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />}
                        />
                        <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-2xl font-bold tabular-nums">{appCount}</p>
                                <p className="text-[11px] text-muted-foreground">Total</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-2xl font-bold tabular-nums text-blue-400">{interviewCount}</p>
                                <p className="text-[11px] text-muted-foreground">Interview</p>
                            </div>
                            <div className="rounded-lg bg-muted/50 p-3">
                                <p className="text-2xl font-bold tabular-nums text-emerald-400">{offerCount}</p>
                                <p className="text-[11px] text-muted-foreground">Offer</p>
                            </div>
                        </div>
                    </div>
                </DashboardPanel>

                <DashboardPanel href="/dashboard/jobs" className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.10] via-transparent to-violet-500/[0.08]" />
                    <div className="relative flex h-full min-h-[150px] flex-col justify-between p-5">
                        <div>
                            <BookOpen className="mb-3 size-5 text-primary" />
                            <p className="text-sm font-semibold">Cari lowongan baru</p>
                            <p className="mt-1 text-xs text-muted-foreground">Browse, cek match score, lalu buat roadmap.</p>
                        </div>
                        <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-all group-hover:gap-2.5">
                            Browse jobs
                            <ArrowUpRight className="size-3.5" />
                        </div>
                    </div>
                </DashboardPanel>
            </div>
        </div>
    );
}
