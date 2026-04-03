"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Check, ExternalLink, FileText, Send, Target } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

type Step = {
    index: number;
    title: string;
    description: string;
    resources?: string[];
    target?: string;
    completed: boolean;
};
type Roadmap = {
    fingerprint: string | null;
    steps: Step[];
    job_id: string | null;
    job_title: string | null;
    job_company: string | null;
};

// ── Apply CTA at finish marker ────────────────────────────────────────────────
function ApplyAtFinish({ jobId, jobTitle, jobCompany }: { jobId: string; jobTitle: string; jobCompany: string }) {
    const { withAuth, isLoaded, isSignedIn } = useApi();
    const qc = useQueryClient();

    const { data: application } = useQuery({
        queryKey: ["applications", jobId],
        queryFn: () => withAuth<{ id: string; status: string; apply_url: string | null } | null>(`/applications/${jobId}`),
        enabled: isLoaded && isSignedIn && !!jobId,
    });

    const applyMutation = useMutation({
        mutationFn: () =>
            withAuth(`/applications/${jobId}`, {
                method: "POST",
                body: JSON.stringify({ note: null }),
            }),
        onSuccess: (data) => {
            qc.setQueryData(["applications", jobId], data);
            qc.invalidateQueries({ queryKey: ["applications"] });
            toast.success(`Lamaran ke ${jobCompany} sudah tercatat!`);
        },
        onError: () => toast.error("Gagal menyimpan lamaran. Coba lagi."),
    });

    if (application) {
        return (
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                    <Check className="w-4 h-4" />
                    Sudah dilamar · <span className="capitalize">{application.status}</span>
                </div>
                <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/applications">
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        Kelola Lamaran
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <Button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/30"
            >
                {applyMutation.isPending ? (
                    <><span className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />Memproses...</>
                ) : (
                    <><Send className="w-4 h-4 mr-2" />Apply ke {jobTitle || jobCompany} →</>
                )}
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground text-xs">
                <Link href={`/dashboard/jobs/${jobId}`}>Lihat detail job</Link>
            </Button>
        </div>
    );
}

function RoadmapContent() {
    const { withAuth, isLoaded, isSignedIn } = useApi();
    const qc = useQueryClient();
    const searchParams = useSearchParams();
    const jobId = searchParams.get("job_id");

    const roadmapUrl = jobId ? `/me/roadmap?job_id=${jobId}` : "/me/roadmap";

    const LOADING_MESSAGES = [
        "Menganalisis skill gap kamu…",
        "Menghubungi AI…",
        "Menyusun langkah belajar…",
        "Mencari resource terbaik…",
        "Menyempurnakan roadmap…",
    ];
    const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);

    const { data, isLoading, error } = useQuery({
        queryKey: ["roadmap", jobId ?? "generic"],
        queryFn: () => withAuth<Roadmap>(roadmapUrl),
        enabled: isLoaded && isSignedIn,
        retry: false,
    });

    // Saat roadmap job pertama kali berhasil dimuat, invalidate bookmarks
    // sehingga dashboard & my-roadmaps langsung detect bookmark baru
    const bookmarkInvalidatedRef = useRef<string | null>(null);
    useEffect(() => {
        if (data?.job_id && bookmarkInvalidatedRef.current !== data.job_id) {
            bookmarkInvalidatedRef.current = data.job_id;
            qc.invalidateQueries({ queryKey: ["bookmarks"] });
        }
    }, [data?.job_id, qc]);

    useEffect(() => {
        if (!isLoading) return;
        const interval = setInterval(() => {
            setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 2000);
        return () => clearInterval(interval);
    }, [isLoading]);

    const patch = useMutation({
        mutationFn: async ({ index, completed }: { index: number; completed: boolean }) => {
            const stepUrl = jobId
                ? `/me/roadmap/steps/${index}?job_id=${jobId}`
                : `/me/roadmap/steps/${index}`;
            return withAuth<Step>(stepUrl, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ completed }),
            });
        },
        onSuccess: (updated) => {
            qc.setQueryData(["roadmap", jobId ?? "generic"], (old: Roadmap | undefined) => {
                if (!old) return old;
                const newSteps = old.steps.map((s) =>
                    s.index === updated.index ? { ...s, completed: updated.completed } : s
                );
                // 🎉 Notifikasi saat semua step selesai
                if (updated.completed && newSteps.every((s) => s.completed)) {
                    const jobLabel = old.job_title ? ` ke ${old.job_title}` : "";
                    toast.success(
                        `Semua langkah selesai. Kamu siap apply${jobLabel}!`,
                        { duration: 6000 }
                    );
                }
                return { ...old, steps: newSteps };
            });
            // Invalidate bookmarks agar dashboard & my-roadmaps reflect progress terbaru
            qc.invalidateQueries({ queryKey: ["bookmarks"] });
        },
        onError: (e: Error) => toast.error(`Gagal menyimpan: ${e.message}`),
    });

    const reset = useMutation({
        mutationFn: async () => {
            const url = jobId
                ? `/me/roadmap/cache?job_id=${jobId}`
                : "/me/roadmap/cache";
            return withAuth(url, { method: "DELETE" });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["roadmap", jobId ?? "generic"] });
            qc.invalidateQueries({ queryKey: ["bookmarks"] });
            toast.success("Cache dihapus. Sedang generate ulang…");
        },
        onError: (e: Error) => toast.error(`Gagal reset: ${e.message}`),
    });

    const completedCount = data?.steps.filter((s) => s.completed).length ?? 0;
    const totalCount = data?.steps.length ?? 0;
    const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <div className="max-w-2xl space-y-6">
            {/* ── Mode Switcher (toggle Umum vs Job) ── */}
            {jobId ? (
                <div className="flex items-center gap-2 p-1 bg-muted rounded-xl w-fit">
                    <Link
                        href="/dashboard/roadmap"
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-background/60 transition-all"
                    >
                        Roadmap Umum
                    </Link>
                    <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-background shadow-sm text-foreground">
                        {data?.job_title
                            ? (data.job_title.length > 22 ? data.job_title.slice(0, 22) + "…" : data.job_title)
                            : "Job Spesifik"}
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 p-1 bg-muted rounded-xl w-fit">
                    <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-background shadow-sm text-foreground">
                        Roadmap Umum
                    </div>
                    <Link
                        href="/dashboard/my-roadmaps"
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-background/60 transition-all"
                    >
                        Pilih Job Target
                    </Link>
                </div>
            )}

            {/* ── Header ── */}
            <div className="flex items-start gap-3">
                {jobId && (
                    <Button variant="ghost" size="icon" asChild className="mt-1 shrink-0">
                        <Link href={`/dashboard/jobs/${jobId}`}>
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                    </Button>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-semibold">Roadmap Belajar</h1>
                        {data?.job_title
                            ? <Badge variant="secondary">{data.job_title}</Badge>
                            : <Badge variant="outline">Generik</Badge>
                        }
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground ml-auto"
                            disabled={reset.isPending || isLoading}
                            onClick={() => reset.mutate()}
                        >
                            {reset.isPending ? "Mereset…" : "↺ Generate Ulang"}
                        </Button>
                    </div>
                    <p className="text-muted-foreground text-sm mt-1">
                        {data?.job_title
                            ? `Roadmap untuk posisi ${data.job_title} di ${data.job_company ?? ""}. Klik lingkaran untuk mencentang.`
                            : "Roadmap berdasarkan skill gap vs semua lowongan. Klik lingkaran untuk mencentang."
                        }
                    </p>

                    {/* Info box: hanya tampil untuk roadmap generik */}
                    {!jobId && !isLoading && data && (
                        <div className="mt-3 flex items-start gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
                            <BookOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <div className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">Ini adalah roadmap generik</span>{" "}
                                — dibuat berdasarkan keseluruhan skill gap kamu.{" "}
                                Untuk roadmap yang lebih fokus dan spesifik,{" "}
                                <Link
                                    href="/dashboard/jobs/recommended"
                                    className="text-primary underline underline-offset-2 hover:no-underline"
                                >
                                    pilih job yang ingin ditarget
                                </Link>
                                {" "}lalu buat roadmap khusus dari halaman detail job.
                            </div>
                        </div>
                    )}

                    {/* Progress bar */}
                    {totalCount > 0 && (
                        <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>{completedCount} dari {totalCount} langkah selesai</span>
                                <span className="font-medium">{progressPct}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                <div
                                    className="h-2 rounded-full transition-all duration-700"
                                    style={{
                                        width: `${progressPct}%`,
                                        background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Loading / Error ── */}
            {isLoading && (
                <div className="space-y-2 py-4">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                        <span className="animate-pulse font-medium">
                            {LOADING_MESSAGES[loadingMsgIdx]}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-8">
                        Biasanya membutuhkan 10–20 detik. Harap tunggu sebentar.
                    </p>
                </div>
            )}
            {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                    {(error as Error).message || "Gagal memuat roadmap. Selesaikan onboarding terlebih dahulu."}
                </p>
            )}

            {/* ── Timeline ── */}
            {data && data.steps.length > 0 && (
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-gradient-to-b from-primary via-purple-500/40 to-muted" />

                    <div className="space-y-4">
                        {data.steps.map((step, idx) => {
                            const isLast = idx === data.steps.length - 1;
                            const isCompleted = step.completed;
                            const isCurrent = !isCompleted && (idx === 0 || data.steps[idx - 1]?.completed);

                            return (
                                <div key={step.index} className="relative flex gap-4 items-start">
                                    {/* Node */}
                                    <button
                                        onClick={() => patch.mutate({ index: step.index, completed: !isCompleted })}
                                        disabled={patch.isPending}
                                        className={`
                                            relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                                            text-sm font-bold shrink-0 border-2 transition-all duration-300
                                            ${isCompleted
                                                ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/30"
                                                : isCurrent
                                                    ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/20"
                                                    : "bg-background border-muted-foreground/30 text-muted-foreground hover:border-primary/50"
                                            }
                                        `}
                                        title={isCompleted ? "Klik untuk batalkan" : "Klik untuk selesaikan"}
                                    >
                                        {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                                    </button>

                                    {/* Card */}
                                    <div className={`
                                        flex-1 rounded-xl border p-4 mb-2 transition-all duration-300
                                        ${isCompleted
                                            ? "bg-muted/30 border-green-500/20 opacity-70"
                                            : isCurrent
                                                ? "bg-primary/5 border-primary/30 shadow-sm"
                                                : "bg-card border-border"
                                        }
                                    `}>
                                        {/* Title row */}
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className={`font-semibold leading-snug ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                                                {step.title}
                                            </h3>
                                            {isCompleted && (
                                                <Badge variant="outline" className="text-green-500 border-green-500/40 text-xs shrink-0">
                                                    ✓ Selesai
                                                </Badge>
                                            )}
                                            {isCurrent && !isCompleted && (
                                                <Badge className="text-xs shrink-0 bg-primary/20 text-primary border-0">
                                                    Sekarang
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Description */}
                                        {step.description && (
                                            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                                                {step.description}
                                            </p>
                                        )}

                                        {/* Resources */}
                                        {step.resources && step.resources.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-3">
                                                <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
                                                    <BookOpen className="w-3 h-3" /> Resource:
                                                </span>
                                                {step.resources.map((r, i) => (
                                                    <Badge
                                                        key={i}
                                                        variant="secondary"
                                                        className="text-xs font-normal flex items-center gap-1"
                                                    >
                                                        {r}
                                                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        {/* Target */}
                                        {step.target && (
                                            <div className="flex items-start gap-2 bg-primary/5 rounded-lg px-3 py-2">
                                                <Target className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                                                <p className="text-xs text-primary/80 leading-relaxed">
                                                    <span className="font-medium">Target:</span> {step.target}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Finish marker */}
                    {progressPct === 100 && (
                        <div className="mt-6 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 p-5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/40 shrink-0 text-lg">
                                    🎉
                                </div>
                                <div>
                                    <p className="font-semibold text-emerald-600">Selamat, semua langkah selesai!</p>
                                    <p className="text-xs text-muted-foreground">Kamu sudah siap untuk melamar posisi ini.</p>
                                </div>
                            </div>

                            {/* Apply CTA */}
                            {data?.job_id && (
                                <ApplyAtFinish jobId={data.job_id} jobTitle={data.job_title ?? ""} jobCompany={data.job_company ?? ""} />
                            )}
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}

export default function RoadmapPage() {
    return (
        <Suspense fallback={<p className="text-sm text-muted-foreground animate-pulse">Loading roadmap…</p>}>
            <RoadmapContent />
        </Suspense>
    );
}
