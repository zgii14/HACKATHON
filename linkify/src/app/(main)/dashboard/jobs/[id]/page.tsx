"use client";

// Hallmark · genre: modern-minimal · macrostructure: Workbench (app-surface) · theme: GitHire violet (locked)

import { Button } from "@/components/ui/button";
import { BarFill, CountUp, Crumb, EmptyState, Reveal, SecTitle } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, BookOpen, Loader2, MoveLeft, Send, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
    applied:   "Dilamar",
    interview: "Interview",
    offer:     "Dapat Offer!",
    rejected:  "Ditolak",
};

type JobDetail = {
    id: string;
    title: string;
    company: string;
    description: string;
    required_skills: string[];
    location: string | null;
    is_remote: boolean;
    apply_url: string | null;
    match_score: number | null;
    match_reasons: string[];
    missing_skills: string[];
    salary: string | null;
    min_education: string | null;
    min_experience: string | null;
    work_type: string | null;
};

type BookmarkedJob = {
    job_id: string;
    total_steps: number;
    completed_steps: number;
};

type ApplicationOut = {
    id: string;
    job_id: string;
    status: string;
    note: string | null;
    applied_at: string;
    roadmap_completed: boolean;
};

// ── Apply Dialog ─────────────────────────────────────────────────────────────

type DialogKind = "no-roadmap" | "low-score" | "incomplete-roadmap";

function ApplyDialog({
    kind,
    job,
    bookmark,
    onConfirm,
    onClose,
}: {
    kind: DialogKind;
    job: JobDetail;
    bookmark: BookmarkedJob | undefined;
    onConfirm: (note: string) => void;
    onClose: () => void;
}) {
    const [note, setNote] = useState("");
    const pct = job.match_score != null ? Math.round(job.match_score * 100) : 0;
    const completedSteps = bookmark?.completed_steps ?? 0;
    const totalSteps = bookmark?.total_steps ?? 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-2xl">
                <div className="flex items-start justify-between border-b border-border pb-4">
                    <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.07em] text-warning">konfirmasi</p>
                        <h3 className="mt-1 text-[15px] font-bold tracking-tight">Yakin ingin apply?</h3>
                        <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">{job.title} · {job.company}</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <X className="size-4" />
                    </button>
                </div>

                {/* Peringatan berdasarkan kondisi */}
                <div className="mt-4 border-l-2 border-warning/50 pl-3 text-[13px] leading-relaxed text-muted-foreground">
                    {kind === "no-roadmap" && (
                        <>
                            <p className="font-semibold text-foreground">Kamu belum membuat roadmap untuk job ini.</p>
                            <p className="mt-0.5 text-[12px]">Roadmap membantu kamu mempersiapkan skill yang diperlukan sebelum apply.</p>
                        </>
                    )}
                    {kind === "low-score" && (
                        <>
                            <p className="font-semibold text-foreground">Match score kamu masih {pct}% untuk posisi ini.</p>
                            <p className="mt-0.5 text-[12px]">Kamu mungkin perlu tingkatkan skill terlebih dahulu agar peluang lebih besar.</p>
                        </>
                    )}
                    {kind === "incomplete-roadmap" && (
                        <>
                            <p className="font-semibold text-foreground">Roadmap kamu baru {completedSteps}/{totalSteps} langkah selesai.</p>
                            <p className="mt-0.5 text-[12px]">Menyelesaikan roadmap akan meningkatkan kesiapanmu untuk posisi ini.</p>
                        </>
                    )}
                </div>

                {/* Note input */}
                <div className="mt-4">
                    <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                        Catatan (opsional)
                    </label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Contoh: Apply via referral, follow up minggu depan..."
                        rows={2}
                        className="w-full resize-none rounded-md border border-border bg-background px-3 py-2.5 text-[13px] transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                    />
                </div>

                {/* Action buttons */}
                <div className="mt-5 flex gap-2">
                    {kind === "no-roadmap" ? (
                        <>
                            <Button variant="outline" className="flex-1 text-sm" asChild>
                                <Link href={`/dashboard/roadmap?job_id=${job.id}`}>
                                    <BookOpen className="mr-1.5 size-3.5" />
                                    Buat Roadmap Dulu
                                </Link>
                            </Button>
                            <Button className="flex-1 text-sm" onClick={() => onConfirm(note)}>
                                <Send className="mr-1.5 size-3.5" />
                                Tetap Apply
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" className="flex-1 text-sm" onClick={onClose}>
                                Batal
                            </Button>
                            <Button className="flex-1 text-sm" onClick={() => onConfirm(note)}>
                                <Send className="mr-1.5 size-3.5" />
                                Ya, Apply Sekarang
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function JobDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const { withAuth, authReady } = useApi();
    const qc = useQueryClient();

    const [dialogKind, setDialogKind] = useState<DialogKind | null>(null);
    const [pendingNote, setPendingNote] = useState("");

    const { data: job, isLoading, error } = useQuery({
        queryKey: ["job", id],
        queryFn: () => withAuth<JobDetail>(`/jobs/${id}`),
        enabled: authReady && !!id,
        staleTime: 10 * 60 * 1000,
        retry: false,
    });

    const { data: bookmarks = [] } = useQuery({
        queryKey: ["bookmarks"],
        queryFn: () => withAuth<BookmarkedJob[]>("/me/bookmarks"),
        enabled: authReady,
    });

    const { data: application } = useQuery({
        queryKey: ["applications", id],
        queryFn: () => withAuth<ApplicationOut | null>(`/applications/${id}`),
        enabled: authReady && !!id,
    });

    const bookmark = bookmarks.find((b) => b.job_id === id);
    const hasRoadmap = !!bookmark;
    const roadmapCompleted = hasRoadmap && bookmark.completed_steps >= bookmark.total_steps && bookmark.total_steps > 0;
    const alreadyApplied = !!application;
    const matchPct = job?.match_score != null ? Math.round(job.match_score * 100) : null;
    const ownedCount = (job?.required_skills?.length ?? 0) - (job?.missing_skills?.length ?? 0);
    const totalRequired = job?.required_skills?.length ?? 0;

    // ── Apply mutation ────────────────────────────────────────────────────
    const applyMutation = useMutation({
        mutationFn: (note: string) =>
            withAuth<ApplicationOut>(`/applications/${id}`, {
                method: "POST",
                body: JSON.stringify({ note: note || null }),
            }),
        onSuccess: (data) => {
            qc.setQueryData(["applications", id], data);
            qc.invalidateQueries({ queryKey: ["applications"] });
            qc.invalidateQueries({ queryKey: ["dashboard-stats"] });

            // Lowongan internal (dibuat recruiter/seed) → lamaran diproses di platform,
            // tidak ada redirect. Hanya lowongan hasil scraping yang punya apply_url eksternal.
            if (job?.apply_url) {
                toast.success(`Lamaran ke ${job.company} tercatat. Membuka halaman lamaran resmi…`);
                window.open(job.apply_url, "_blank", "noopener,noreferrer");
            } else {
                toast.success(`Berhasil! Lamaranmu ke ${job?.company} sudah dikirim ke recruiter.`);
            }
        },
        onError: () => {
            toast.error("Gagal menyimpan lamaran. Coba lagi.");
        },
    });

    // ── Click Apply handler ───────────────────────────────────────────────
    const handleApplyClick = () => {
        if (alreadyApplied) return;

        // Prioritas 1: belum punya roadmap
        if (!hasRoadmap) {
            setDialogKind("no-roadmap");
            return;
        }
        // Prioritas 2: match score < 30%
        if (matchPct != null && matchPct < 30) {
            setDialogKind("low-score");
            return;
        }
        // Prioritas 3: roadmap belum selesai
        // (hasRoadmap sudah dipastikan true oleh guard 1)
        if (!roadmapCompleted) {
            setDialogKind("incomplete-roadmap");
            return;
        }
        // Roadmap selesai + score OK → langsung apply
        applyMutation.mutate("");
    };

    const handleConfirm = (note: string) => {
        const fromKind = dialogKind;
        setDialogKind(null);

        // Setelah user konfirmasi "no-roadmap" (klik "Tetap Apply"),
        // tetap jalankan guard 2 (low-score) agar tidak ter-bypass.
        // Guard 3 (incomplete-roadmap) tidak relevan karena user memang tidak punya roadmap.
        if (fromKind === "no-roadmap") {
            if (matchPct != null && matchPct < 30) {
                setPendingNote(note); // simpan note agar tidak hilang saat dialog berganti
                setDialogKind("low-score");
                return;
            }
            applyMutation.mutate(note);
            return;
        }

        // Dialog lain → langsung apply; pakai note dari dialog sebelumnya jika ada
        applyMutation.mutate(note || pendingNote);
        setPendingNote("");
    };

    // ── Error state ───────────────────────────────────────────────────────
    if (!isLoading && error) {
        const is404 = (error as Error).message?.includes("404") ||
                      (error as Error).message?.toLowerCase().includes("tidak ditemukan");
        return (
            <div className="w-full">
                <Reveal>
                    <Crumb path="dasbor / browse jobs / detail" />
                </Reveal>
                <div className="pt-8">
                    <EmptyState title={is404 ? "Lowongan tidak ditemukan" : "Gagal memuat lowongan"}>
                        {is404
                            ? "Lowongan ini mungkin sudah dihapus atau URL-nya tidak valid."
                            : "Terjadi kesalahan saat memuat data. Coba refresh halaman."}
                        <span className="mt-4 block">
                            <Link
                                href="/dashboard/jobs"
                                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                            >
                                <MoveLeft className="size-3.5" />
                                Kembali ke Browse
                            </Link>
                        </span>
                    </EmptyState>
                </div>
            </div>
        );
    }

    const scoreTone = matchPct == null ? "primary" : matchPct >= 60 ? "success" : "warning";
    const scoreLabel = matchPct == null ? "" : matchPct >= 60 ? "Cocok" : matchPct >= 30 ? "Cukup cocok" : "Kurang cocok";

    return (
        <>
            {/* Dialog konfirmasi */}
            {dialogKind && job && (
                <ApplyDialog
                    kind={dialogKind}
                    job={job}
                    bookmark={bookmark}
                    onConfirm={handleConfirm}
                    onClose={() => setDialogKind(null)}
                />
            )}

            <div className="w-full">
                {/* Loading skeleton */}
                {isLoading && (
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 w-40 rounded bg-muted/50" />
                        <div className="h-8 w-2/3 rounded bg-muted/50" />
                        <div className="h-16 rounded bg-muted/30" />
                        <div className="h-24 rounded bg-muted/30" />
                    </div>
                )}

                {!isLoading && !job && !error && (
                    <p className="py-8 text-center text-sm text-muted-foreground">Lowongan tidak ditemukan.</p>
                )}

                {job && (
                    <>
                        {/* ── Header ── */}
                        <Reveal>
                            <div className="flex flex-col gap-5 border-b border-border pb-6 pt-1 md:flex-row md:items-end md:justify-between">
                                <div className="min-w-0">
                                    <Crumb path="dasbor / browse jobs / detail" />
                                    <div className="mt-2 flex flex-wrap items-center gap-2.5">
                                        <h1 className="text-[22px] font-bold tracking-tight">{job.title}</h1>
                                        {hasRoadmap && (
                                            <span className="rounded-[3px] border border-primary/40 px-1.5 py-px font-mono text-[10px] font-semibold text-primary">
                                                ROADMAP AKTIF
                                            </span>
                                        )}
                                        {alreadyApplied && (
                                            <span className="rounded-[3px] border border-success/40 px-1.5 py-px font-mono text-[10px] font-semibold text-success">
                                                ✓ DILAMAR
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1.5 font-mono text-[12.5px] text-muted-foreground">
                                        {job.company}
                                        {job.location ? ` · ${job.location}` : ""}
                                        {job.is_remote ? " · remote" : ""}
                                    </p>
                                </div>

                                {/* ── Action buttons ── */}
                                <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                                    {alreadyApplied ? (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-mono text-[12px] text-success">
                                                Status · {STATUS_LABELS[application?.status ?? ""] ?? application?.status}
                                            </span>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href="/dashboard/applications">Kelola Lamaran</Link>
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            id="apply-button"
                                            onClick={handleApplyClick}
                                            disabled={applyMutation.isPending}
                                            className={roadmapCompleted ? "ring-2 ring-primary/40" : ""}
                                        >
                                            {applyMutation.isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                                    Memproses...
                                                </>
                                            ) : (
                                                <>
                                                    <Send className="mr-2 size-4" />
                                                    Apply Sekarang
                                                    {roadmapCompleted && <span className="ml-2 text-xs opacity-80">🎯</span>}
                                                </>
                                            )}
                                        </Button>
                                    )}

                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/dashboard/roadmap?job_id=${job.id}`}>
                                            <BookOpen className="mr-2 size-4" />
                                            {hasRoadmap ? "Lanjutkan Roadmap" : "Buat Roadmap"}
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </Reveal>

                        {/* ── Match score ── */}
                        {job.match_score != null && matchPct != null && (
                            <Reveal delay={0.05} className="pt-6">
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Match score</p>
                                        <p className="mt-1 font-mono text-[36px] font-semibold leading-none tabular-nums tracking-tight">
                                            <CountUp value={matchPct} /><span className="text-lg text-muted-foreground">%</span>
                                        </p>
                                    </div>
                                    <span className={`font-mono text-[12px] ${matchPct >= 60 ? "text-success" : "text-warning"}`}>{scoreLabel}</span>
                                </div>
                                <BarFill pct={matchPct} tone={scoreTone} className="mt-3 w-full" />
                            </Reveal>
                        )}

                        {/* ── Ringkasan skill (stat strip) ── */}
                        {job.match_score != null && (
                            <Reveal delay={0.1} className="pt-8">
                                <div className="grid grid-cols-3 divide-x divide-border border-y border-border">
                                    <div className="px-4 py-4 text-center">
                                        <p className="font-mono text-[24px] font-semibold tabular-nums tracking-tight">{totalRequired}</p>
                                        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">Skill dibutuhkan</p>
                                    </div>
                                    <div className="px-4 py-4 text-center">
                                        <p className="font-mono text-[24px] font-semibold tabular-nums tracking-tight text-success">{ownedCount}</p>
                                        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">Sudah dimiliki</p>
                                    </div>
                                    <div className="px-4 py-4 text-center">
                                        <p className="font-mono text-[24px] font-semibold tabular-nums tracking-tight text-warning">{job.missing_skills.length}</p>
                                        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.05em] text-muted-foreground">Perlu dipelajari</p>
                                    </div>
                                </div>
                            </Reveal>
                        )}

                        {/* ── Roadmap progress ── */}
                        {hasRoadmap && bookmark && (
                            <Reveal delay={0.14} className="pt-8">
                                <SecTitle
                                    title="Progress roadmap"
                                    meta={
                                        <span className={roadmapCompleted ? "text-success" : "text-primary"}>
                                            {bookmark.completed_steps}/{bookmark.total_steps} langkah{roadmapCompleted ? " ✓" : ""}
                                        </span>
                                    }
                                />
                                <BarFill
                                    pct={bookmark.total_steps > 0 ? (bookmark.completed_steps / bookmark.total_steps) * 100 : 0}
                                    tone={roadmapCompleted ? "success" : "primary"}
                                    className="mt-3 w-full"
                                />
                            </Reveal>
                        )}

                        {/* ── Skill gap ── */}
                        {job.missing_skills.length > 0 && (
                            <Reveal delay={0.18} className="pt-8">
                                <SecTitle title="Skill yang perlu dikuasai" meta={`${job.missing_skills.length} skill`} />
                                <p className="pt-3 text-[13px] leading-relaxed">
                                    {job.missing_skills.map((s, i) => (
                                        <span key={s}>
                                            {i > 0 && <span className="mx-1.5 text-border">·</span>}
                                            <span className="font-medium text-warning">{s}</span>
                                        </span>
                                    ))}
                                </p>
                            </Reveal>
                        )}

                        {job.missing_skills.length === 0 && job.match_score != null && (
                            <Reveal delay={0.18} className="pt-6">
                                <p className="border-l-2 border-success/60 pl-3 text-[13px] text-muted-foreground">
                                    <span className="font-semibold text-success">✓ Lengkap.</span> Kamu sudah memiliki semua skill yang dibutuhkan job ini.
                                </p>
                            </Reveal>
                        )}

                        {/* ── Kenapa skor ini ── */}
                        <Reveal delay={0.22} className="pt-8">
                            <SecTitle title="Kenapa skor ini?" />
                            <div className="space-y-1.5 pt-3 text-[13px] leading-relaxed text-muted-foreground">
                                {job.match_reasons.length > 0
                                    ? job.match_reasons.map((r) => <p key={r}>{r}</p>)
                                    : <p>Sync profilmu terlebih dahulu untuk melihat alasan skor.</p>}
                            </div>
                        </Reveal>

                        {/* ── Persyaratan pekerjaan ── */}
                        {(job.salary || job.min_experience || job.min_education || job.work_type) && (
                            <Reveal delay={0.26} className="pt-8">
                                <SecTitle title="Persyaratan pekerjaan" />
                                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 pt-4 sm:grid-cols-4">
                                    {job.salary && (
                                        <div>
                                            <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Gaji</dt>
                                            <dd className="mt-1 text-[13.5px] font-semibold text-success">{job.salary}</dd>
                                        </div>
                                    )}
                                    {job.min_experience && (
                                        <div>
                                            <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Pengalaman</dt>
                                            <dd className="mt-1 text-[13.5px] font-semibold">{job.min_experience}</dd>
                                        </div>
                                    )}
                                    {job.min_education && (
                                        <div>
                                            <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Pendidikan</dt>
                                            <dd className="mt-1 text-[13.5px] font-semibold">{job.min_education}</dd>
                                        </div>
                                    )}
                                    {job.work_type && (
                                        <div>
                                            <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Tipe kerja</dt>
                                            <dd className="mt-1 text-[13.5px] font-semibold">{job.work_type}</dd>
                                        </div>
                                    )}
                                </dl>
                            </Reveal>
                        )}

                        {/* ── Deskripsi ── */}
                        <Reveal delay={0.3} className="pt-8">
                            <SecTitle title="Deskripsi" />
                            <p className="max-w-prose whitespace-pre-wrap pt-3 text-[13px] leading-relaxed text-muted-foreground">{job.description}</p>
                        </Reveal>

                        {/* ── Required skills ── */}
                        <Reveal delay={0.34} className="pt-8">
                            <SecTitle title="Skill yang dibutuhkan" />
                            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-4">
                                {job.required_skills.map((s) => {
                                    const isMissing = job.missing_skills
                                        .map((m) => m.toLowerCase())
                                        .includes(s.toLowerCase());
                                    return (
                                        <span key={s} className="inline-flex items-center gap-1.5 text-[13px]">
                                            <span className={`size-1.5 rounded-full ${isMissing ? "bg-muted-foreground/40" : "bg-success"}`} />
                                            <span className={isMissing ? "text-muted-foreground line-through" : "font-medium text-foreground"}>{s}</span>
                                        </span>
                                    );
                                })}
                            </div>
                            <p className="pt-3 font-mono text-[11px] text-muted-foreground">
                                <span className="text-success">● dimiliki</span>
                                <span className="mx-2 text-border">·</span>
                                <span>● belum dimiliki</span>
                            </p>
                        </Reveal>
                    </>
                )}
            </div>
        </>
    );
}
