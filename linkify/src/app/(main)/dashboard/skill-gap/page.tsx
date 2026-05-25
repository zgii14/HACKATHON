"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";
import {
    AlertTriangle,
    ArrowUpRight,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Info,
    LayoutGrid,
    ShieldCheck,
    Target,
    Zap,
} from "lucide-react";
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
    "Frontend":     ["javascript", "react", "vue", "angular", "typescript", "html", "css", "tailwind css", "next.js", "nuxt.js"],
    "Backend":      ["python", "node.js", "go", "java", "php", "spring boot", "fastapi", "django", "laravel", "express.js", "rest api", "graphql"],
    "Database":     ["postgresql", "mysql", "mongodb", "redis", "sqlite", "sql", "sql server", "elasticsearch"],
    "DevOps/Cloud": ["docker", "kubernetes", "aws", "gcp", "azure", "linux", "ci/cd", "terraform", "bash"],
    "AI/ML":        ["machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "nlp", "computer vision", "pandas"],
    "Mobile":       ["flutter", "dart", "react native", "kotlin", "android", "swift", "ios"],
    "Tools":        ["git", "postman", "figma", "jira", "nginx", "rabbitmq", "prometheus"],
};

function getCategory(skill: string): string {
    const s = skill.toLowerCase();
    for (const [cat, skills] of Object.entries(CATEGORIES)) {
        if (skills.some((k) => s.includes(k) || k.includes(s))) return cat;
    }
    return "Lainnya";
}

/* ── Coverage ring ── */
function CoverageRing({ pct, size = 140 }: { pct: number; size?: number }) {
    const r = (size - 12) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    const color = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";
    const label = pct >= 70 ? "Bagus!" : pct >= 40 ? "Cukup" : "Perlu belajar";
    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-black/[0.05] dark:text-white/[0.06]" />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-1000" />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-3xl font-bold" style={{ color }}>{pct}%</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">{label}</span>
            </div>
        </div>
    );
}

export default function SkillGapPage() {
    const { withAuth, authReady } = useApi();
    const [mode, setMode] = useState<"auto" | "interests" | "all">("auto");
    const [showCategories, setShowCategories] = useState(false);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["skill-gap", mode],
        queryFn: () => withAuth<Gap>(`/me/skill-gap?mode=${mode}`),
        enabled: authReady,
        staleTime: 5 * 60 * 1000,
    });

    /* Loading */
    if (isLoading) {
        return (
            <div className="space-y-4 max-w-[640px]">
                <div className="h-7 w-40 glass-md rounded-lg animate-pulse" />
                <div className="h-[280px] rounded-2xl border glass-border glass animate-pulse" />
                <div className="h-[200px] rounded-2xl border glass-border glass animate-pulse" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-md mx-auto py-16 text-center space-y-5 text-destructive">
                <AlertTriangle className="w-10 h-10 mx-auto opacity-80" />
                <h2 className="font-semibold text-lg">Gagal Memuat Skill Gap</h2>
                <p className="text-sm">Terjadi kesalahan saat mengambil data skill gap. Silakan coba lagi.</p>
            </div>
        );
    }

    /* No profile */
    if (!data?.has_profile) {
        return (
            <div className="max-w-md mx-auto py-16 text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl glass-lg border glass-border mx-auto flex items-center justify-center">
                    <LayoutGrid className="w-7 h-7 text-muted-foreground/60" />
                </div>
                <h2 className="font-semibold text-lg">Profil belum lengkap</h2>
                <p className="text-sm text-muted-foreground">
                    Selesaikan <Link href="/dashboard/onboarding" className="text-primary underline">onboarding</Link> untuk analisis skill gap.
                </p>
            </div>
        );
    }

    const missingSkills = data?.missing_skills || [];
    const skillFreq = data?.skill_freq || [];

    /* All covered */
    if (missingSkills.length === 0) {
        return (
            <div className="max-w-md mx-auto py-16 text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/[0.1] border border-emerald-500/20 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                </div>
                <h2 className="font-semibold text-lg">Semua skill terpenuhi</h2>
                <p className="text-sm text-muted-foreground">Skill-mu sudah mencakup semua yang dibutuhkan pasar.</p>
            </div>
        );
    }

    const totalSkills = data?.total_job_skills || 1;
    const missing = missingSkills.length;
    const coveragePct = Math.round(((totalSkills - missing) / totalSkills) * 100);
    const weakSet = new Set(data?.weak_skills?.map((s) => s.toLowerCase()) ?? []);

    // Top skills — prioritized by demand, mark if unverified
    const topSkills = skillFreq.slice(0, 5);
    const maxCount = topSkills.length > 0 ? topSkills[0].job_count : 1;

    // Group by category (for expandable section)
    const grouped: Record<string, string[]> = {};
    for (const s of missingSkills) {
        const cat = getCategory(s);
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(s);
    }

    return (
        <div className="space-y-5 max-w-[640px]">

            {/* Header + CTA — CTA langsung di atas */}
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Skill Gap</h1>
                    <p className="text-xs text-muted-foreground mt-1">
                        {data.user_skill_count} skill · {data.github_backed_count} verified · {missing} gap
                    </p>
                </div>
                <Button size="sm" asChild className="shrink-0 shadow-lg shadow-primary/20">
                    <Link href="/dashboard/roadmap">
                        <BookOpen className="w-3.5 h-3.5 mr-1.5" /> Buat Roadmap
                    </Link>
                </Button>
            </div>

            {/* Mode tabs */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 rounded-xl glass-md border glass-border">
                    <button
                        onClick={() => setMode("auto")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === "auto" ? "bg-background dark:bg-white/[0.1] shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Bidangku
                        {data?.interests && data.interests.length > 0 && mode !== "all" && (
                            <span className="ml-1.5 px-1.5 py-0.5 bg-primary/[0.1] text-primary rounded text-[10px]">{data.interests.length}</span>
                        )}
                    </button>
                    <button
                        onClick={() => setMode("all")}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === "all" ? "bg-background dark:bg-white/[0.1] shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Semua
                    </button>
                </div>
                <Link href="/dashboard/onboarding" className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                    Ubah minat
                </Link>
            </div>

            {/* No interests banner */}
            {data?.interests?.length === 0 && mode !== "all" && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl border border-primary/20 bg-primary/[0.04]">
                    <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Belum ada bidang minat.</span>{" "}
                        <Link href="/dashboard/onboarding" className="text-primary underline">Pilih minat</Link> untuk personalisasi.
                    </p>
                </div>
            )}

            {/* ═══ MAIN CARD: Coverage + Top Skills ═══ */}
            <div className="rounded-2xl border glass-border glass p-6 space-y-6">

                {/* Coverage ring + summary text */}
                <div className="flex items-center gap-6">
                    <CoverageRing pct={coveragePct} />
                    <div className="space-y-1.5">
                        <p className="text-sm font-medium">
                            Kamu menguasai <span className="text-foreground font-bold">{coveragePct}%</span> skill yang diminta pasar
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {missing} skill belum kamu miliki. Fokus ke yang paling banyak dicari untuk meningkatkan peluang.
                        </p>
                        {data?.mode === "interests" && data.interests.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap pt-1">
                                {data.interests.map((i) => (
                                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-primary/[0.08] text-primary font-medium">{i}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t glass-divider" />

                {/* Top 5 skill yang harus dipelajari */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold flex items-center gap-1.5">
                            <Target className="w-4 h-4 text-amber-400" />
                            Prioritas Belajar
                        </h2>
                        <span className="text-[10px] text-muted-foreground">demand</span>
                    </div>

                    {topSkills.map((s, i) => {
                        const pct = Math.round((s.job_count / maxCount) * 100);
                        const isWeak = weakSet.has(s.skill.toLowerCase());
                        return (
                            <div key={s.skill} className="flex items-center gap-3">
                                <span className="w-5 h-5 rounded-md glass-md border glass-border flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">
                                    {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className="text-sm font-medium truncate">{s.skill}</span>
                                        {isWeak && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/[0.1] text-amber-500 font-medium shrink-0">
                                                unverified
                                            </span>
                                        )}
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-700"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">{s.job_count} job</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ═══ EXPANDABLE: Detail per kategori ═══ */}
            <div className="rounded-2xl border glass-border glass overflow-hidden">
                <button
                    onClick={() => setShowCategories(!showCategories)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-violet-400" />
                        <span className="text-sm font-semibold">Semua {missing} skill per kategori</span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showCategories ? "rotate-180" : ""}`} />
                </button>

                {showCategories && (
                    <div className="border-t glass-divider p-4 space-y-3">
                        {Object.entries(grouped)
                            .sort((a, b) => b[1].length - a[1].length)
                            .map(([cat, skills]) => (
                                <div key={cat}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-xs font-semibold">{cat}</span>
                                        <span className="text-[10px] text-muted-foreground">{skills.length}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {skills.map((s) => {
                                            const isWeak = weakSet.has(s.toLowerCase());
                                            return (
                                                <span
                                                    key={s}
                                                    className={`text-[11px] px-2 py-0.5 rounded-md border ${
                                                        isWeak
                                                            ? "border-amber-500/20 text-amber-500 bg-amber-500/[0.05]"
                                                            : "glass-border text-muted-foreground glass"
                                                    }`}
                                                >
                                                    {s}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* ═══ JOB CTA ═══ */}
            <Link href="/dashboard/jobs/recommended" className="block group">
                <div className="rounded-2xl border glass-border glass p-4 flex items-center justify-between transition-all duration-300 hover:glass-border-hover hover:shadow-xl hover:-translate-y-0.5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Zap className="w-3.5 h-3.5 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Lihat Job Rekomendasi</p>
                            <p className="text-[11px] text-muted-foreground">Lowongan yang cocok dengan skillmu saat ini</p>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </div>
            </Link>
        </div>
    );
}
