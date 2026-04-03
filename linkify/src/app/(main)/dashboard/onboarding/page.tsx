"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/use-api";
import { parseApiError } from "@/lib/errors";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Profile = {
    github_username: string | null;
    merged_skills: string[] | null;
    interests: string[] | null;
    updated_at: string | null;
} | null;

type SyncResult = {
    ok: boolean;
    skills_count: number;
    merged_skills: string[];
    skills_changed: boolean;
};

const SYNC_STEPS = [
    "Menghubungi GitHub…",
    "Membaca CV kamu…",
    "Mengekstrak skill dengan AI…",
    "Menghitung skill gap…",
    "Menyimpan profil…",
];

const INTEREST_OPTIONS = [
    { key: "backend",    label: "Backend Development",    emoji: "⚙️" },
    { key: "frontend",   label: "Frontend Development",   emoji: "💻" },
    { key: "fullstack",  label: "Full Stack",             emoji: "🌐" },
    { key: "mobile",     label: "Mobile (Android/iOS)",   emoji: "📱" },
    { key: "ai_ml",      label: "AI / ML & Data Science", emoji: "🤖" },
    { key: "data",       label: "Data Engineering",       emoji: "📊" },
    { key: "devops",     label: "DevOps / Cloud",         emoji: "☁️" },
    { key: "qa",         label: "QA & Testing",           emoji: "🧪" },
    { key: "security",   label: "Cybersecurity",          emoji: "🔒" },
    { key: "blockchain", label: "Blockchain / Web3",      emoji: "⛓️" },
    { key: "game",       label: "Game / AR/VR",           emoji: "🎮" },
    { key: "iot",        label: "IoT & Embedded",         emoji: "🔌" },
];

export default function OnboardingPage() {
    const [githubUrl, setGithubUrl] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [showInterestSurvey, setShowInterestSurvey] = useState(false);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const { getToken } = useAuth();
    const { withAuth, isLoaded, isSignedIn } = useApi();
    const qc = useQueryClient();
    const router = useRouter();

    const { data: existingProfile } = useQuery({
        queryKey: ["profile"],
        queryFn: () => withAuth<Profile>("/me/profile"),
        enabled: isLoaded && isSignedIn,
    });

    const hasExistingProfile = !!existingProfile?.merged_skills?.length;

    const toggleInterest = (key: string) => {
        setSelectedInterests((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    const saveInterests = useMutation({
        mutationFn: () => withAuth("/me/interests", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ interests: selectedInterests }),
        }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["profile"] });
            qc.invalidateQueries({ queryKey: ["skill-gap"] });
            // Tampilkan success screen setelah pilih minat
            setShowInterestSurvey(false);
            setShowSuccess(true);
        },
        onError: () => {
            toast.error("Gagal menyimpan minat. Coba lagi.");
        },
    });

    const sync = useMutation({
        mutationFn: async (): Promise<SyncResult> => {
            if (!file || !githubUrl.trim()) {
                throw new Error("GitHub URL dan file PDF wajib diisi");
            }
            const token = await getToken();
            const fd = new FormData();
            fd.append("github_url", githubUrl.trim());
            fd.append("cv", file);

            let i = 0;
            const interval = setInterval(() => {
                i = (i + 1) % SYNC_STEPS.length;
                setStepIndex(i);
            }, 1800);

            try {
                const res = await fetch(`${API_BASE.replace(/\/$/, "")}/profiles/sync`, {
                    method: "POST",
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    body: fd,
                });
                clearInterval(interval);
                if (!res.ok) {
                    const message = await parseApiError(res);
                    throw new Error(message);
                }
                return res.json();
            } catch (err) {
                clearInterval(interval);
                throw err;
            }
        },
        onSuccess: (result) => {
            setShowConfirm(false);
            qc.invalidateQueries({ queryKey: ["profile"] });
            qc.invalidateQueries({ queryKey: ["me"] });
            qc.invalidateQueries({ queryKey: ["skill-gap"] });
            qc.invalidateQueries({ queryKey: ["jobs", "recommended"] });
            setSyncResult(result);

            // Jika profil baru atau belum punya interests → tampilkan survei
            if (!hasExistingProfile || !existingProfile?.interests?.length) {
                setSelectedInterests(existingProfile?.interests ?? []);
                setShowInterestSurvey(true);
            } else {
                // Sudah punya interests → langsung success screen
                setShowSuccess(true);
            }
        },
        onError: (e: Error) => {
            setShowConfirm(false);
            toast.error(e.message);
        },
    });

    const handleSyncClick = () => {
        if (!githubUrl.trim() || !file) {
            toast.error("GitHub URL dan file PDF wajib diisi");
            return;
        }
        if (hasExistingProfile) {
            setShowConfirm(true);
        } else {
            setStepIndex(0);
            sync.mutate();
        }
    };

    const confirmSync = () => {
        setStepIndex(0);
        sync.mutate();
    };

    // ── Tahap 3: Success Screen ───────────────────────────────────────────
    if (showSuccess) {
        const skillCount = syncResult?.skills_count ?? existingProfile?.merged_skills?.length ?? 0;
        return (
            <div className="max-w-lg space-y-6">
                {/* Header */}
                <div className="text-center py-4 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold">Profil berhasil disinkronkan!</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            {skillCount} skill terdeteksi dari GitHub dan CV-mu.
                        </p>
                    </div>
                </div>

                {/* Next steps */}
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Apa yang bisa kamu lakukan sekarang</p>
                    <div className="grid gap-2">
                        <button
                            onClick={() => router.push("/dashboard/jobs/recommended")}
                            className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all text-left group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                                <Sparkles className="w-5 h-5 text-violet-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">Lihat Job yang Cocok</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Lowongan diurutkan berdasarkan match score-mu</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </button>

                        <button
                            onClick={() => router.push("/dashboard/skill-gap")}
                            className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all text-left group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-5 h-5 text-amber-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">Analisis Skill Gap</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Skill apa yang masih perlu dipelajari</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </button>

                        <button
                            onClick={() => router.push("/dashboard/roadmap")}
                            className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all text-left group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                                <BookOpen className="w-5 h-5 text-blue-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">Buat Roadmap Belajar</p>
                                <p className="text-xs text-muted-foreground mt-0.5">AI-generated, spesifik untuk kondisi skillmu</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => router.push("/dashboard")}
                    className="w-full text-xs text-center text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                    Ke Dashboard →
                </button>
            </div>
        );
    }

    // ── Tahap 2: Interest Survey ────────────────────────────────────────────
    if (showInterestSurvey) {
        return (
            <div className="max-w-lg space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold">Bidang Minat</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Pilih bidang yang ingin kamu tekuni. Skill gap akan difokuskan ke sini,
                        bukan ke semua job di luar bidangmu.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {INTEREST_OPTIONS.map(({ key, label, emoji }) => {
                        const active = selectedInterests.includes(key);
                        return (
                            <button
                                key={key}
                                onClick={() => toggleInterest(key)}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${
                                    active
                                        ? "border-primary bg-primary/10 text-primary font-medium"
                                        : "border-border hover:border-muted-foreground text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <span className="text-base shrink-0">{emoji}</span>
                                <span className="leading-tight">{label}</span>
                            </button>
                        );
                    })}
                </div>

                {selectedInterests.length === 0 && (
                    <p className="text-xs text-amber-500">
                        Pilih minimal 1 bidang agar skill gap lebih relevan.
                    </p>
                )}

                <div className="flex items-center gap-3 pt-2">
                    <Button
                        onClick={() => saveInterests.mutate()}
                        disabled={saveInterests.isPending || selectedInterests.length === 0}
                        className="flex-1"
                    >
                        {saveInterests.isPending ? "Menyimpan…" : "Simpan & Lanjutkan →"}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSuccess(true)}
                        className="text-xs text-muted-foreground"
                    >
                        Lewati
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground">
                    Kamu bisa mengubah pilihan ini kapan saja melalui halaman Skill Gap.
                </p>
            </div>
        );
    }

    // ── Tahap 1: Form Sync ─────────────────────────────────────────────────
    return (
        <div className="max-w-lg space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">
                    {hasExistingProfile ? "Update Profil" : "Onboarding"}
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {hasExistingProfile
                        ? `Profil GitHub @${existingProfile?.github_username} sudah terhubung dengan ${existingProfile?.merged_skills?.length ?? 0} skill.`
                        : "Kami hanya membaca data GitHub publik. Upload CV PDF untuk ekstraksi skill."}
                </p>
            </div>

            {hasExistingProfile && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
                    <RefreshCw className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-medium text-amber-600">Profil sudah ada</p>
                        <p className="text-muted-foreground mt-0.5">
                            Jika skill tidak berubah, progress roadmapmu akan tetap aman.
                            Jika skill berubah, roadmap akan di-generate ulang dari awal.
                        </p>
                    </div>
                </div>
            )}

            {showConfirm && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5 space-y-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-sm">Konfirmasi sync ulang</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Kamu akan men-sync ulang profil{" "}
                                <span className="font-medium">@{existingProfile?.github_username}</span>{" "}
                                yang sudah memiliki{" "}
                                <span className="font-medium">{existingProfile?.merged_skills?.length ?? 0} skill</span>.
                                <br />
                                Jika skill berubah, <span className="text-amber-600 font-medium">progress roadmapmu akan direset</span>.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={confirmSync} disabled={sync.isPending}>
                            Ya, sync ulang
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowConfirm(false)} disabled={sync.isPending}>
                            Batal
                        </Button>
                    </div>
                </div>
            )}

            {sync.isPending && (
                <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30">
                    <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                    <div>
                        <p className="text-sm font-medium animate-pulse">{SYNC_STEPS[stepIndex]}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Proses ini biasanya 10–20 detik</p>
                    </div>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>GitHub + CV</CardTitle>
                    <CardDescription>
                        Tempel URL atau username GitHub dan upload CV kamu dalam format PDF.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="gh">GitHub URL atau username</Label>
                        <Input
                            id="gh"
                            placeholder="https://github.com/octocat"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            disabled={sync.isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cv">CV (hanya PDF)</Label>
                        <Input
                            id="cv"
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            disabled={sync.isPending}
                        />
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            Pastikan CV berbasis teks, bukan hasil scan/foto
                        </p>
                    </div>
                    <Button
                        type="button"
                        disabled={sync.isPending || !githubUrl.trim() || !file}
                        onClick={handleSyncClick}
                        className="w-full sm:w-auto"
                    >
                        {sync.isPending
                            ? "Syncing…"
                            : hasExistingProfile
                            ? "Sync Ulang Profil"
                            : "Mulai Sync Profil"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
