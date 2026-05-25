"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    AlertCircle, BookOpen, Briefcase, CheckCircle2, Clock,
    FileText, GraduationCap, Loader2, MapPin, MoveLeft,
    Send, Wallet, Wifi, X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
    applied:   "Dilamar",
    interview: "Interview",
    offer:     "Dapat Offer! 🎉",
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

function MatchScoreBar({ score }: { score: number | null }) {
    if (score == null) return null;
    const pct = Math.round(score * 100);
    const color =
        pct >= 60
            ? { bar: "bg-green-500", text: "text-green-500", bg: "bg-green-500/10 border-green-500/20", label: "Cocok" }
            : pct >= 30
            ? { bar: "bg-amber-500", text: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", label: "Cukup Cocok" }
            : { bar: "bg-rose-500", text: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/20", label: "Kurang Cocok" };

    return (
        <div className={`rounded-xl border p-4 ${color.bg}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Match Score</span>
                <span className={`text-2xl font-bold ${color.text}`}>{pct}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                <div
                    className={`h-2.5 rounded-full transition-all duration-700 ${color.bar}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <p className={`text-xs mt-1.5 ${color.text}`}>{color.label}</p>
        </div>
    );
}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Yakin ingin apply?</h3>
                            <p className="text-xs text-muted-foreground">{job.title} · {job.company}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Warning message berdasarkan kondisi */}
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-700 dark:text-amber-400 space-y-1">
                    {kind === "no-roadmap" && (
                        <>
                            <p className="font-medium">Kamu belum membuat roadmap untuk job ini.</p>
                            <p className="text-xs opacity-80">Roadmap membantu kamu mempersiapkan skill yang diperlukan sebelum apply.</p>
                        </>
                    )}
                    {kind === "low-score" && (
                        <>
                            <p className="font-medium">Match score kamu masih {pct}% untuk posisi ini.</p>
                            <p className="text-xs opacity-80">Kamu mungkin perlu tingkatkan skill terlebih dahulu agar peluang lebih besar.</p>
                        </>
                    )}
                    {kind === "incomplete-roadmap" && (
                        <>
                            <p className="font-medium">Roadmap kamu baru {completedSteps}/{totalSteps} langkah selesai.</p>
                            <p className="text-xs opacity-80">Menyelesaikan roadmap akan meningkatkan kesiapanmu untuk posisi ini.</p>
                        </>
                    )}
                </div>

                {/* Note input */}
                <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Catatan (opsional)
                    </label>
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Contoh: Apply via referral, follow up minggu depan..."
                        rows={2}
                        className="w-full text-sm rounded-lg border border-border bg-muted/50 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                    {kind === "no-roadmap" ? (
                        <>
                            <Button variant="outline" className="flex-1 text-sm" asChild>
                                <Link href={`/dashboard/roadmap?job_id=${job.id}`}>
                                    <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                                    Buat Roadmap Dulu
                                </Link>
                            </Button>
                            <Button
                                className="flex-1 text-sm"
                                onClick={() => onConfirm(note)}
                            >
                                <Send className="w-3.5 h-3.5 mr-1.5" />
                                Tetap Apply
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" className="flex-1 text-sm" onClick={onClose}>
                                Batal
                            </Button>
                            <Button
                                className="flex-1 text-sm"
                                onClick={() => onConfirm(note)}
                            >
                                <Send className="w-3.5 h-3.5 mr-1.5" />
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

            // Buka apply_url di tab baru
            const applyUrl = job?.apply_url ?? "https://www.linkedin.com/jobs/";
            if (!job?.apply_url) {
                toast.info("Link apply tidak tersedia, mengarahkan ke LinkedIn");
            } else {
                toast.success(`Berhasil! Lamaran ke ${job?.company} sudah tercatat.`);
            }
            window.open(applyUrl, "_blank", "noopener,noreferrer");
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
            <div className="max-w-md py-16 mx-auto text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h1 className="text-xl font-semibold">
                    {is404 ? "Lowongan tidak ditemukan" : "Gagal memuat lowongan"}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {is404
                        ? "Lowongan ini mungkin sudah dihapus atau URL-nya tidak valid."
                        : "Terjadi kesalahan saat memuat data. Coba refresh halaman."
                    }
                </p>
                <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/jobs">
                        <MoveLeft className="w-3.5 h-3.5 mr-1.5" />
                        Kembali ke Browse
                    </Link>
                </Button>
            </div>
        );
    }

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

            <div className="space-y-6 max-w-3xl">
                {/* Loading skeleton */}
                {isLoading && (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-8 w-2/3 bg-muted rounded-lg" />
                        <div className="h-4 w-1/3 bg-muted rounded" />
                        <div className="h-16 bg-muted rounded-xl" />
                        <div className="h-24 bg-muted rounded-xl" />
                        <div className="h-32 bg-muted rounded-xl" />
                    </div>
                )}

                {!isLoading && !job && !error && (
                    <p className="text-sm text-muted-foreground py-8 text-center">Lowongan tidak ditemukan.</p>
                )}

                {job && (
                    <>
                        {/* ── Header ── */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl font-semibold">{job.title}</h1>
                                    {hasRoadmap && (
                                        <Badge className="text-xs bg-violet-500/15 text-violet-500 border-violet-500/30 border">
                                            Roadmap Aktif
                                        </Badge>
                                    )}
                                    {alreadyApplied && (
                                        <Badge className="text-xs bg-emerald-500/15 text-emerald-500 border-emerald-500/30 border">
                                            ✓ Sudah Dilamar
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-muted-foreground flex items-center gap-1 mt-1 text-sm">
                                    {job.company}
                                    {job.location && (
                                        <span className="flex items-center gap-0.5">
                                            · <MapPin className="w-3 h-3" /> {job.location}
                                        </span>
                                    )}
                                    {job.is_remote && (
                                        <span className="flex items-center gap-0.5">
                                            · <Wifi className="w-3 h-3" /> Remote OK
                                        </span>
                                    )}
                                </p>
                            </div>

                            {/* ── Action buttons ── */}
                            <div className="flex flex-col gap-2 sm:items-end shrink-0">
                                {/* Apply button */}
                                {alreadyApplied ? (
                                    <div className="flex items-center gap-2">
                                        <Badge className="text-sm px-3 py-1.5 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 border">
                                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                                            Sudah Dilamar · {STATUS_LABELS[application?.status ?? ""] ?? application?.status}
                                        </Badge>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                        >
                                            <Link href="/dashboard/applications">
                                                <FileText className="w-3.5 h-3.5 mr-1.5" />
                                                Kelola Lamaran
                                            </Link>
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        id="apply-button"
                                        onClick={handleApplyClick}
                                        disabled={applyMutation.isPending}
                                        className={`shrink-0 transition-all duration-300 ${
                                            roadmapCompleted
                                                ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/40"
                                                : ""
                                        }`}
                                    >
                                        {applyMutation.isPending ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Memproses...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-4 h-4 mr-2" />
                                                Apply Sekarang
                                                {roadmapCompleted && (
                                                    <span className="ml-2 text-xs opacity-80">🎯</span>
                                                )}
                                            </>
                                        )}
                                    </Button>
                                )}

                                {/* Roadmap button */}
                                <Button asChild variant="outline" size="sm" className="shrink-0">
                                    <Link href={`/dashboard/roadmap?job_id=${job.id}`}>
                                        <BookOpen className="w-4 h-4 mr-2" />
                                        {hasRoadmap ? "Lanjutkan Roadmap" : "Buat Roadmap"}
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        {/* ── Roadmap progress bar (jika ada) ── */}
                        {hasRoadmap && bookmark && (
                            <div className="rounded-xl border bg-card p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium">Progress Roadmap</span>
                                    <span className={`text-sm font-bold ${roadmapCompleted ? "text-emerald-500" : "text-primary"}`}>
                                        {bookmark.completed_steps}/{bookmark.total_steps} langkah
                                        {roadmapCompleted && " ✓"}
                                    </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all duration-700 ${roadmapCompleted ? "bg-emerald-500" : "bg-primary"}`}
                                        style={{ width: `${bookmark.total_steps > 0 ? (bookmark.completed_steps / bookmark.total_steps) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── Match Score Bar visual ── */}
                        <MatchScoreBar score={job.match_score} />

                        {/* ── Ringkasan skill (3 stat cards) ── */}
                        {job.match_score != null && (
                            <div className="grid grid-cols-3 gap-3">
                                <Card className="text-center">
                                    <CardContent className="pt-4 pb-3">
                                        <p className="text-2xl font-bold text-primary">{totalRequired}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Skill dibutuhkan</p>
                                    </CardContent>
                                </Card>
                                <Card className="text-center">
                                    <CardContent className="pt-4 pb-3">
                                        <p className="text-2xl font-bold text-green-500">{ownedCount}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Sudah kamu miliki</p>
                                    </CardContent>
                                </Card>
                                <Card className="text-center">
                                    <CardContent className="pt-4 pb-3">
                                        <p className="text-2xl font-bold text-amber-500">{job.missing_skills.length}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Perlu dipelajari</p>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* ── Skill Gap ── */}
                        {job.missing_skills.length > 0 && (
                            <Card className="border-amber-500/30 bg-amber-500/5">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-amber-500 text-base">
                                        Skill yang perlu dikuasai untuk job ini
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-wrap gap-2">
                                    {job.missing_skills.map((s) => (
                                        <Badge key={s} variant="outline" className="border-amber-500/50 text-amber-600">
                                            {s}
                                        </Badge>
                                    ))}
                                </CardContent>
                            </Card>
                        )}

                        {job.missing_skills.length === 0 && job.match_score != null && (
                            <Card className="border-green-500/30 bg-green-500/5">
                                <CardContent className="pt-4 text-sm text-green-600 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Kamu sudah memiliki semua skill yang dibutuhkan job ini.
                                </CardContent>
                            </Card>
                        )}

                        {/* ── Why this score ── */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Kenapa skor ini?</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm text-muted-foreground">
                                {job.match_reasons.length > 0
                                    ? job.match_reasons.map((r) => <p key={r}>{r}</p>)
                                    : <p>Sync profilmu terlebih dahulu untuk melihat alasan skor.</p>
                                }
                            </CardContent>
                        </Card>

                        {/* ── Persyaratan Pekerjaan ── */}
                        {(job.salary || job.min_experience || job.min_education || job.work_type) && (
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">Persyaratan Pekerjaan</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        {job.salary && (
                                            <div className="flex flex-col gap-1 p-3 rounded-lg bg-emerald-500/8 border border-emerald-500/20">
                                                <div className="flex items-center gap-1.5 text-emerald-600">
                                                    <Wallet className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">Gaji</span>
                                                </div>
                                                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{job.salary}</p>
                                            </div>
                                        )}
                                        {job.min_experience && (
                                            <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted border border-border">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">Pengalaman</span>
                                                </div>
                                                <p className="text-sm font-semibold">{job.min_experience}</p>
                                            </div>
                                        )}
                                        {job.min_education && (
                                            <div className="flex flex-col gap-1 p-3 rounded-lg bg-muted border border-border">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <GraduationCap className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">Pendidikan</span>
                                                </div>
                                                <p className="text-sm font-semibold">{job.min_education}</p>
                                            </div>
                                        )}
                                        {job.work_type && (
                                            <div className="flex flex-col gap-1 p-3 rounded-lg bg-blue-500/8 border border-blue-500/20">
                                                <div className="flex items-center gap-1.5 text-blue-500">
                                                    <Briefcase className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-medium">Tipe Kerja</span>
                                                </div>
                                                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{job.work_type}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* ── Description ── */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Deskripsi</CardTitle>
                            </CardHeader>
                            <CardContent className="whitespace-pre-wrap text-sm">{job.description}</CardContent>
                        </Card>

                        {/* ── Required Skills ── */}
                        <div>
                            <h2 className="font-medium mb-2">Skill yang dibutuhkan</h2>
                            <div className="flex flex-wrap gap-1">
                                {job.required_skills.map((s) => {
                                    const isMissing = job.missing_skills
                                        .map((m) => m.toLowerCase())
                                        .includes(s.toLowerCase());
                                    return (
                                        <Badge
                                            key={s}
                                            variant={isMissing ? "secondary" : "outline"}
                                            className={
                                                isMissing
                                                    ? "opacity-60"
                                                    : "border-green-500/50 text-green-600"
                                            }
                                        >
                                            {isMissing ? "✗ " : "✓ "}
                                            {s}
                                        </Badge>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                <span className="text-green-600">✓ sudah kamu miliki</span>
                                {" · "}
                                <span className="opacity-60">✗ belum kamu miliki</span>
                            </p>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
