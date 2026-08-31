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
import { interestLabel } from "@/utils/constants/interests";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

type SkillDemand = { skill: string; canonical_skill: string; job_count: number };

type Gap = {
    has_profile: boolean;
    readiness: { ready_jobs: number; relevant_jobs: number; median_coverage_pct: number; threshold_pct: number };
    mode_info: { requested: string; effective: string; fallback_reason: string | null };
    missing_skill_count: number;
    missing_skills: string[];
    missing_demand: SkillDemand[];
    unproven_demand: SkillDemand[];
    user_skill_count: number;
    market_skill_count: number;
    github_backed_count: number;
    verified_skill_count: number;
    interests: string[];
};

const SKILL_CATEGORY: Record<string, string> = {
    javascript: "Frontend", typescript: "Frontend", react: "Frontend", vue: "Frontend",
    angular: "Frontend", svelte: "Frontend", "next.js": "Frontend", "nuxt.js": "Frontend",
    html: "Frontend", css: "Frontend", "tailwind css": "Frontend", rxjs: "Frontend", vite: "Frontend",
    python: "Backend", "node.js": "Backend", go: "Backend", java: "Backend", php: "Backend",
    rust: "Backend", kotlin: "Backend", "spring boot": "Backend", fastapi: "Backend",
    django: "Backend", flask: "Backend", laravel: "Backend", "express.js": "Backend",
    "rest api": "Backend", graphql: "Backend", grpc: "Backend", kafka: "Backend", rabbitmq: "Backend",
    postgresql: "Database", mysql: "Database", mongodb: "Database", redis: "Database",
    sqlite: "Database", sql: "Database", "sql server": "Database", elasticsearch: "Database", bigquery: "Database",
    docker: "DevOps/Cloud", kubernetes: "DevOps/Cloud", aws: "DevOps/Cloud", gcp: "DevOps/Cloud",
    azure: "DevOps/Cloud", linux: "DevOps/Cloud", "ci/cd": "DevOps/Cloud", terraform: "DevOps/Cloud",
    bash: "DevOps/Cloud", nginx: "DevOps/Cloud", prometheus: "DevOps/Cloud", grafana: "DevOps/Cloud",
    "machine learning": "AI/ML", "deep learning": "AI/ML", tensorflow: "AI/ML", pytorch: "AI/ML",
    "scikit-learn": "AI/ML", nlp: "AI/ML", "computer vision": "AI/ML", pandas: "AI/ML",
    transformers: "AI/ML", opencv: "AI/ML", mlflow: "AI/ML",
    flutter: "Mobile", dart: "Mobile", "react native": "Mobile", android: "Mobile",
    swift: "Mobile", ios: "Mobile", firebase: "Mobile", xcode: "Mobile",
    git: "Tools", postman: "Tools", figma: "Tools", jira: "Tools", selenium: "Tools",
    playwright: "Tools", cypress: "Tools", pytest: "Tools", jest: "Tools", excel: "Tools",
};

function getCategory(canonical: string): string {
    return SKILL_CATEGORY[canonical] ?? "Lainnya";
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
    const [mode, setMode] = useState<"auto" | "all">("auto");
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

    const readiness = data.readiness;
    const missingTotal = data.missing_skill_count;
    const missingDemand = data.missing_demand ?? [];
    const unprovenDemand = data.unproven_demand ?? [];

    if (missingTotal === 0 && unprovenDemand.length === 0)
        return centeredNote("Semua skill terpenuhi", "Skill-mu sudah mencakup semua yang dibutuhkan pasar. Saatnya pilih target job.");

    const readyPct =
        readiness.relevant_jobs > 0
            ? Math.round((readiness.ready_jobs / readiness.relevant_jobs) * 100)
            : 0;
    const readyLabel = readyPct >= 60 ? "Siap melamar" : readyPct >= 30 ? "Sebagian siap" : "Perlu belajar";
    const maxCount = missingDemand.length > 0 ? missingDemand[0].job_count : 1;

    const grouped: Record<string, SkillDemand[]> = {};
    for (const s of missingDemand) {
        const cat = getCategory(s.canonical_skill);
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(s);
    }

    return (
        <div className="w-full">
            <PageHeader
                crumb="dasbor / skill gap"
                title="Skill gap"
                sub="Seberapa siap kamu melamar lowongan relevan, plus skill yang paling dicari tapi belum kamu kuasai."
                right={
                    <div className="flex flex-col items-start gap-2 md:items-end">
                        <div className="font-mono text-[12px] text-muted-foreground">
                            <span className="text-foreground">{data.user_skill_count}</span> skill ·{" "}
                            <span className="text-foreground">{data.verified_skill_count ?? 0}</span> verified ·{" "}
                            <span className="text-warning">{missingTotal}</span> gap
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

            {data.mode_info.fallback_reason && mode !== "all" && (
                <p className="mt-4 border-l-2 border-primary bg-primary/[0.05] px-4 py-2.5 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                        {data.mode_info.fallback_reason === "no_interests"
                            ? "Belum ada bidang minat."
                            : "Belum ada lowongan aktif di bidangmu."}
                    </span>{" "}
                    Menampilkan semua lowongan aktif.{" "}
                    <Link href="/dashboard/onboarding" className="font-semibold text-primary hover:underline">
                        {data.mode_info.fallback_reason === "no_interests" ? "Pilih minat" : "Ubah minat"}
                    </Link>
                </p>
            )}

            {/* Kesiapan: jumlah lowongan siap, bukan persen union skill */}
            <Reveal delay={0.12} className="pt-8">
                <div className="flex flex-col gap-6 border-y border-border py-6 sm:flex-row sm:items-center sm:gap-10">
                    <div className="shrink-0">
                        <div className="flex items-baseline gap-1.5">
                            <CountUp value={readiness.ready_jobs} className="font-mono text-[52px] font-semibold leading-none tracking-tight" />
                            <span className="font-mono text-lg text-muted-foreground">/ {readiness.relevant_jobs}</span>
                        </div>
                        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                            lowongan siap dilamar · {readyLabel}
                        </p>
                        <BarFill
                            pct={readyPct}
                            tone={readyPct >= 60 ? "success" : readyPct >= 30 ? "primary" : "warning"}
                            className="mt-3 w-48"
                        />
                    </div>
                    <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                        Dari <span className="font-mono text-foreground">{readiness.relevant_jobs}</span> lowongan aktif yang relevan,
                        kamu sudah memenuhi minimal{" "}
                        <span className="font-semibold text-foreground">{readiness.threshold_pct}%</span> requirement di{" "}
                        <span className="font-mono text-foreground">{readiness.ready_jobs}</span> lowongan. Median kecocokan{" "}
                        <span className="font-semibold text-foreground">{readiness.median_coverage_pct}%</span>.{" "}
                        <span className="font-mono text-warning">{missingTotal}</span> skill pasar belum kamu miliki.
                        {data.mode_info.effective === "interests" && data.interests.length > 0 && (
                            <span className="mt-2 block text-xs">
                                Bidang: <span className="font-medium text-foreground">{data.interests.map(interestLabel).join(" · ")}</span>
                            </span>
                        )}
                    </p>
                </div>
            </Reveal>

            {/* Prioritas belajar */}
            <Reveal delay={0.19} className="pt-8">
                <SecTitle title="Prioritas belajar" meta="demand" />
                <ul>
                    {missingDemand.map((s, i) => {
                        const pct = Math.round((s.job_count / maxCount) * 100);
                        return (
                            <li key={s.canonical_skill} className="flex items-center gap-4 border-b border-border/60 py-3">
                                <span className="w-5 shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">{i + 1}</span>
                                <span className="min-w-0 flex-1 text-[13.5px] font-semibold">{s.skill}</span>
                                <BarFill pct={pct} className="w-28 shrink-0" />
                                <span className="w-16 shrink-0 text-right font-mono text-[11.5px] tabular-nums text-muted-foreground">
                                    {s.job_count} job
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </Reveal>

            {/* Sudah dimiliki, tapi belum ada bukti GitHub */}
            {unprovenDemand.length > 0 && (
                <Reveal delay={0.23} className="pt-8">
                    <SecTitle title="Sudah dimiliki, belum ada bukti GitHub" meta={`${unprovenDemand.length} skill`} />
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {unprovenDemand.map((s) => (
                            <span key={s.canonical_skill} className="rounded-md border border-warning/40 px-2 py-1 text-[12px] text-warning">
                                {s.skill} <span className="font-mono text-[10.5px] opacity-70">{s.job_count} job</span>
                            </span>
                        ))}
                    </div>
                    <p className="mt-3 border-l-2 border-warning/50 pl-3 text-[12.5px] leading-relaxed text-muted-foreground">
                        Nama skill ini belum muncul di bahasa atau topic repo GitHub-mu. Bukan berarti kamu lemah — bisa jadi kerjanya di repo privat.
                        Publikasikan project kecil agar recruiter melihat buktinya.
                    </p>
                </Reveal>
            )}

            {/* Semua skill per kategori (accordion) */}
            <Reveal delay={0.26} className="pt-8">
                <button
                    type="button"
                    onClick={() => setShowCategories((v) => !v)}
                    aria-expanded={showCategories}
                    className="flex w-full items-center justify-between border-b border-border pb-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <span className="text-[13px] font-bold tracking-tight">
                        {missingTotal} skill belum dimiliki · rincian {missingDemand.length} teratas
                    </span>
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
                                                {skills.map((s, i) => (
                                                    <span key={s.canonical_skill}>
                                                        {i > 0 && <span className="mx-1.5 text-border">·</span>}
                                                        <span className="font-medium text-foreground">{s.skill}</span>
                                                    </span>
                                                ))}
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
