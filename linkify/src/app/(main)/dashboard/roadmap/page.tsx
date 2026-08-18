"use client";

// Hallmark · genre: modern-minimal · macrostructure: Workbench (app-surface) · theme: GitHire violet (locked)

import { BarFill, EASE_OUT } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

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

// ── Apply CTA di akhir roadmap ──
function ApplyAtFinish({ jobId, jobTitle, jobCompany }: { jobId: string; jobTitle: string; jobCompany: string }) {
    const { withAuth, authReady } = useApi();
    const qc = useQueryClient();

    const { data: application } = useQuery({
        queryKey: ["applications", jobId],
        queryFn: () => withAuth<{ id: string; status: string; apply_url: string | null } | null>(`/applications/${jobId}`),
        enabled: authReady && !!jobId,
    });

    if (application) {
        return (
            <div className="flex flex-wrap items-center gap-4">
                <span className="font-mono text-[12.5px] font-semibold text-success">
                    ✓ sudah dilamar · <span className="capitalize">{application.status}</span>
                </span>
                <Link href="/dashboard/applications" className="text-[12.5px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    Kelola lamaran →
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-4">
            <Link
                href={`/dashboard/jobs/${jobId}`}
                className="rounded-md bg-primary px-4 py-2 text-[12.5px] font-bold text-primary-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
                Apply ke {jobTitle || jobCompany} →
            </Link>
            <Link href={`/dashboard/jobs/${jobId}`} prefetch={false} className="text-[12px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Lihat detail job
            </Link>
        </div>
    );
}

function RoadmapContent() {
    const { withAuth, authReady } = useApi();
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

    const [activeQuizIdx, setActiveQuizIdx] = useState<number | null>(null);
    const [quizQuestions, setQuizQuestions] = useState<{ question: string; options: string[]; correct_index: number }[] | null>(null);
    const [loadingQuiz, setLoadingQuiz] = useState(false);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [userAnswers, setUserAnswers] = useState<number[]>([]);
    const [quizResult, setQuizResult] = useState<{ finished: boolean; passed: boolean; score: number } | null>(null);

    const startQuiz = async (index: number) => {
        setActiveQuizIdx(index);
        setLoadingQuiz(true);
        setQuizQuestions(null);
        setCurrentQuestionIdx(0);
        setUserAnswers([]);
        setQuizResult(null);
        try {
            const url = jobId ? `/me/roadmap/quiz?step_index=${index}&job_id=${jobId}` : `/me/roadmap/quiz?step_index=${index}`;
            const data = await withAuth<{ quiz: any[] }>(url);
            if (data?.quiz && data.quiz.length > 0) {
                setQuizQuestions(data.quiz);
            } else {
                toast.error("Gagal mendapatkan soal kuis dari AI.");
                setActiveQuizIdx(null);
            }
        } catch (err: any) {
            toast.error(err.message || "Gagal membuat kuis.");
            setActiveQuizIdx(null);
        } finally {
            setLoadingQuiz(false);
        }
    };

    const handleAnswerSelect = (optionIdx: number) => {
        const nextAnswers = [...userAnswers, optionIdx];
        setUserAnswers(nextAnswers);
        if (currentQuestionIdx + 1 < (quizQuestions?.length ?? 0)) {
            setCurrentQuestionIdx((prev) => prev + 1);
        } else {
            let correctCount = 0;
            quizQuestions?.forEach((q, i) => {
                if (nextAnswers[i] === q.correct_index) correctCount++;
            });
            const passed = correctCount === (quizQuestions?.length ?? 0);
            setQuizResult({ finished: true, passed, score: correctCount });
            if (passed) {
                patch.mutate({ index: activeQuizIdx!, completed: true });
                toast.success("Hebat! Jawabanmu 100% benar.");
            }
        }
    };

    const { data, isLoading, error } = useQuery({
        queryKey: ["roadmap", jobId ?? "generic"],
        queryFn: () => withAuth<Roadmap>(roadmapUrl),
        enabled: authReady,
        retry: false,
    });

    const bookmarkInvalidatedRef = useRef<string | null>(null);
    useEffect(() => {
        if (data?.job_id && bookmarkInvalidatedRef.current !== data.job_id) {
            bookmarkInvalidatedRef.current = data.job_id;
            qc.invalidateQueries({ queryKey: ["bookmarks"] });
        }
    }, [data?.job_id, qc]);

    useEffect(() => {
        if (!isLoading) return;
        const interval = setInterval(() => setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length), 2000);
        return () => clearInterval(interval);
    }, [isLoading, LOADING_MESSAGES.length]);

    const patch = useMutation({
        mutationFn: async ({ index, completed }: { index: number; completed: boolean }) => {
            const stepUrl = jobId ? `/me/roadmap/steps/${index}?job_id=${jobId}` : `/me/roadmap/steps/${index}`;
            return withAuth<Step>(stepUrl, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed }) });
        },
        onSuccess: (updated) => {
            qc.setQueryData(["roadmap", jobId ?? "generic"], (old: Roadmap | undefined) => {
                if (!old) return old;
                const newSteps = old.steps.map((s) => (s.index === updated.index ? { ...s, completed: updated.completed } : s));
                if (updated.completed && newSteps.every((s) => s.completed)) {
                    const jobLabel = old.job_title ? ` ke ${old.job_title}` : "";
                    toast.success(`Semua langkah selesai. Kamu siap apply${jobLabel}!`, { autoClose: 6000 });
                }
                return { ...old, steps: newSteps };
            });
            qc.invalidateQueries({ queryKey: ["bookmarks"] });
        },
        onError: (e: Error) => toast.error(`Gagal menyimpan: ${e.message}`),
    });

    const reset = useMutation({
        mutationFn: async () => {
            const url = jobId ? `/me/roadmap/cache?job_id=${jobId}` : "/me/roadmap/cache";
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
        <div className="w-full max-w-2xl">
            {/* Mode tabs */}
            <div className="flex items-center gap-1 border-b border-border">
                {jobId ? (
                    <>
                        <Link href="/dashboard/roadmap" className="-mb-px border-b-2 border-transparent px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                            Roadmap umum
                        </Link>
                        <span className="-mb-px border-b-2 border-primary px-3 py-2 text-[13px] font-semibold text-foreground">
                            {data?.job_title ? (data.job_title.length > 22 ? data.job_title.slice(0, 22) + "…" : data.job_title) : "Job spesifik"}
                        </span>
                    </>
                ) : (
                    <>
                        <span className="-mb-px border-b-2 border-primary px-3 py-2 text-[13px] font-semibold text-foreground">Roadmap umum</span>
                        <Link href="/dashboard/my-roadmaps" prefetch={false} className="-mb-px border-b-2 border-transparent px-3 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                            Pilih job target
                        </Link>
                    </>
                )}
            </div>

            {/* Header */}
            <div className="flex flex-col gap-4 pb-6 pt-5 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                    <p className="font-mono text-[11px] text-muted-foreground">
                        dasbor / roadmap / <span className="font-medium text-foreground">{data?.job_title ? "job" : "umum"}</span>
                    </p>
                    <h1 className="mt-2 text-[22px] font-bold tracking-tight">Roadmap belajar</h1>
                    <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                        {data?.job_title
                            ? `Untuk posisi ${data.job_title} di ${data.job_company ?? ""}. Centang lingkaran atau lulus kuis AI untuk menyelesaikan langkah.`
                            : "Berdasarkan skill gap vs semua lowongan. Centang lingkaran atau lulus kuis AI untuk menyelesaikan langkah."}
                    </p>
                </div>
                <button
                    onClick={() => reset.mutate()}
                    disabled={reset.isPending || isLoading}
                    className="shrink-0 self-start font-mono text-[12px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:self-auto"
                >
                    {reset.isPending ? "mereset…" : "↺ generate ulang"}
                </button>
            </div>

            {/* Progress */}
            {totalCount > 0 && (
                <div className="border-y border-border py-4">
                    <div className="mb-2 flex items-baseline justify-between font-mono text-[11.5px] text-muted-foreground">
                        <span>
                            <span className="text-foreground">{completedCount}</span>/{totalCount} langkah selesai
                        </span>
                        <span className="text-[13px] font-semibold text-foreground">{progressPct}%</span>
                    </div>
                    <BarFill pct={progressPct} tone={progressPct === 100 ? "success" : "primary"} className="w-full" />
                </div>
            )}

            {!jobId && !isLoading && data && (
                <p className="mt-5 border-l-2 border-primary bg-primary/[0.04] px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">Ini roadmap generik</span> — dari keseluruhan skill gap.{" "}
                    <Link href="/dashboard/jobs/recommended" className="font-semibold text-primary hover:underline">
                        Pilih job target
                    </Link>{" "}
                    untuk roadmap yang lebih fokus.
                </p>
            )}

            {isLoading && (
                <div className="py-6">
                    <div className="flex items-center gap-3">
                        <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="font-mono text-[13px] font-medium text-muted-foreground">{LOADING_MESSAGES[loadingMsgIdx]}</span>
                    </div>
                    <p className="mt-1 pl-7 font-mono text-[11px] text-muted-foreground">biasanya 10–20 detik</p>
                </div>
            )}
            {error && (
                <p className="mt-5 border-l-2 border-destructive bg-destructive/[0.06] px-4 py-3 text-[13px] text-destructive">
                    {(error as Error).message || "Gagal memuat roadmap. Selesaikan onboarding terlebih dahulu."}
                </p>
            )}

            {/* Timeline */}
            {data && data.steps.length > 0 && (
                <div className="relative pt-6">
                    <div className="absolute bottom-6 left-[15px] top-8 w-px bg-border" />
                    <div className="space-y-5">
                        {data.steps.map((step, idx) => {
                            const isCompleted = step.completed;
                            const isCurrent = !isCompleted && (idx === 0 || data.steps[idx - 1]?.completed);
                            return (
                                <div key={step.index} className="relative flex items-start gap-4">
                                    <button
                                        onClick={() => patch.mutate({ index: step.index, completed: !isCompleted })}
                                        disabled={patch.isPending}
                                        title={isCompleted ? "Klik untuk batalkan" : "Klik untuk selesaikan"}
                                        className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 font-mono text-[12px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                            isCompleted
                                                ? "border-success bg-success text-primary-foreground"
                                                : isCurrent
                                                  ? "border-primary bg-primary text-primary-foreground"
                                                  : "border-muted-foreground/40 bg-background text-muted-foreground hover:border-primary/50"
                                        }`}
                                    >
                                        {isCompleted ? "✓" : idx + 1}
                                    </button>

                                    <div className="min-w-0 flex-1 pb-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className={`text-[14px] font-semibold leading-snug ${isCompleted ? "text-muted-foreground line-through" : ""}`}>
                                                {step.title}
                                            </h3>
                                            {isCurrent && !isCompleted && (
                                                <span className="shrink-0 rounded-[3px] border border-primary/40 px-1.5 py-px font-mono text-[10px] font-semibold text-primary">SEKARANG</span>
                                            )}
                                        </div>

                                        {step.description && <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{step.description}</p>}

                                        {step.resources && step.resources.length > 0 && (
                                            <p className="mt-2 text-xs leading-relaxed">
                                                <span className="font-mono uppercase tracking-[0.06em] text-muted-foreground">resource · </span>
                                                {step.resources.map((r, i) => (
                                                    <span key={i}>
                                                        {i > 0 && <span className="mx-1.5 text-border">·</span>}
                                                        <span className="font-medium text-foreground">{r}</span>
                                                    </span>
                                                ))}
                                            </p>
                                        )}

                                        {step.target && (
                                            <p className="mt-2 border-l-2 border-primary/50 pl-3 text-[12.5px] text-muted-foreground">
                                                <span className="font-mono uppercase tracking-[0.06em]">target</span> — {step.target}
                                            </p>
                                        )}

                                        {/* Quiz */}
                                        {!isCompleted && (
                                            <div className="mt-4 border-t border-dashed border-border pt-4">
                                                {activeQuizIdx !== step.index ? (
                                                    <button
                                                        onClick={() => startQuiz(step.index)}
                                                        className="rounded-md border border-primary/40 px-3 py-1.5 text-[12px] font-semibold text-primary transition-colors hover:bg-primary/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                    >
                                                        ✦ Uji pemahaman (AI quiz)
                                                    </button>
                                                ) : (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        transition={{ duration: 0.3, ease: EASE_OUT }}
                                                        className={`overflow-hidden border-l-2 pl-4 ${
                                                            quizResult?.finished ? (quizResult.passed ? "border-success" : "border-destructive") : "border-border"
                                                        }`}
                                                    >
                                                        {loadingQuiz ? (
                                                            <div className="flex items-center gap-2 py-2">
                                                                <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                                                <p className="font-mono text-[12px] text-muted-foreground">Gemini menyusun 3 pertanyaan…</p>
                                                            </div>
                                                        ) : quizQuestions && quizResult?.finished ? (
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 6 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ duration: 0.3, ease: EASE_OUT }}
                                                                className="space-y-3"
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`font-mono text-[11px] font-semibold ${quizResult.passed ? "text-success" : "text-destructive"}`}>
                                                                        {quizResult.passed ? "✓ VERIFIKASI BERHASIL" : "✗ BELUM LULUS"}
                                                                    </span>
                                                                    <span className="font-mono text-[11px] text-muted-foreground">skor {quizResult.score}/3</span>
                                                                </div>
                                                                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                                                                    {quizResult.passed
                                                                        ? "Pemahamanmu tervalidasi Gemini AI. Langkah ini otomatis ditandai selesai."
                                                                        : "Baca kembali keterangan di atas, lalu coba uji lagi. Kamu pasti bisa."}
                                                                </p>
                                                                <div className="flex flex-wrap gap-4 pt-1">
                                                                    {!quizResult.passed ? (
                                                                        <button
                                                                            onClick={() => startQuiz(step.index)}
                                                                            className="rounded-md bg-primary px-3.5 py-1.5 text-[12px] font-bold text-primary-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                                        >
                                                                            ↺ Coba uji lagi
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => setActiveQuizIdx(null)}
                                                                            className="rounded-md bg-success px-3.5 py-1.5 text-[12px] font-bold text-primary-foreground transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                                        >
                                                                            Lanjutkan belajar
                                                                        </button>
                                                                    )}
                                                                    <button onClick={() => setActiveQuizIdx(null)} className="text-[12px] font-semibold text-muted-foreground hover:text-foreground">
                                                                        Tutup kuis
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        ) : quizQuestions ? (
                                                            <AnimatePresence mode="wait">
                                                                <motion.div
                                                                    key={currentQuestionIdx}
                                                                    initial={{ opacity: 0, x: 24 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    exit={{ opacity: 0, x: -24 }}
                                                                    transition={{ duration: 0.25, ease: EASE_OUT }}
                                                                    className="space-y-3"
                                                                >
                                                                    <div className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
                                                                        <span className="font-semibold text-primary">AI verification quiz</span>
                                                                        <span>soal {currentQuestionIdx + 1}/{quizQuestions.length}</span>
                                                                    </div>
                                                                    <BarFill pct={((currentQuestionIdx + 1) / quizQuestions.length) * 100} className="w-full" />
                                                                    <p className="text-[13.5px] font-semibold leading-snug">{quizQuestions[currentQuestionIdx].question}</p>
                                                                    <div className="grid gap-2 pt-1">
                                                                        {quizQuestions[currentQuestionIdx].options.map((opt, oIdx) => (
                                                                            <button
                                                                                key={oIdx}
                                                                                onClick={() => handleAnswerSelect(oIdx)}
                                                                                className="group flex items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-left text-[13px] font-medium transition-colors hover:border-primary/50 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                                            >
                                                                                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted font-mono text-[10px] font-bold text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                                                                                    {String.fromCharCode(65 + oIdx)}
                                                                                </span>
                                                                                <span className="flex-1">{opt}</span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    <button onClick={() => setActiveQuizIdx(null)} className="pt-1 font-mono text-[10.5px] text-muted-foreground hover:text-foreground">
                                                                        batal & keluar kuis
                                                                    </button>
                                                                </motion.div>
                                                            </AnimatePresence>
                                                        ) : null}
                                                    </motion.div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Finish */}
                    {progressPct === 100 && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: EASE_OUT }}
                            className="mt-8 border-l-2 border-success bg-success/[0.05] px-5 py-4"
                        >
                            <p className="text-[14px] font-bold text-success">✓ Semua langkah selesai</p>
                            <p className="mt-0.5 mb-4 text-xs text-muted-foreground">Kamu sudah siap untuk melamar posisi ini.</p>
                            {data?.job_id && <ApplyAtFinish jobId={data.job_id} jobTitle={data.job_title ?? ""} jobCompany={data.job_company ?? ""} />}
                        </motion.div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function RoadmapPage() {
    return (
        <Suspense fallback={<p className="font-mono text-sm text-muted-foreground">Loading roadmap…</p>}>
            <RoadmapContent />
        </Suspense>
    );
}
