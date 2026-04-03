"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Info, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
    Bar,
    BarChart,
    Cell,
    RadialBar,
    RadialBarChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

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

// Kategorisasi skill ke domain
const CATEGORIES: Record<string, string[]> = {
    "Frontend":    ["javascript", "react", "vue", "angular", "typescript", "html", "css", "tailwind css", "next.js", "nuxt.js"],
    "Backend":     ["python", "node.js", "go", "java", "php", "spring boot", "fastapi", "django", "laravel", "express.js", "rest api", "graphql"],
    "Database":    ["postgresql", "mysql", "mongodb", "redis", "sqlite", "sql", "sql server", "elasticsearch"],
    "DevOps/Cloud":["docker", "kubernetes", "aws", "gcp", "azure", "linux", "ci/cd", "terraform", "bash"],
    "AI/ML":       ["machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "nlp", "computer vision", "pandas"],
    "Mobile":      ["flutter", "dart", "react native", "kotlin", "android", "swift", "ios"],
    "Tools":       ["git", "postman", "figma", "jira", "nginx", "rabbitmq", "prometheus"],
};

function getCategory(skill: string): string {
    const s = skill.toLowerCase();
    for (const [cat, skills] of Object.entries(CATEGORIES)) {
        if (skills.some((k) => s.includes(k) || k.includes(s))) return cat;
    }
    return "Lainnya";
}

function getCoverageColor(pct: number) {
    if (pct >= 70) return "#22c55e";
    if (pct >= 40) return "#f59e0b";
    return "#ef4444";
}

const BAR_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#818cf8", "#7c3aed"];

export default function SkillGapPage() {
    const { withAuth, isLoaded, isSignedIn } = useApi();
    const [mode, setMode] = useState<"auto" | "interests" | "all">("auto");

    const { data, isLoading } = useQuery({
        queryKey: ["skill-gap", mode],
        queryFn: () => withAuth<Gap>(`/me/skill-gap?mode=${mode}`),
        enabled: isLoaded && isSignedIn,
        staleTime: 5 * 60 * 1000, // 5 menit
    });

    if (isLoading) {
        return (
            <div className="flex items-center gap-3 text-sm text-muted-foreground animate-pulse py-8">
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                Menganalisis skill gap…
            </div>
        );
    }

    if (!data?.has_profile) {
        return (
            <div className="max-w-md py-8 text-center space-y-3">
                <LayoutGrid className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                <h2 className="font-semibold text-lg">Profil belum lengkap</h2>
                <p className="text-sm text-muted-foreground">
                    Selesaikan <Link href="/dashboard/onboarding" className="underline">onboarding</Link> terlebih dahulu
                    agar kami bisa menganalisis skill gap kamu.
                </p>
            </div>
        );
    }

    if (data.missing_skills.length === 0) {
        return (
            <div className="max-w-md py-8 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
                <h2 className="font-semibold text-lg">Semua skill terpenuhi</h2>
                <p className="text-sm text-muted-foreground">
                    Kamu sudah memiliki semua skill yang dibutuhkan dari lowongan yang tersedia.
                </p>
            </div>
        );
    }

    // Stats
    const totalSkills = data.total_job_skills || 1;
    const userHas = data.user_skill_count;
    const missing = data.missing_skills.length;
    const coveragePct = Math.round(((totalSkills - missing) / totalSkills) * 100);

    // Top 10 skills untuk bar chart
    const topSkills = data.skill_freq.slice(0, 10).map((item, i) => ({
        ...item,
        fill: BAR_COLORS[i % BAR_COLORS.length],
    }));

    // Radial chart data
    const radialData = [{ name: "Coverage", value: coveragePct, fill: getCoverageColor(coveragePct) }];

    // Group by category
    const grouped: Record<string, string[]> = {};
    for (const s of data.missing_skills) {
        const cat = getCategory(s);
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(s);
    }

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold">Skill Gap Analisis</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Skill yang paling banyak dibutuhkan industri, tapi belum kamu kuasai.
                </p>
            </div>

            {/* ── Mode tab ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                    <button
                        onClick={() => setMode("auto")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            mode === "auto"
                                ? "bg-background shadow text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Bidangku
                        {data?.interests && data.interests.length > 0 && mode !== "all" && (
                            <span className="ml-1.5 px-1 py-0.5 bg-primary/10 text-primary rounded text-[10px]">
                                {data.interests.length} minat
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setMode("all")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                            mode === "all"
                                ? "bg-background shadow text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        Semua Bidang
                    </button>
                </div>
                <Link
                    href="/dashboard/onboarding"
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                >
                    Ubah bidang minat
                </Link>
            </div>

            {/* Banner jika belum set interests */}
            {data?.interests?.length === 0 && mode !== "all" && (
                <div className="flex items-start gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
                    <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-sm">
                        <span className="font-medium">Belum ada bidang minat yang dipilih.</span>{" "}
                        <span className="text-muted-foreground">
                            Skill gap ini mencakup semua job.{" "}
                        </span>
                        <Link href="/dashboard/onboarding" className="text-primary underline text-xs">
                            Pilih bidang minatmu
                        </Link>
                        {" "}untuk mempersionalkannya.
                    </div>
                </div>
            )}

            {/* Mode badge */}
            {data?.mode === "interests" && data.interests.length > 0 && (
                <p className="text-xs text-muted-foreground">
                    Menampilkan gap berdasarkan bidang:{" "}
                    {data.interests.map((i) => (
                        <span key={i} className="inline-block px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] mr-1 font-medium">
                            {i}
                        </span>
                    ))}
                </p>
            )}

            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="text-center">
                    <CardContent className="pt-5 pb-4">
                        <p className="text-3xl font-bold text-primary">{userHas}</p>
                        <p className="text-xs text-muted-foreground mt-1">Total skill dimiliki</p>
                    </CardContent>
                </Card>
                <Card className="text-center">
                    <CardContent className="pt-5 pb-4">
                        <p className="text-3xl font-bold text-green-500">{data.github_backed_count ?? 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">Terbukti di GitHub</p>
                    </CardContent>
                </Card>
                <Card className="text-center">
                    <CardContent className="pt-5 pb-4">
                        <p className="text-3xl font-bold text-amber-500">{missing}</p>
                        <p className="text-xs text-muted-foreground mt-1">Skill belum dimiliki</p>
                    </CardContent>
                </Card>
                <Card className="text-center">
                    <CardContent className="pt-5 pb-4">
                        <p className="text-3xl font-bold" style={{ color: getCoverageColor(coveragePct) }}>
                            {coveragePct}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Market coverage</p>
                    </CardContent>
                </Card>
            </div>

            {/* ── Charts row ── */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Radial coverage */}
                <Card className="md:col-span-2">
                    <CardHeader className="pb-0">
                        <CardTitle className="text-sm">Skill Coverage</CardTitle>
                        <CardDescription className="text-xs">% skill market yang sudah kamu kuasai</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center py-2">
                        <div className="relative w-40 h-40">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="65%"
                                    outerRadius="100%"
                                    startAngle={90}
                                    endAngle={-270}
                                    data={radialData}
                                >
                                    <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "hsl(var(--muted))" }} />
                                </RadialBarChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-bold" style={{ color: getCoverageColor(coveragePct) }}>
                                    {coveragePct}%
                                </span>
                                <span className="text-xs text-muted-foreground">covered</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bar chart top skills */}
                <Card className="md:col-span-3">
                    <CardHeader className="pb-1">
                        <CardTitle className="text-sm">Top 10 Skill Paling Dibutuhkan</CardTitle>
                        <CardDescription className="text-xs">Berdasarkan jumlah lowongan yang membutuhkan skill ini</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={topSkills} layout="vertical" margin={{ left: 0, right: 20 }}>
                                <XAxis type="number" hide />
                                <YAxis
                                    type="category"
                                    dataKey="skill"
                                    width={100}
                                    tick={{ fontSize: 11 }}
                                    tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 13) + "…" : v}
                                />
                                <Tooltip
                                    formatter={(v: number) => [`${v} lowongan`, "Dibutuhkan"]}
                                    contentStyle={{ fontSize: 12 }}
                                />
                                <Bar dataKey="job_count" radius={[0, 6, 6, 0]}>
                                    {topSkills.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} fillOpacity={0.85} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* ── Skills by category ── */}
            <div>
                <h2 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wider">
                    Skill Gap per Kategori
                </h2>
                <div className="space-y-3">
                    {Object.entries(grouped)
                        .sort((a, b) => b[1].length - a[1].length)
                        .map(([cat, skills]) => (
                            <Card key={cat}>
                                <CardHeader className="py-3 px-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm">{cat}</CardTitle>
                                        <Badge variant="secondary" className="text-xs">{skills.length} skill</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-4 pb-4 pt-0">
                                    <div className="flex flex-wrap gap-1.5">
                                        {skills.map((s) => {
                                            const freq = data.skill_freq.find((f) => f.skill === s);
                                            return (
                                                <Badge
                                                    key={s}
                                                    variant="outline"
                                                    className="text-xs font-normal gap-1"
                                                >
                                                    {s}
                                                    {freq && freq.job_count > 1 && (
                                                        <span className="text-muted-foreground">·{freq.job_count}</span>
                                                    )}
                                                </Badge>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                </div>
            </div>

            {/* ── ⚠️ Weak Skills: CV-only yang dibutuhkan job ── */}
            {data.weak_skills && data.weak_skills.length > 0 && (
                <Card className="border-orange-500/30 bg-orange-500/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-orange-500">
                            Skill yang Perlu Diperdalam ({data.weak_skills.length})
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                            Skill ini ada di CV-mu tapi <strong>belum terbukti di GitHub</strong>.
                            Buat project atau kontribusi open source untuk memvalidasinya.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-1.5">
                            {data.weak_skills.map((s) => (
                                <Badge
                                    key={s}
                                    variant="outline"
                                    className="text-xs border-orange-400/50 text-orange-500 bg-orange-500/5"
                                >
                                    {s}
                                </Badge>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                            Push project yang menggunakan skill ini ke GitHub publik agar profil kamu lebih kredibel saat apply kerja.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* CTA */}
            <Card className="border-primary/30 bg-primary/5">
                <CardContent className="flex items-center justify-between pt-4 pb-4">
                    <div>
                        <p className="font-medium text-sm">Siap mulai belajar?</p>
                        <p className="text-xs text-muted-foreground">AI akan buatkan roadmap belajar berdasarkan gap ini.</p>
                    </div>
                    <Link
                        href="/dashboard/roadmap"
                        className="shrink-0 text-xs bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Buat Roadmap →
                    </Link>
                </CardContent>
            </Card>

        </div>
    );
}
