"use client";

// Hallmark · genre: modern-minimal · macrostructure: Workbench (app-surface) · theme: GitHire violet (locked)

import { PageHeader, Reveal } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { INTERESTS } from "@/utils/constants/interests";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

type Profile = {
    github_username: string | null;
    merged_skills: string[] | null;
    interests: string[] | null;
    updated_at: string | null;
    cv_data: any | null;
    cv_filename: string | null;
    cv_uploaded_at: string | null;
    github_signals: any | null;
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

const INTEREST_OPTIONS = INTERESTS;

export default function OnboardingPage() {
    const [githubUrl, setGithubUrl] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [stepIndex, setStepIndex] = useState(0);
    const [showInterestSurvey, setShowInterestSurvey] = useState(false);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const { withAuth, authReady } = useApi();
    const qc = useQueryClient();
    const router = useRouter();

    const { data: existingProfile, isFetched: profileFetched } = useQuery({
        queryKey: ["profile"],
        queryFn: () => withAuth<Profile>("/me/profile"),
        enabled: authReady,
    });

    const hasExistingProfile = !!existingProfile?.merged_skills?.length;

    // Prefill GitHub URL ketika profil sudah ada — biar sync ulang tinggal upload PDF
    useEffect(() => {
        if (hasExistingProfile && existingProfile?.github_username && !githubUrl) {
            setGithubUrl(`https://github.com/${existingProfile.github_username}`);
        }
    }, [hasExistingProfile, existingProfile?.github_username]);

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
            const fd = new FormData();
            fd.append("github_url", githubUrl.trim());
            fd.append("cv", file);
            let i = 0;
            const interval = setInterval(() => {
                i = (i + 1) % SYNC_STEPS.length;
                setStepIndex(i);
            }, 1800);
            try {
                return await withAuth<SyncResult>("/profiles/sync", {
                    method: "POST",
                    body: fd,
                });
            } finally {
                clearInterval(interval);
            }
        },
        onSuccess: (result) => {
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
            toast.error(e.message);
        },
    });

    const handleSyncClick = async () => {
        if (!githubUrl.trim() || !file) {
            toast.error("GitHub URL dan file PDF wajib diisi");
            return;
        }
        if (!authReady || !profileFetched) {
            toast.error("Sedang memuat profil, tunggu sebentar lalu coba lagi.");
            return;
        }
        if (hasExistingProfile) {
            const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
            const result = await Swal.fire({
                title: "Sync ulang profil?",
                html: `Kamu akan melakukan sinkronisasi ulang profil <b>@${existingProfile?.github_username}</b> dengan <b>${existingProfile?.merged_skills?.length ?? 0} skill</b>.<br><span style="color:#6b7280">Jika skill berubah, progress roadmap akan diatur ulang.</span>`,
                icon: "warning",
                theme: isDark ? "dark" : "light",
                showCancelButton: true,
                confirmButtonText: "Ya, sync ulang",
                cancelButtonText: "Batal",
                confirmButtonColor: "hsl(262.1, 83.3%, 57.8%)",
                cancelButtonColor: "#6b7280",
                reverseButtons: true,
                focusCancel: true,
            });
            if (!result.isConfirmed) return;
        }
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
                title={hasExistingProfile ? "Data GitHub + CV" : "Onboarding"}
                sub={
                    hasExistingProfile
                        ? `Profil @${existingProfile?.github_username} · ${existingProfile?.merged_skills?.length ?? 0} skill terhubung. Upload PDF baru untuk sync ulang.`
                        : "Kami hanya membaca data GitHub publik. Upload CV PDF untuk ekstraksi skill."
                }
            />

            <Reveal delay={0.06} className="pt-6">
                {hasExistingProfile && existingProfile && (
                    <div className="mb-5 rounded-xl border border-border bg-card p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <div className="flex size-8 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                                    {(existingProfile.github_username ?? "?").slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">@{existingProfile.github_username ?? "-"}</p>
                                    <p className="font-mono text-[11px] text-muted-foreground">
                                        {existingProfile.merged_skills?.length ?? 0} skill · {existingProfile.github_signals?.commits ?? 0} commits · {existingProfile.github_signals?.stars ?? 0} stars
                                    </p>
                                </div>
                            </div>
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-600">Terhubung</span>
                        </div>
                        {existingProfile.merged_skills && existingProfile.merged_skills.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {existingProfile.merged_skills.slice(0, 8).map((s) => (
                                    <span key={s} className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px]">
                                        {s}
                                    </span>
                                ))}
                                {(existingProfile.merged_skills.length ?? 0) > 8 && (
                                    <span className="px-1 py-0.5 font-mono text-[11px] text-muted-foreground">+{existingProfile.merged_skills.length - 8}</span>
                                )}
                            </div>
                        )}
                        <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium">CV terhubung</p>
                                <p className="truncate font-mono text-[11px] text-muted-foreground">
                                    {existingProfile.cv_filename ?? "cv.pdf"} · {existingProfile.cv_data ? "teks OK" : "belum ada"} · {existingProfile.updated_at ? new Date(existingProfile.updated_at).toLocaleDateString("id-ID") : "-"}
                                </p>
                            </div>
                            <span className="rounded-full bg-violet-600/10 px-2 py-0.5 font-mono text-[10px] font-bold text-violet-600">PDF</span>
                        </div>
                        <p className="mt-3 border-l-2 border-warning/50 bg-warning/[0.05] px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
                            <span className="font-semibold text-foreground">Sync ulang?</span> Jika skill tidak berubah, roadmap tetap aman. Jika berubah, roadmap di-generate ulang.
                        </p>
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
