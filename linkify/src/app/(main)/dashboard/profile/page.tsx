"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";
import {
    AlertTriangle,
    ArrowRight,
    ArrowUpRight,
    Check,
    ChevronRight,
    Code2,
    ExternalLink,
    FileText,
    Github,
    RefreshCw,
    ShieldCheck,
    Star,
    Target,
    User,
    Zap,
} from "lucide-react";
import Link from "next/link";

// ── Types ──
type Profile = {
    github_username: string | null;
    github_signals: {
        languages?: Record<string, number>;
        topics?: string[];
        public_repos?: number;
        followers?: number;
        stars?: number;
    } | null;
    cv_skills: string[] | null;
    merged_skills: string[] | null;
    updated_at: string | null;
};

type SkillGap = {
    weak_skills: string[];
    github_backed_count: number;
    has_profile: boolean;
};

// ── Bento cell ──
function BentoCell({ children, className = "", href }: { children: React.ReactNode; className?: string; href?: string }) {
    const base = `rounded-2xl border glass-border glass backdrop-blur-sm overflow-hidden transition-all duration-300 ${className}`;
    if (href) {
        return (
            <Link href={href} className={`${base} group glass-border-hover glass-hover hover:shadow-xl hover:shadow-black/10 hover:-translate-y-0.5 cursor-pointer block`}>
                {children}
            </Link>
        );
    }
    return <div className={base}>{children}</div>;
}

// ── Verification ring (SVG donut) ──
function VerifyRing({ verified, total, size = 80 }: { verified: number; total: number; size?: number }) {
    const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-white/[0.06]" />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-1000" />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-lg font-bold">{pct}%</span>
                <span className="text-[9px] text-muted-foreground -mt-0.5">verified</span>
            </div>
        </div>
    );
}

// ── Skill chip ──
function SkillChip({ skill, source }: { skill: string; source: "github" | "cv" | "both" }) {
    const styles = {
        github: "border-violet-500/20 text-violet-300/90 bg-violet-500/[0.06]",
        cv: "border-sky-500/20 text-sky-300/90 bg-sky-500/[0.06]",
        both: "border-emerald-500/20 text-emerald-300/90 bg-emerald-500/[0.06]",
    }[source];
    const dotColor = { github: "bg-violet-400", cv: "bg-sky-400", both: "bg-emerald-400" }[source];

    return (
        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors cursor-default ${styles}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
            {skill}
        </span>
    );
}

// ── Language colors ──
const LANG_COLORS: Record<string, string> = {
    Python: "#3572A5", JavaScript: "#f1e05a", TypeScript: "#3178c6",
    Go: "#00ADD8", Rust: "#dea584", Java: "#b07219",
    Kotlin: "#A97BFF", Swift: "#F05138", PHP: "#4F5D95",
    "C++": "#f34b7d", C: "#555555", Ruby: "#701516",
    Dart: "#00B4AB", HTML: "#e34c26", CSS: "#563d7c",
    Shell: "#89e051", Jupyter: "#DA5B0B", Vue: "#41b883",
};

export default function ProfilePage() {
    const { withAuth, authReady } = useApi();

    const { data: profile, isLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: () => withAuth<Profile | null>("/me/profile"),
        enabled: authReady,
        staleTime: 10 * 60 * 1000,
    });

    const { data: gap } = useQuery({
        queryKey: ["skill-gap"],
        queryFn: () => withAuth<SkillGap>("/me/skill-gap"),
        enabled: authReady && !!profile?.merged_skills?.length,
        staleTime: 5 * 60 * 1000,
    });

    // ── Loading ──
    if (isLoading) {
        return (
            <div className="space-y-3 max-w-[880px]">
                <div className="h-7 w-40 glass-lg rounded-lg animate-pulse" />
                <div className="grid md:grid-cols-3 gap-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-32 rounded-2xl border glass-border glass animate-pulse" />
                    ))}
                </div>
                <div className="h-64 rounded-2xl border glass-border glass animate-pulse" />
            </div>
        );
    }

    // ── Empty state ──
    if (!profile?.merged_skills?.length) {
        return (
            <div className="max-w-md mx-auto py-16 text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl glass-lg border border-black/[0.1] dark:border-white/[0.08] mx-auto flex items-center justify-center">
                    <User className="w-7 h-7 text-muted-foreground/60" />
                </div>
                <div className="space-y-1.5">
                    <h2 className="font-semibold text-lg">Profil belum tersinkron</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Hubungkan akun GitHub dan upload CV-mu untuk melihat profil skill.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/dashboard/onboarding">Mulai Onboarding</Link>
                </Button>
            </div>
        );
    }

    // ── Compute ──
    const ghLangs = Object.keys(profile.github_signals?.languages ?? {});
    const ghTopics = profile.github_signals?.topics ?? [];
    const githubSkillSet = new Set([...ghLangs, ...ghTopics].map((s) => s.toLowerCase()));
    const cvSkillSet = new Set((profile.cv_skills ?? []).map((s) => s.toLowerCase()));
    const mergedSkills = profile.merged_skills ?? [];

    const getSource = (skill: string): "github" | "cv" | "both" => {
        const s = skill.toLowerCase();
        if (githubSkillSet.has(s) && cvSkillSet.has(s)) return "both";
        if (githubSkillSet.has(s)) return "github";
        return "cv";
    };

    const bySource = {
        both: mergedSkills.filter((s) => getSource(s) === "both"),
        github: mergedSkills.filter((s) => getSource(s) === "github"),
        cv: mergedSkills.filter((s) => getSource(s) === "cv"),
    };

    const langs = profile.github_signals?.languages ?? {};
    const totalBytes = Object.values(langs).reduce((a, b) => a + b, 0) || 1;
    const sortedLangs = Object.entries(langs).sort((a, b) => b[1] - a[1]);

    const updatedAt = profile.updated_at
        ? new Date(profile.updated_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
        : "—";

    const ghBacked = gap?.github_backed_count ?? 0;

    return (
        <div className="space-y-5 max-w-[880px]">

            {/* ── Header ── */}
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Profil & Skill</h1>
                    <p className="text-xs text-muted-foreground mt-1">Sync terakhir: {updatedAt}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" asChild className="hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
                        <Link href="/dashboard/cv-generator">
                            <FileText className="w-3.5 h-3.5 mr-1.5" /> Buat CV (.docx)
                        </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild className="hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
                        <Link href="/dashboard/onboarding">
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Sync Ulang
                        </Link>
                    </Button>
                </div>
            </div>

            {/* ── Row 1: GitHub Identity + Stats + Verify Ring ── */}
            <div className="grid md:grid-cols-3 gap-3">

                {/* GitHub identity card */}
                <BentoCell className="md:col-span-2">
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500/60 via-white/10 to-transparent" />
                    <div className="relative p-5 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-black/[0.1] dark:border-white/[0.08] flex items-center justify-center shrink-0">
                            <Github className="w-7 h-7 text-foreground/80" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold truncate">@{profile.github_username}</h2>
                                <a
                                    href={`https://github.com/${profile.github_username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Code2 className="w-3 h-3" /> {profile.github_signals?.public_repos ?? 0} repos
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <User className="w-3 h-3" /> {profile.github_signals?.followers ?? 0} followers
                                </span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Star className="w-3 h-3" /> {profile.github_signals?.stars ?? 0} stars
                                </span>
                            </div>
                        </div>
                    </div>
                </BentoCell>

                {/* Verification donut */}
                <BentoCell>
                    <div className="p-5 flex flex-col items-center justify-center h-full min-h-[130px]">
                        <VerifyRing verified={ghBacked} total={mergedSkills.length} />
                        <p className="text-[11px] text-muted-foreground mt-2">{ghBacked}/{mergedSkills.length} skill terbukti</p>
                    </div>
                </BentoCell>
            </div>

            {/* ── Row 2: Language breakdown ── */}
            {sortedLangs.length > 0 && (
                <BentoCell>
                    <div className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Code2 className="w-4 h-4 text-blue-400" />
                                Bahasa Pemrograman
                            </h3>
                            <span className="text-[11px] text-muted-foreground">{sortedLangs.length} bahasa</span>
                        </div>

                        {/* Visual bar */}
                        <div className="flex rounded-full overflow-hidden h-4 gap-[1px] glass-md">
                            {sortedLangs.slice(0, 8).map(([lang, bytes]) => {
                                const pct = Math.round((bytes / totalBytes) * 100);
                                return (
                                    <div
                                        key={lang}
                                        className="group relative h-full first:rounded-l-full last:rounded-r-full transition-all duration-300 hover:brightness-125"
                                        style={{ width: `${Math.max(pct, 2)}%`, background: LANG_COLORS[lang] ?? "#6366f1" }}
                                    >
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-popover border border-border text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 shadow-lg">
                                            {lang} · {pct}%
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {sortedLangs.slice(0, 8).map(([lang, bytes]) => {
                                const pct = Math.round((bytes / totalBytes) * 100);
                                return (
                                    <div key={lang} className="flex items-center gap-2 p-2 rounded-lg glass border border-black/[0.06] dark:border-white/[0.04]">
                                        <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: LANG_COLORS[lang] ?? "#6366f1" }} />
                                        <span className="text-xs truncate">{lang}</span>
                                        <span className="text-[11px] text-muted-foreground ml-auto tabular-nums">{pct}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </BentoCell>
            )}

            {/* ── Row 3: CV Skills + Topics (side by side) ── */}
            <div className="grid md:grid-cols-2 gap-3">

                {/* CV skills */}
                <BentoCell>
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-sky-500/[0.1] border border-sky-500/20 flex items-center justify-center">
                                <FileText className="w-3.5 h-3.5 text-sky-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold">Skill dari CV</h3>
                                <p className="text-[11px] text-muted-foreground">{profile.cv_skills?.length ?? 0} teridentifikasi</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {(profile.cv_skills ?? []).map((s) => (
                                <SkillChip key={s} skill={s} source="cv" />
                            ))}
                            {(!profile.cv_skills || profile.cv_skills.length === 0) && (
                                <p className="text-xs text-muted-foreground py-4">Tidak ada skill dari CV.</p>
                            )}
                        </div>
                    </div>
                </BentoCell>

                {/* GitHub topics */}
                <BentoCell>
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-lg bg-violet-500/[0.1] border border-violet-500/20 flex items-center justify-center">
                                <Github className="w-3.5 h-3.5 text-violet-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold">GitHub Topics</h3>
                                <p className="text-[11px] text-muted-foreground">{ghTopics.length} topics</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {ghTopics.map((t) => (
                                <SkillChip key={t} skill={t} source="github" />
                            ))}
                            {ghTopics.length === 0 && (
                                <p className="text-xs text-muted-foreground py-4">Tidak ada topics.</p>
                            )}
                        </div>
                    </div>
                </BentoCell>
            </div>

            {/* ── Row 4: All merged skills ── */}
            <BentoCell>
                <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-violet-500/20 border border-primary/20 flex items-center justify-center">
                                <Zap className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold">Semua Skill</h3>
                                <p className="text-[11px] text-muted-foreground">{mergedSkills.length} total · GitHub + CV digabung</p>
                            </div>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex gap-4 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Keduanya ({bySource.both.length})
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-violet-400" /> GitHub ({bySource.github.length})
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-sky-400" /> CV ({bySource.cv.length})
                        </span>
                    </div>

                    {/* Sorted: both → github → cv */}
                    <div className="flex flex-wrap gap-1.5">
                        {[...bySource.both, ...bySource.github, ...bySource.cv].map((s) => (
                            <SkillChip key={s} skill={s} source={getSource(s)} />
                        ))}
                    </div>
                </div>
            </BentoCell>

            {/* ── Row 5: Weak skills warning ── */}
            {gap && gap.weak_skills.length > 0 && (
                <BentoCell className="border-amber-500/10">
                    <div className="p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/[0.1] border border-amber-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold">Perlu Diperkuat</h3>
                                <p className="text-[11px] text-muted-foreground">{gap.weak_skills.length} skill belum terverifikasi di GitHub</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {gap.weak_skills.map((s) => (
                                <Badge key={s} variant="outline" className="text-xs border-amber-400/25 text-amber-400/90 bg-amber-500/[0.05]">
                                    {s}
                                </Badge>
                            ))}
                        </div>
                        <div className="flex items-start gap-2.5 rounded-xl glass-md border border-black/[0.07] dark:border-white/[0.05] p-3">
                            <ShieldCheck className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                                Buat project open-source yang menggunakan teknologi ini. Recruiter lebih percaya bukti kode dibanding klaim di CV.
                            </p>
                        </div>
                    </div>
                </BentoCell>
            )}

            {/* ── CTAs ── */}
            <div className="grid md:grid-cols-2 gap-3">
                <BentoCell href="/dashboard/skill-gap">
                    <div className="p-5 flex items-center justify-between h-full min-h-[72px]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                <Target className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Skill Gap Analysis</p>
                                <p className="text-[11px] text-muted-foreground">Lihat skill yang belum dikuasai</p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </div>
                </BentoCell>

                <BentoCell href="/dashboard/jobs/recommended" className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] to-violet-500/[0.04]" />
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary to-violet-500" />
                    <div className="relative p-5 flex items-center justify-between h-full min-h-[72px]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg shadow-primary/20">
                                <Zap className="w-3.5 h-3.5 text-white" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Rekomendasi Job</p>
                                <p className="text-[11px] text-muted-foreground">Job yang cocok dengan skillmu</p>
                            </div>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                </BentoCell>
            </div>
        </div>
    );
}
