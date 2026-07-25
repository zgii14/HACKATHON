"use client";

// Hallmark · genre: modern-minimal · macrostructure: Workbench (app-surface) · theme: GitHire violet (locked)

import { PageHeader, Reveal } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { parseApiError } from "@/lib/errors";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
    { key: "backend", label: "Backend Development", emoji: "⚙️" },
    { key: "frontend", label: "Frontend Development", emoji: "💻" },
    { key: "fullstack", label: "Full Stack", emoji: "🌐" },
    { key: "mobile", label: "Mobile (Android/iOS)", emoji: "📱" },
    { key: "ai_ml", label: "AI / ML & Data Science", emoji: "🤖" },
    { key: "data", label: "Data Engineering", emoji: "📊" },
    { key: "devops", label: "DevOps / Cloud", emoji: "☁️" },
    { key: "qa", label: "QA & Testing", emoji: "🧪" },
    { key: "security", label: "Cybersecurity", emoji: "🔒" },
    { key: "blockchain", label: "Blockchain / Web3", emoji: "⛓️" },
    { key: "game", label: "Game / AR/VR", emoji: "🎮" },
    { key: "iot", label: "IoT & Embedded", emoji: "🔌" },
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
    const { withAuth, authReady } = useApi();
    const qc = useQueryClient();
    const router = useRouter();

    const { data: existingProfile, isFetched: profileFetched } = useQuery({
        queryKey: ["profile"],
        queryFn: () => withAuth<Profile>("/me/profile"),
        enabled: authReady,
    });

    const hasExistingProfile = !!existingProfile?.merged_skills?.length;

    const toggleInterest = (key: string) => {
        setSelectedInterests((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    };

    const saveInterests = useMutation({
        mutationFn: () =>
            withAuth("/me/interests", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ interests: selectedInterests }),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["profile"] });
            qc.invalidateQueries({ queryKey: ["skill-gap"] });
            setShowInterestSurvey(false);
            setShowSuccess(true);
        },
        onError: () => toast.error("Gagal menyimpan minat. Coba lagi."),
    });

    const sync = useMutation({
        mutationFn: async (): Promise<SyncResult> => {
            if (!file || !githubUrl.trim()) throw new Error("GitHub URL dan file PDF wajib diisi");
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
                if (!res.ok) throw new Error(await parseApiError(res));
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
            if (!hasExistingProfile || !existingProfile?.interests?.length) {
                setSelectedInterests(existingProfile?.interests ?? []);
                setShowInterestSurvey(true);
            } else {
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
        if (!authReady || !profileFetched) {
            toast.error("Sedang memuat profil, tunggu sebentar lalu coba lagi.");
            return;
        }
        if (hasExistingProfile) setShowConfirm(true);
        else {
            setStepIndex(0);
            sync.mutate();
        }
    };

    const confirmSync = () => {
        setStepIndex(0);
        sync.mutate();
    };

    // ── Tahap 3: sukses ──
    if (showSuccess) {
        const skillCount = syncResult?.skills_count ?? existingProfile?.merged_skills?.length ?? 0;
        const steps = [
            { t: "Lihat job yang cocok", d: "Lowongan diurutkan berdasarkan match score-mu", href: "/dashboard/jobs/recommended" },
            { t: "Analisis skill gap", d: "Skill apa yang masih perlu dipelajari", href: "/dashboard/skill-gap" },
            { t: "Buat roadmap belajar", d: "AI-generated, spesifik untuk kondisi skillmu", href: "/dashboard/roadmap" },
        ];
        return (
            <div className="w-full max-w-2xl">
                <PageHeader crumb="dasbor / onboarding / selesai" title="Profil berhasil disinkronkan" sub={`${skillCount} skill terdeteksi dari GitHub dan CV-mu.`} />
                <Reveal delay={0.07} className="pt-6">
                    <p className="font-mono text-[11px] uppercase tracking-[0.07em] text-muted-foreground">Langkah selanjutnya</p>
                    <div className="mt-2 border-t border-border">
                        {steps.map((s) => (
                            <button
                                key={s.href}
                                onClick={() => router.push(s.href)}
                                className="group flex w-full items-center justify-between border-b border-border/60 py-4 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                            >
                                <span>
                                    <span className="block text-[14px] font-semibold">{s.t}</span>
                                    <span className="mt-0.5 block text-xs text-muted-foreground">{s.d}</span>
                                </span>
                                <span className="font-mono text-[13px] font-semibold text-primary transition-transform group-hover:translate-x-1">→</span>
                            </button>
                        ))}
                    </div>
                    <button onClick={() => router.push("/dashboard")} className="mt-5 font-mono text-[12px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        ke dashboard →
                    </button>
                </Reveal>
            </div>
        );
    }

    // ── Tahap 2: minat ──
    if (showInterestSurvey) {
        return (
            <div className="w-full max-w-2xl">
                <PageHeader
                    crumb="dasbor / onboarding / minat"
                    title="Bidang minat"
                    sub="Pilih bidang yang ingin kamu tekuni. Skill gap difokuskan ke sini, bukan ke semua job di luar bidangmu."
                />
                <Reveal delay={0.07} className="pt-6">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {INTEREST_OPTIONS.map(({ key, label, emoji }) => {
                            const active = selectedInterests.includes(key);
                            return (
                                <button
                                    key={key}
                                    onClick={() => toggleInterest(key)}
                                    aria-pressed={active}
                                    className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                        active
                                            ? "border-primary/50 bg-primary/[0.08] font-semibold text-primary"
                                            : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <span className="shrink-0 text-base">{emoji}</span>
                                    <span className="leading-tight">{label}</span>
                                </button>
                            );
                        })}
                    </div>
                    {selectedInterests.length === 0 && (
                        <p className="mt-3 font-mono text-[11.5px] text-warning">Pilih minimal 1 bidang agar skill gap lebih relevan.</p>
                    )}
                    <div className="mt-6 flex items-center gap-4">
                        <button
                            onClick={() => saveInterests.mutate()}
                            disabled={saveInterests.isPending || selectedInterests.length === 0}
                            className="rounded-md bg-primary px-5 py-2.5 text-[12.5px] font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                            {saveInterests.isPending ? "Menyimpan…" : "Simpan & lanjutkan →"}
                        </button>
                        <button onClick={() => setShowSuccess(true)} className="text-[12.5px] font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            Lewati
                        </button>
                    </div>
                    <p className="mt-4 text-[11.5px] text-muted-foreground">Kamu bisa mengubah pilihan ini kapan saja lewat halaman Skill Gap.</p>
                </Reveal>
            </div>
        );
    }

    // ── Tahap 1: form sync ──
    return (
        <div className="w-full max-w-2xl">
            <PageHeader
                crumb="dasbor / onboarding"
                title={hasExistingProfile ? "Update profil" : "Onboarding"}
                sub={
                    hasExistingProfile
                        ? `Profil GitHub @${existingProfile?.github_username} sudah terhubung dengan ${existingProfile?.merged_skills?.length ?? 0} skill.`
                        : "Kami hanya membaca data GitHub publik. Upload CV PDF untuk ekstraksi skill."
                }
            />

            <Reveal delay={0.06} className="pt-6">
                {hasExistingProfile && (
                    <p className="mb-5 border-l-2 border-warning/50 bg-warning/[0.05] px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground">Profil sudah ada.</span> Jika skill tidak berubah, progress roadmapmu tetap aman.
                        Jika skill berubah, roadmap di-generate ulang dari awal.
                    </p>
                )}

                {showConfirm && (
                    <div className="mb-5 border-l-2 border-warning bg-warning/[0.06] px-4 py-3">
                        <p className="text-[13px] font-semibold">Konfirmasi sync ulang</p>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
                            Kamu akan men-sync ulang profil <span className="font-medium text-foreground">@{existingProfile?.github_username}</span> dengan{" "}
                            <span className="font-medium text-foreground">{existingProfile?.merged_skills?.length ?? 0} skill</span>. Jika skill berubah,{" "}
                            <span className="font-medium text-warning">progress roadmapmu akan direset</span>.
                        </p>
                        <div className="mt-3 flex gap-4">
                            <button
                                onClick={confirmSync}
                                disabled={sync.isPending}
                                className="rounded-md bg-primary px-3.5 py-2 text-[12px] font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                Ya, sync ulang
                            </button>
                            <button onClick={() => setShowConfirm(false)} disabled={sync.isPending} className="text-[12px] font-semibold text-muted-foreground hover:text-foreground">
                                Batal
                            </button>
                        </div>
                    </div>
                )}

                {sync.isPending && (
                    <div className="mb-5 flex items-center gap-3 border border-border px-4 py-3">
                        <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <div>
                            <p className="font-mono text-[13px] font-medium">{SYNC_STEPS[stepIndex]}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">biasanya 10–20 detik</p>
                        </div>
                    </div>
                )}

                {/* Form */}
                <div className="space-y-5">
                    <div>
                        <label htmlFor="gh" className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                            GitHub URL atau username
                        </label>
                        <input
                            id="gh"
                            placeholder="https://github.com/octocat"
                            value={githubUrl}
                            onChange={(e) => setGithubUrl(e.target.value)}
                            disabled={sync.isPending}
                            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:opacity-50"
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">CV (hanya PDF)</label>
                        <label
                            htmlFor="cv"
                            className={`flex w-full cursor-pointer items-center justify-center rounded-md border-2 border-dashed px-4 py-5 transition-colors ${
                                file ? "border-success/50 bg-success/[0.05]" : "border-border hover:border-primary/50 hover:bg-muted/30"
                            }`}
                        >
                            {file ? (
                                <div className="flex w-full items-center gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium">{file.name}</p>
                                        <p className="font-mono text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · PDF</p>
                                    </div>
                                    <span className="font-mono text-[11px] font-semibold text-success">✓ dipilih</span>
                                </div>
                            ) : (
                                <div className="py-2 text-center">
                                    <p className="text-sm font-medium">Klik untuk pilih file PDF</p>
                                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">hanya .pdf yang diterima</p>
                                </div>
                            )}
                        </label>
                        <input
                            id="cv"
                            type="file"
                            accept=".pdf,application/pdf"
                            className="hidden"
                            onChange={(e) => {
                                const selectedFile = e.target.files?.[0] ?? null;
                                if (selectedFile && selectedFile.type !== "application/pdf") {
                                    toast.error("Hanya file PDF yang diterima.");
                                    e.target.value = "";
                                    setFile(null);
                                    return;
                                }
                                setFile(selectedFile);
                            }}
                            disabled={sync.isPending}
                        />
                        {file && (
                            <button type="button" onClick={() => setFile(null)} className="mt-2 text-[11.5px] text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                Hapus file
                            </button>
                        )}
                        <p className="mt-2 font-mono text-[11px] text-muted-foreground">pastikan CV berbasis teks, bukan hasil scan/foto</p>
                    </div>

                    <button
                        type="button"
                        disabled={sync.isPending || !githubUrl.trim() || !file}
                        onClick={handleSyncClick}
                        className="rounded-md bg-primary px-5 py-2.5 text-[12.5px] font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                        {sync.isPending ? "Syncing…" : hasExistingProfile ? "Sync ulang profil" : "Mulai sync profil"}
                    </button>
                </div>
            </Reveal>
        </div>
    );
}
