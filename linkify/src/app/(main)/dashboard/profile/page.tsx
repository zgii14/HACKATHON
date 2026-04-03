"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Code2, FileText, Github, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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

function SkillBadge({ skill, source }: { skill: string; source: "github" | "cv" | "both" }) {
    const style = {
        github: "border-violet-500/40 text-violet-400 bg-violet-500/5",
        cv: "border-blue-500/40 text-blue-400 bg-blue-500/5",
        both: "border-emerald-500/40 text-emerald-400 bg-emerald-500/5",
    }[source];
    return (
        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-normal ${style}`}>
            {skill}
        </span>
    );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex flex-col items-center px-4 py-2 rounded-xl bg-muted/50">
            <span className="text-lg font-bold">{value}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
        </div>
    );
}

export default function ProfilePage() {
    const { withAuth, isLoaded, isSignedIn } = useApi();
    const authReady = isLoaded && isSignedIn;

    const { data: profile, isLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: () => withAuth<Profile | null>("/me/profile"),
        enabled: authReady,
        staleTime: 10 * 60 * 1000, // 10 menit
    });

    const { data: gap } = useQuery({
        queryKey: ["skill-gap"],
        queryFn: () => withAuth<SkillGap>("/me/skill-gap"),
        enabled: authReady && !!profile?.merged_skills?.length,
        staleTime: 5 * 60 * 1000, // 5 menit
    });

    if (isLoading) {
        return (
            <div className="space-y-4 max-w-3xl">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-40 rounded-xl border bg-muted/30 animate-pulse" />
                ))}
            </div>
        );
    }

    if (!profile?.merged_skills?.length) {
        return (
            <div className="max-w-md py-12 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-muted mx-auto flex items-center justify-center text-4xl">
                    🧑‍💻
                </div>
                <h2 className="font-semibold text-xl">Profil belum tersinkron</h2>
                <p className="text-sm text-muted-foreground">
                    Sync GitHub dan CV-mu untuk melihat skill yang terdeteksi.
                </p>
                <Button asChild>
                    <Link href="/dashboard/onboarding">Mulai Onboarding</Link>
                </Button>
            </div>
        );
    }

    // Compute skill sources
    const ghLangs = Object.keys(profile.github_signals?.languages ?? {});
    const ghTopics = profile.github_signals?.topics ?? [];
    const githubSkillSet = new Set([...ghLangs, ...ghTopics].map((s) => s.toLowerCase()));
    const cvSkillSet = new Set((profile.cv_skills ?? []).map((s) => s.toLowerCase()));
    const mergedSkills = profile.merged_skills ?? [];

    const getSource = (skill: string): "github" | "cv" | "both" => {
        const s = skill.toLowerCase();
        const inGh = githubSkillSet.has(s);
        const inCv = cvSkillSet.has(s);
        if (inGh && inCv) return "both";
        if (inGh) return "github";
        return "cv";
    };

    // Group merged by source
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

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Profil & Skill</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Skill yang terdeteksi dari GitHub dan CV-mu · Terakhir sync: {updatedAt}
                    </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/onboarding">
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Sync Ulang
                    </Link>
                </Button>
            </div>

            {/* GitHub info card */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Github className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base">@{profile.github_username}</CardTitle>
                            <CardDescription className="text-xs">GitHub Profile</CardDescription>
                        </div>
                        <a
                            href={`https://github.com/${profile.github_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-auto text-xs text-primary hover:underline"
                        >
                            Lihat Profile →
                        </a>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Stats row */}
                    <div className="flex flex-wrap gap-3">
                        <StatPill label="Repos" value={profile.github_signals?.public_repos ?? "—"} />
                        <StatPill label="Followers" value={profile.github_signals?.followers ?? "—"} />
                        <StatPill label="Bahasa" value={Object.keys(langs).length} />
                        <StatPill label="Topics" value={ghTopics.length} />
                        {gap && (
                            <StatPill
                                label="Terbukti di GitHub"
                                value={`${gap.github_backed_count}/${profile.merged_skills?.length ?? 0}`}
                            />
                        )}
                    </div>

                    {/* Language bar */}
                    {sortedLangs.length > 0 && (
                        <div>
                            <p className="text-xs text-muted-foreground mb-2">Distribusi Bahasa Pemrograman</p>
                            <div className="flex rounded-full overflow-hidden h-3 gap-0.5">
                                {sortedLangs.slice(0, 6).map(([lang, bytes]) => {
                                    const pct = Math.round((bytes / totalBytes) * 100);
                                    const langColors: Record<string, string> = {
                                        Python: "#3572A5", JavaScript: "#f1e05a", TypeScript: "#2b7489",
                                        Go: "#00ADD8", Rust: "#dea584", Java: "#b07219",
                                        Kotlin: "#A97BFF", Swift: "#F05138", PHP: "#4F5D95",
                                        "C++": "#f34b7d", C: "#555555", Ruby: "#701516",
                                        Dart: "#00B4AB", HTML: "#e34c26", CSS: "#563d7c",
                                    };
                                    return (
                                        <div
                                            key={lang}
                                            style={{ width: `${pct}%`, background: langColors[lang] ?? "#6366f1" }}
                                            title={`${lang}: ${pct}%`}
                                            className="first:rounded-l-full last:rounded-r-full"
                                        />
                                    );
                                })}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                                {sortedLangs.slice(0, 6).map(([lang, bytes]) => {
                                    const pct = Math.round((bytes / totalBytes) * 100);
                                    return (
                                        <span key={lang} className="text-xs text-muted-foreground">
                                            {lang} {pct}%
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Topics */}
                    {ghTopics.length > 0 && (
                        <div>
                            <p className="text-xs text-muted-foreground mb-2">Repository Topics</p>
                            <div className="flex flex-wrap gap-1.5">
                                {ghTopics.map((t) => (
                                    <SkillBadge key={t} skill={t} source="github" />
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* CV Skills */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Skill dari CV</CardTitle>
                            <CardDescription className="text-xs">{profile.cv_skills?.length ?? 0} skill terekstrak oleh AI</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                        {(profile.cv_skills ?? []).map((s) => (
                            <SkillBadge key={s} skill={s} source="cv" />
                        ))}
                        {(!profile.cv_skills || profile.cv_skills.length === 0) && (
                            <p className="text-sm text-muted-foreground">Tidak ada skill yang terdeteksi dari CV.</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Merged skills breakdown */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Semua Skill ({mergedSkills.length})</CardTitle>
                            <CardDescription className="text-xs">Gabungan dari GitHub + CV, deduplikasi otomatis</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Legend */}
                    <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                            GitHub + CV ({bySource.both.length})
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                            GitHub saja ({bySource.github.length})
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                            CV saja ({bySource.cv.length})
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {mergedSkills.map((s) => (
                            <SkillBadge key={s} skill={s} source={getSource(s)} />
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Weak skills & CTA sections remain — BioDataCard dipindah ke /dashboard/account */}
            {/* Weak skills — CV-only yang dibutuhkan job */}
            {gap && gap.weak_skills.length > 0 && (
                <Card className="border-orange-500/30">
                    <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Perlu Diperdalam ({gap.weak_skills.length})</CardTitle>
                                <CardDescription className="text-xs">
                                    Skill ini ada di CV tapi belum ada bukti di GitHub
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-1.5">
                            {gap.weak_skills.map((s) => (
                                <Badge
                                    key={s}
                                    variant="outline"
                                    className="text-xs border-orange-400/50 text-orange-500 bg-orange-500/5"
                                >
                                    {s}
                                </Badge>
                            ))}
                        </div>
                        <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
                            <ShieldCheck className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                            <p className="text-xs text-muted-foreground">
                                Validasi skill ini dengan membuat project GitHub yang menggunakan teknologi tersebut.
                                Recruiter lebih percaya pada bukti nyata daripada sekedar pengakuan di CV.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* CTA */}
            <div className="flex gap-3 flex-wrap">
                <Button variant="outline" asChild>
                    <Link href="/dashboard/skill-gap">
                        <Code2 className="w-4 h-4 mr-1.5" />
                        Lihat Skill Gap
                    </Link>
                </Button>
                <Button asChild>
                    <Link href="/dashboard/jobs/recommended">
                        Lihat Rekomendasi Job →
                    </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild className="text-muted-foreground text-xs">
                    <Link href="/dashboard/account">
                        Kelola Data Diri →
                    </Link>
                </Button>
            </div>
        </div>
    );
}
