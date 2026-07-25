"use client";

// Hallmark · genre: modern-minimal · macrostructure: Workbench (app-surface) · theme: GitHire violet (locked)

import { BarFill, CountUp, EmptyState, PageHeader, Reveal, SecTitle } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

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

// Warna bahasa = konvensi data GitHub (chart, bukan dekorasi)
const LANG_COLORS: Record<string, string> = {
    Python: "#3572A5", JavaScript: "#f1e05a", TypeScript: "#3178c6",
    Go: "#00ADD8", Rust: "#dea584", Java: "#b07219",
    Kotlin: "#A97BFF", Swift: "#F05138", PHP: "#4F5D95",
    "C++": "#f34b7d", C: "#555555", Ruby: "#701516",
    Dart: "#00B4AB", HTML: "#e34c26", CSS: "#563d7c",
    Shell: "#89e051", Jupyter: "#DA5B0B", Vue: "#41b883",
};

// Tag skill: dot bertoken sesuai sumber, tag hairline netral
function SkillTag({ skill, source }: { skill: string; source: "github" | "cv" | "both" }) {
    const dot = { both: "bg-success", github: "bg-primary", cv: "bg-muted-foreground" }[source];
    return (
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[12px] text-foreground">
            <span className={`size-1.5 shrink-0 rounded-full ${dot}`} />
            {skill}
        </span>
    );
}

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

    if (isLoading) {
        return (
            <div className="w-full space-y-4">
                <div className="h-6 w-44 animate-pulse rounded bg-muted/50" />
                <div className="h-24 animate-pulse rounded bg-muted/30" />
                <div className="h-56 animate-pulse rounded bg-muted/30" />
            </div>
        );
    }

    if (!profile?.merged_skills?.length) {
        return (
            <div className="w-full">
                <PageHeader crumb="dasbor / profil" title="Profil & skill" />
                <div className="pt-8">
                    <EmptyState title="Profil belum tersinkron">
                        Hubungkan akun GitHub dan upload CV untuk melihat profil skill.{" "}
                        <Link href="/dashboard/onboarding" className="font-semibold text-primary hover:underline">
                            Mulai onboarding →
                        </Link>
                    </EmptyState>
                </div>
            </div>
        );
    }

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
    const verifiedPct = mergedSkills.length > 0 ? Math.round((ghBacked / mergedSkills.length) * 100) : 0;

    return (
        <div className="w-full">
            <PageHeader
                crumb="dasbor / profil"
                title="Profil & skill"
                sub={`Sync terakhir ${updatedAt}. Skill digabung dari GitHub + CV, ditandai berdasarkan sumbernya.`}
                right={
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/cv-generator" className="text-[12.5px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            Buat CV
                        </Link>
                        <Link href="/dashboard/onboarding" className="text-[12.5px] font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            Sync ulang
                        </Link>
                    </div>
                }
            />

            {/* GitHub identity + stat strip */}
            <Reveal delay={0.05}>
                <div className="grid grid-cols-2 border-y border-border md:grid-cols-4">
                    {[
                        { k: "Repos", v: profile.github_signals?.public_repos ?? 0 },
                        { k: "Followers", v: profile.github_signals?.followers ?? 0 },
                        { k: "Stars", v: profile.github_signals?.stars ?? 0 },
                        { k: "Skill total", v: mergedSkills.length },
                    ].map((s, i) => (
                        <div
                            key={s.k}
                            className={`px-5 py-4 ${i > 0 ? "border-l border-border max-md:[&:nth-child(3)]:border-l-0" : ""} max-md:[&:nth-child(n+3)]:border-t max-md:[&:nth-child(n+3)]:border-border`}
                        >
                            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{s.k}</p>
                            <p className="mt-1 font-mono text-[28px] font-semibold tabular-nums tracking-tight">
                                <CountUp value={s.v} />
                            </p>
                        </div>
                    ))}
                </div>
                {profile.github_username && (
                    <a
                        href={`https://github.com/${profile.github_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block font-mono text-[12px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        github.com/{profile.github_username} ↗
                    </a>
                )}
            </Reveal>

            {/* Verifikasi + bahasa */}
            <div className="grid gap-10 pt-8 lg:grid-cols-[4fr_8fr]">
                <Reveal delay={0.12}>
                    <section aria-label="Verifikasi skill">
                        <SecTitle title="Skill terverifikasi" meta="GitHub-backed" />
                        <div className="pt-4">
                            <div className="flex items-baseline gap-2">
                                <CountUp value={verifiedPct} className="font-mono text-[44px] font-semibold leading-none tracking-tight" />
                                <span className="font-mono text-lg text-muted-foreground">%</span>
                            </div>
                            <BarFill pct={verifiedPct} tone={verifiedPct >= 60 ? "success" : "primary"} className="mt-3 w-full max-w-[240px]" />
                            <p className="mt-2 font-mono text-[11.5px] text-muted-foreground">
                                {ghBacked}/{mergedSkills.length} skill terbukti dari aktivitas repo
                            </p>
                        </div>
                    </section>
                </Reveal>

                {sortedLangs.length > 0 && (
                    <Reveal delay={0.19}>
                        <section aria-label="Bahasa pemrograman">
                            <SecTitle title="Bahasa pemrograman" meta={`${sortedLangs.length} bahasa`} />
                            <div className="mt-4 flex h-3 gap-px overflow-hidden rounded-sm">
                                {sortedLangs.slice(0, 8).map(([lang, bytes]) => {
                                    const pct = Math.round((bytes / totalBytes) * 100);
                                    return (
                                        <div
                                            key={lang}
                                            className="h-full transition-all"
                                            style={{ width: `${Math.max(pct, 2)}%`, background: LANG_COLORS[lang] ?? "hsl(var(--primary))" }}
                                            title={`${lang} · ${pct}%`}
                                        />
                                    );
                                })}
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
                                {sortedLangs.slice(0, 8).map(([lang, bytes]) => {
                                    const pct = Math.round((bytes / totalBytes) * 100);
                                    return (
                                        <div key={lang} className="flex items-center gap-2 text-[12.5px]">
                                            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: LANG_COLORS[lang] ?? "hsl(var(--primary))" }} />
                                            <span className="truncate">{lang}</span>
                                            <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </Reveal>
                )}
            </div>

            {/* Semua skill */}
            <Reveal delay={0.26} className="pt-10">
                <section aria-label="Semua skill">
                    <SecTitle title="Semua skill" meta={`${mergedSkills.length} total · GitHub + CV`} />
                    <div className="flex flex-wrap gap-4 pt-3 font-mono text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-success" /> keduanya ({bySource.both.length})</span>
                        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" /> github ({bySource.github.length})</span>
                        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted-foreground" /> cv ({bySource.cv.length})</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                        {[...bySource.both, ...bySource.github, ...bySource.cv].map((s) => (
                            <SkillTag key={s} skill={s} source={getSource(s)} />
                        ))}
                    </div>
                </section>
            </Reveal>

            {/* Perlu diperkuat */}
            {gap && gap.weak_skills.length > 0 && (
                <Reveal delay={0.33} className="pt-10">
                    <section aria-label="Skill perlu diperkuat">
                        <SecTitle title="Perlu diperkuat" meta={`${gap.weak_skills.length} belum terverifikasi`} />
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {gap.weak_skills.map((s) => (
                                <span key={s} className="rounded-md border border-warning/40 px-2 py-1 text-[12px] text-warning">{s}</span>
                            ))}
                        </div>
                        <p className="mt-3 border-l-2 border-warning/50 pl-3 text-[12.5px] leading-relaxed text-muted-foreground">
                            Buat project open-source yang memakai teknologi ini. Recruiter lebih percaya bukti kode dibanding klaim di CV.
                        </p>
                    </section>
                </Reveal>
            )}

            {/* CTA */}
            <Reveal delay={0.4} className="pt-10">
                <div className="grid gap-px border-t border-border sm:grid-cols-2">
                    {[
                        { t: "Skill gap analysis", d: "Lihat skill yang belum dikuasai", href: "/dashboard/skill-gap" },
                        { t: "Rekomendasi job", d: "Job yang cocok dengan skillmu", href: "/dashboard/jobs/recommended" },
                    ].map((c, i) => (
                        <Link
                            key={c.href}
                            href={c.href}
                            className={`group flex items-center justify-between py-4 transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5 ${i === 1 ? "sm:border-l sm:border-border" : ""}`}
                        >
                            <span>
                                <span className="block text-[14px] font-semibold">{c.t}</span>
                                <span className="mt-0.5 block text-xs text-muted-foreground">{c.d}</span>
                            </span>
                            <span className="font-mono text-[13px] font-semibold text-primary transition-transform group-hover:translate-x-1">→</span>
                        </Link>
                    ))}
                </div>
            </Reveal>
        </div>
    );
}
