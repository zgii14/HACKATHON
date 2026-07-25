"use client";

// Hallmark · genre: modern-minimal · macrostructure: Workbench (app-surface) · theme: GitHire violet (locked)

import {
    ActionLink,
    AnimatePresence,
    BarFill,
    CountUp,
    EASE_OUT,
    PageHeader,
    Reveal,
    SecTitle,
    motion,
    useReducedMotion,
} from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

type SkillFreq = { skill: string; job_count: number };
type Gap = {
    missing_skills: string[];
    has_profile: boolean;
    skill_freq: SkillFreq[];
    user_skill_count: number;
    total_job_skills: number;
    weak_skills: string[];
    github_backed_count: number;
    mode: string;
    interests: string[];
};

const CATEGORIES: Record<string, string[]> = {
    Frontend: ["javascript", "react", "vue", "angular", "typescript", "html", "css", "tailwind css", "next.js", "nuxt.js"],
    Backend: ["python", "node.js", "go", "java", "php", "spring boot", "fastapi", "django", "laravel", "express.js", "rest api", "graphql"],
    Database: ["postgresql", "mysql", "mongodb", "redis", "sqlite", "sql", "sql server", "elasticsearch"],
    "DevOps/Cloud": ["docker", "kubernetes", "aws", "gcp", "azure", "linux", "ci/cd", "terraform", "bash"],
    "AI/ML": ["machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "nlp", "computer vision", "pandas"],
    Mobile: ["flutter", "dart", "react native", "kotlin", "android", "swift", "ios"],
    Tools: ["git", "postman", "figma", "jira", "nginx", "rabbitmq", "prometheus"],
};

function getCategory(skill: string): string {
    const s = skill.toLowerCase();
    for (const [cat, skills] of Object.entries(CATEGORIES)) {
        if (skills.some((k) => s.includes(k) || k.includes(s))) return cat;
    }
    return "Lainnya";
}

function centeredNote(title: string, children: React.ReactNode) {
    return (
        <div className="mx-auto max-w-md py-16 text-center">
            <p className="text-[15px] font-bold">{title}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{children}</p>
        </div>
    );
}

export default function SkillGapPage() {
    const { withAuth, authReady } = useApi();
    const [mode, setMode] = useState<"auto" | "interests" | "all">("auto");
    const [showCategories, setShowCategories] = useState(false);
    const reduced = useReducedMotion();

    const { data, isLoading, isError } = useQuery({
        queryKey: ["skill-gap", mode],
        queryFn: () => withAuth<Gap>(`/me/skill-gap?mode=${mode}`),
        enabled: authReady,
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return (
            <div className="w-full space-y-4">
                <div className="h-6 w-40 animate-pulse rounded bg-muted/50" />
                <div className="h-40 animate-pulse rounded bg-muted/30" />
                <div className="h-56 animate-pulse rounded bg-muted/30" />
            </div>
        );
    }

    if (isError) return centeredNote("Gagal memuat skill gap", "Terjadi kesalahan saat mengambil data. Silakan muat ulang halaman.");

    if (!data?.has_profile)
        return centeredNote(
            "Profil belum lengkap",
            <>
                Selesaikan{" "}
                <Link href="/dashboard/onboarding" className="font-semibold text-primary hover:underline">
                    onboarding
                </Link>{" "}
                untuk analisis skill gap.
            </>
        );

    const missingSkills = data?.missing_skills || [];
    const skillFreq = data?.skill_freq || [];

    if (missingSkills.length === 0)
        return centeredNote("Semua skill terpenuhi", "Skill-mu sudah mencakup semua yang dibutuhkan pasar. Saatnya pilih target job.");

    const totalSkills = data?.total_job_skills || 1;
    const missing = missingSkills.length;
    const coveragePct = Math.round(((totalSkills - missing) / totalSkills) * 100);
    const weakSet = new Set(data?.weak_skills?.map((s) => s.toLowerCase()) ?? []);

    const topSkills = skillFreq.slice(0, 5);
    const maxCount = topSkills.length > 0 ? topSkills[0].job_count : 1;

    const grouped: Record<string, string[]> = {};
    for (const s of missingSkills) {
        const cat = getCategory(s);
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(s);
    }

    const coverageLabel = coveragePct >= 70 ? "Bagus" : coveragePct >= 40 ? "Cukup" : "Perlu belajar";

    return (
        <div className="w-full">
            <PageHeader
                crumb="dasbor / skill gap"
                title="Skill gap"
                sub="Skill yang paling dicari pasar tapi belum ada di profilmu. Fokus ke yang demand-nya tinggi."
                right={
                    <div className="flex flex-col items-start gap-2 md:items-end">
                        <div className="font-mono text-[12px] text-muted-foreground">
                            <span className="text-foreground">{data.user_skill_count}</span> skill ·{" "}
                            <span className="text-foreground">{data.github_backed_count}</span> verified ·{" "}
                            <span className="text-warning">{missing}</span> gap
                        </div>
                        <ActionLink href="/dashboard/roadmap">Buat roadmap →</ActionLink>
                    </div>
                }
            />

            {/* Mode toggle */}
            <Reveal delay={0.05}>
                <div className="flex items-center justify-between gap-3 pt-5">
                    <div className="flex items-center gap-1 border-b border-border">
                        {(
                            [
                                { key: "auto", label: "Bidangku" },
                                { key: "all", label: "Semua" },
                            ] as const
                        ).map((t) => (
                            <button
                                key={t.key}
                                type="button"
                                onClick={() => setMode(t.key)}
                                aria-current={mode === t.key ? "true" : undefined}
                                className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                                    mode === t.key
                                        ? "border-primary text-foreground"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {t.label}
                                {t.key === "auto" && data?.interests && data.interests.length > 0 && (
                                    <span className="ml-1.5 font-mono text-[10.5px] text-primary">{data.interests.length}</span>
                                )}
                            </button>
                        ))}
                    </div>
                    <Link
                        href="/dashboard/onboarding"
                        className="font-mono text-[11px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        ubah minat →
                    </Link>
                </div>
            </Reveal>

            {data?.interests?.length === 0 && mode !== "all" && (
                <p className="mt-4 border-l-2 border-primary bg-primary/[0.05] px-4 py-2.5 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Belum ada bidang minat.</span>{" "}
                    <Link href="/dashboard/onboarding" className="font-semibold text-primary hover:underline">
                        Pilih minat
                    </Link>{" "}
                    untuk personalisasi rekomendasi.
                </p>
            )}

            {/* Coverage: angka besar + bar, bukan ring */}
            <Reveal delay={0.12} className="pt-8">
                <div className="flex flex-col gap-6 border-y border-border py-6 sm:flex-row sm:items-center sm:gap-10">
                    <div className="shrink-0">
                        <div className="flex items-baseline gap-2">
                            <CountUp value={coveragePct} className="font-mono text-[52px] font-semibold leading-none tracking-tight" />
                            <span className="font-mono text-lg text-muted-foreground">%</span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                            coverage · {coverageLabel}
                        </p>
                        <BarFill pct={coveragePct} tone={coveragePct >= 70 ? "success" : coveragePct >= 40 ? "primary" : "warning"} className="mt-3 w-48" />
                    </div>
                    <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                        Kamu menguasai <span className="font-semibold text-foreground">{coveragePct}%</span> skill yang diminta pasar.{" "}
                        <span className="font-mono text-foreground">{missing}</span> skill belum kamu miliki — mulai dari yang paling
                        banyak dicari untuk menaikkan match score.
                        {data?.mode === "interests" && data.interests.length > 0 && (
                            <span className="mt-2 block text-xs">
                                Bidang: <span className="font-medium text-foreground">{data.interests.join(" · ")}</span>
                            </span>
                        )}
                    </p>
                </div>
            </Reveal>

            {/* Prioritas belajar */}
            <Reveal delay={0.19} className="pt-8">
                <SecTitle title="Prioritas belajar" meta="demand" />
                <ul>
                    {topSkills.map((s, i) => {
                        const pct = Math.round((s.job_count / maxCount) * 100);
                        const isWeak = weakSet.has(s.skill.toLowerCase());
                        return (
                            <li key={s.skill} className="flex items-center gap-4 border-b border-border/60 py-3">
                                <span className="w-5 shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">{i + 1}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="text-[13.5px] font-semibold">{s.skill}</span>
                                    {isWeak && (
                                        <span className="ml-2 rounded-[3px] border border-warning/40 px-1.5 py-px font-mono text-[10px] font-semibold text-warning">
                                            UNVERIFIED
                                        </span>
                                    )}
                                </span>
                                <BarFill pct={pct} className="w-28 shrink-0" />
                                <span className="w-16 shrink-0 text-right font-mono text-[11.5px] tabular-nums text-muted-foreground">
                                    {s.job_count} job
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </Reveal>

            {/* Semua skill per kategori (accordion) */}
            <Reveal delay={0.26} className="pt-8">
                <button
                    type="button"
                    onClick={() => setShowCategories((v) => !v)}
                    aria-expanded={showCategories}
                    className="flex w-full items-center justify-between border-b border-border pb-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <span className="text-[13px] font-bold tracking-tight">Semua {missing} skill per kategori</span>
                    <motion.span
                        aria-hidden="true"
                        className="text-muted-foreground"
                        animate={{ rotate: showCategories ? 90 : 0 }}
                        transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                            <path d="m9 18 6-6-6-6" />
                        </svg>
                    </motion.span>
                </button>
                <AnimatePresence initial={false}>
                    {showCategories && (
                        <motion.div
                            key="cats"
                            className="overflow-hidden"
                            initial={reduced ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: reduced ? 0.12 : 0.3, ease: EASE_OUT }}
                        >
                            <div className="space-y-4 py-4">
                                {Object.entries(grouped)
                                    .sort((a, b) => b[1].length - a[1].length)
                                    .map(([cat, skills]) => (
                                        <div key={cat}>
                                            <div className="mb-1.5 flex items-baseline justify-between">
                                                <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{cat}</span>
                                                <span className="font-mono text-[11px] text-muted-foreground">{skills.length}</span>
                                            </div>
                                            <p className="text-[13px] leading-relaxed">
                                                {skills.map((s, i) => {
                                                    const isWeak = weakSet.has(s.toLowerCase());
                                                    return (
                                                        <span key={s}>
                                                            {i > 0 && <span className="mx-1.5 text-border">·</span>}
                                                            <span className={isWeak ? "font-medium text-warning" : "font-medium text-foreground"}>{s}</span>
                                                        </span>
                                                    );
                                                })}
                                            </p>
                                        </div>
                                    ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Reveal>

            {/* CTA job */}
            <Reveal delay={0.33} className="pt-8">
                <Link
                    href="/dashboard/jobs/recommended"
                    className="group flex items-center justify-between border-t border-border py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <span>
                        <span className="block text-[14px] font-semibold">Lihat job rekomendasi</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">Lowongan yang cocok dengan skillmu saat ini</span>
                    </span>
                    <span className="font-mono text-[13px] font-semibold text-primary transition-transform group-hover:translate-x-1">→</span>
                </Link>
            </Reveal>
        </div>
    );
}
