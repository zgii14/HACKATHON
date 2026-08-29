"use client";

import { VerifiedSkill, VerifiedSkillList } from "@/components/dashboard/verified-skills";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { confirmDestructive } from "@/lib/confirm";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft,
    Download,
    Github,
    Sparkles,
    User,
    Award,
    Clock,
    X,
    Brain
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type CandidateCV = {
    summary?: string;
    education?: any[];
    work_experience?: any[];
    org_experience?: any[];
    training?: any[];
    skills?: {
        soft_skills?: string[];
        hard_skills?: string[];
        languages?: string[];
    };
    certifications?: string[];
};

type JobApplicant = {
    id: string;
    status: string;
    note: string | null;
    applied_at: string;
    match_score: number | null;
    applicant: {
        id: string;
        email: string | null;
        fullName: string | null;
        phone: string | null;
        address: string | null;
        github: string | null;
        cv_skills: string[];
        merged_skills: string[];
        verified_skills?: VerifiedSkill[];
        verified_skill_count?: number;
        cv_data: CandidateCV;
        has_cv?: boolean;
        cv_preference?: "form" | "original";
    };
};

type AIScreeningResult = {
    match_score: number;
    recommendation?: "interview" | "consider" | "reject";
    reasoning?: string;
    strengths: string[];
    weaknesses: string[];
    cached?: boolean;
};

export default function JobApplicantsPage({ params }: { params: { id: string } }) {
    const { withAuth, withAuthBlob, authReady } = useApi();

    const downloadApplicantCV = async (appId: string, name: string | null) => {
        try {
            const blob = await withAuthBlob(`/recruiter/applications/${appId}/cv`);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `CV-${(name || "kandidat").replace(/\s+/g, "_")}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("Gagal mengunduh CV pelamar.");
        }
    };
    const qc = useQueryClient();
    const [selectedApp, setSelectedApp] = useState<JobApplicant | null>(null);

    // State untuk Wawancara Modal
    const [showInterviewModal, setShowInterviewModal] = useState(false);
    const [interviewMethod, setInterviewMethod] = useState<"online" | "offline">("online");
    const [interviewDateTime, setInterviewDateTime] = useState("");
    const [interviewLocation, setInterviewLocation] = useState("");
    const [hrMessage, setHrMessage] = useState("");
    const [hrPhone, setHrPhone] = useState("");

    // Fetch daftar pelamar
    const { data: applicants = [], isLoading } = useQuery<JobApplicant[]>({
        queryKey: ["applicants", params.id],
        queryFn: () => withAuth(`/recruiter/jobs/my-jobs/${params.id}/applications`),
        enabled: authReady,
        staleTime: 15 * 1000,
    });

    // Fetch AI Screening untuk kandidat terpilih
    const { data: aiResult, isLoading: aiLoading, error: aiError, refetch: runAIScreening } = useQuery<AIScreeningResult>({
        queryKey: ["ai-screening", selectedApp?.id],
        queryFn: () => withAuth(`/recruiter/applications/${selectedApp?.id}/ai-screening`, { method: "POST" }),
        enabled: authReady && !!selectedApp?.id,
        staleTime: 60 * 1000,
        retry: false,
    });

    useEffect(() => {
        if (aiError) {
            const msg = (aiError as any)?.message || "";
            if (msg.includes("Kuota screening")) toast.error(msg + " — Lihat Tagihan", { autoClose: 5000 });
        }
    }, [aiError]);

    // Paksa analisis ulang (bypass cache backend via ?refresh=true)
    const refreshScreening = useMutation({
        mutationFn: () =>
            withAuth<AIScreeningResult>(`/recruiter/applications/${selectedApp?.id}/ai-screening?refresh=true`, { method: "POST" }),
        onSuccess: (data) => {
            qc.setQueryData(["ai-screening", selectedApp?.id], data);
            qc.invalidateQueries({ queryKey: ["billing-status"] });
            toast.success("Analisis diperbarui.");
        },
        onError: (e: any) => {
            const msg = e?.message || "";
            if (msg.includes("Kuota screening")) toast.error(msg + " — Lihat Tagihan", { autoClose: 5000 });
            else toast.error("Gagal menganalisis ulang.");
        },
    });

    // Mutation untuk mengupdate status pelamar
    const statusMutation = useMutation({
        mutationFn: ({ app_id, status, note }: { app_id: string; status: string; note?: string }) =>
            withAuth(`/recruiter/applications/${app_id}/status`, {
                method: "PUT",
                body: JSON.stringify({ status, note }),
            }),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ["applicants", params.id] });
            toast.success("Status lamaran berhasil diperbarui!");
            if (selectedApp?.id === variables.app_id) {
                setSelectedApp((prev) => prev ? { ...prev, status: variables.status, note: variables.note || null } : null);
            }
        },
        onError: (err: any) => {
            toast.error(err.message || "Gagal memperbarui status.");
        },
    });

    const handleStatusChange = (app_id: string, newStatus: string) => {
        if (newStatus === "interview") {
            if (selectedApp && selectedApp.note) {
                try {
                    const existing = JSON.parse(selectedApp.note);
                    if (existing.datetime || existing.location_or_link) {
                        setInterviewMethod(existing.type || "online");
                        setInterviewDateTime(existing.datetime || "");
                        setInterviewLocation(existing.location_or_link || "");
                        setHrMessage(existing.hr_message || "");
                        setHrPhone(existing.hr_phone || "");
                        setShowInterviewModal(true);
                        return;
                    }
                } catch (e) {
                    // ignore and fallback to blank form
                }
            }
            setInterviewMethod("online");
            setInterviewDateTime("");
            setInterviewLocation("");
            setHrMessage("");
            setHrPhone("");
            setShowInterviewModal(true);
            return;
        }
        statusMutation.mutate({ app_id, status: newStatus });
    };

    const submitInterviewInvitation = () => {
        if (!selectedApp) return;
        if (!interviewDateTime || !interviewLocation) {
            toast.error("Mohon lengkapi jadwal dan link/alamat wawancara.");
            return;
        }
        const notePayload = JSON.stringify({
            type: interviewMethod,
            datetime: interviewDateTime,
            location_or_link: interviewLocation,
            hr_message: hrMessage,
            hr_phone: hrPhone,
        });
        statusMutation.mutate({
            app_id: selectedApp.id,
            status: "interview",
            note: notePayload,
        });
        setShowInterviewModal(false);
    };


    if (isLoading) {
        return (
            <div className="space-y-4 max-w-4xl">
                <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
                <div className="h-64 rounded-2xl border bg-card animate-pulse" />
            </div>
        );
    }

    const VERDICT: Record<string, { label: string; cls: string }> = {
        interview: { label: "Rekomendasi: Interview", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
        consider: { label: "Rekomendasi: Pertimbangkan", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
        reject: { label: "Rekomendasi: Tolak", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
    };

    return (
        <div className="space-y-6 max-w-5xl pb-16 relative">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold mb-1">
                        <Link href="/dashboard/recruiter/jobs" className="hover:text-primary transition-colors flex items-center gap-1">
                            <ArrowLeft className="w-3.5 h-3.5" /> Portal Recruiter
                        </Link>
                        <span>/</span>
                        <span className="text-foreground">Detail Pelamar</span>
                    </div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <User className="w-6 h-6 text-primary" />
                        Daftar Pelamar Lowongan
                    </h1>
                </div>
            </div>

            {/* List and Detail Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Side: Applicants List */}
                <div className="lg:col-span-5 space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Semua Pelamar ({applicants.length})</h3>
                    {[...applicants].sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0)).map((app) => (
                        <div
                            key={app.id}
                            onClick={() => setSelectedApp(app)}
                            className={`rounded-2xl border p-4 space-y-2 cursor-pointer transition-all duration-300 ${
                                selectedApp?.id === app.id
                                    ? "border-primary bg-primary/[0.03] shadow-md shadow-primary/5"
                                    : "border-border bg-card hover:bg-muted/10"
                            }`}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <h4 className="font-bold text-xs text-foreground truncate">
                                    {app.applicant.fullName || "Kandidat Tanpa Nama"}
                                </h4>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${
                                    {
                                        applied: "bg-blue-500/10 text-blue-400",
                                        interview: "bg-amber-500/10 text-amber-400",
                                        interview_confirmed: "bg-emerald-500/10 text-emerald-400",
                                        offer: "bg-emerald-500/10 text-emerald-400",
                                        rejected: "bg-rose-500/10 text-rose-400"
                                    }[app.status] || "bg-muted text-muted-foreground"
                                }`}>
                                    {app.status === "interview_confirmed" ? "CONFIRMED" : app.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1 font-medium">
                                    <Github className="w-3.5 h-3.5" />
                                    {app.applicant.github || "-"}
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {new Date(app.applied_at).toLocaleDateString("id-ID")}
                                </span>
                                {app.match_score != null && (
                                    <>
                                        <span>•</span>
                                        <span className="text-emerald-400 font-bold">
                                            Match: {Math.round(app.match_score * 100)}%
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {applicants.length === 0 && (
                        <div className="text-center py-12 border border-dashed rounded-2xl bg-muted/5">
                            <p className="text-xs text-muted-foreground italic">Belum ada yang melamar pada lowongan ini.</p>
                        </div>
                    )}
                </div>

                {/* Right Side: Applicant details & AI Match Score panel */}
                <div className="lg:col-span-7">
                    {selectedApp ? (
                        <div className="rounded-3xl border border-border bg-card p-6 space-y-6 shadow-lg shadow-black/[0.02]">
                            
                            {/* Profile details */}
                            <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-4">
                                <div className="space-y-1">
                                    <h2 className="font-black text-lg text-foreground">
                                        {selectedApp.applicant.fullName || "Kandidat Tanpa Nama"}
                                    </h2>
                                    <p className="text-xs text-muted-foreground font-semibold">
                                        {selectedApp.applicant.email}
                                    </p>
                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1.5">
                                        <span>Telp: {selectedApp.applicant.phone || "-"}</span>
                                        <span>•</span>
                                        <span>Alamat: {selectedApp.applicant.address || "-"}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-1.5">
                                    <Button
                                        size="sm"
                                        onClick={() => downloadApplicantCV(selectedApp.id, selectedApp.applicant.fullName)}
                                        className="h-8 text-xs gap-1 px-3 rounded-lg bg-primary hover:brightness-110 text-primary-foreground font-semibold"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        Unduh CV (PDF)
                                    </Button>
                                    <span className="text-[9px] text-muted-foreground">
                                        {selectedApp.applicant.cv_preference === "original"
                                            ? "versi: PDF asli kandidat"
                                            : "versi: form (ATS)"}
                                    </span>
                                </div>
                            </div>

                            {/* AI Match Screening Panel */}
                            <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.04] to-fuchsia-500/[0.04] p-5 space-y-4 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 blur-2xl rounded-full pointer-events-none" />
                                
                                <div className="flex items-center justify-between border-b border-violet-500/10 pb-3">
                                    <h3 className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
                                        <Brain className="w-4 h-4 text-violet-400" />
                                        Hasil Screening AI (Gemini)
                                    </h3>
                                    <button
                                        onClick={() => refreshScreening.mutate()}
                                        disabled={refreshScreening.isPending || !selectedApp?.id}
                                        className="text-[10px] font-semibold flex items-center gap-1 text-violet-300 hover:text-violet-200 disabled:opacity-50"
                                    >
                                        <Sparkles className="w-3 h-3 text-amber-400" />
                                        {refreshScreening.isPending ? "Menganalisis…" : "Analisis ulang"}
                                    </button>
                                </div>

                                {aiError ? (
                                    <div className="text-center py-6 space-y-2">
                                        <p className="text-xs font-semibold text-amber-600">{(aiError as any)?.message || "Gagal memuat screening"}</p>
                                        <Link href="/dashboard/recruiter/billing" className="text-xs font-medium text-violet-600 hover:underline">Lihat Tagihan →</Link>
                                    </div>
                                ) : aiLoading ? (
                                    <div className="flex flex-col items-center justify-center py-6 space-y-2">
                                        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                                        <p className="text-[10px] text-muted-foreground animate-pulse font-medium">Gemini sedang menganalisis kecocokan pelamar...</p>
                                    </div>
                                ) : aiResult ? (
                                    <div>
                                    {aiResult.recommendation && (
                                        <div className="mb-4 space-y-2">
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${VERDICT[aiResult.recommendation]?.cls ?? ""}`}>
                                                {VERDICT[aiResult.recommendation]?.label ?? aiResult.recommendation}
                                            </span>
                                            {aiResult.reasoning && (
                                                <p className="text-xs text-muted-foreground leading-relaxed">{aiResult.reasoning}</p>
                                            )}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">

                                        {/* Match Score donut circle */}
                                        <div className="md:col-span-4 flex flex-col items-center justify-center">
                                            <div className="relative w-20 h-20 flex items-center justify-center">
                                                <svg width="80" height="80" className="-rotate-90">
                                                    <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="4" className="text-violet-500/10" />
                                                    <circle cx="40" cy="40" r="34" fill="none" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 - (aiResult.match_score / 100) * (2 * Math.PI * 34)} />
                                                </svg>
                                                <span className="absolute text-base font-black text-violet-300">{aiResult.match_score}%</span>
                                            </div>
                                            <span className="text-[9px] font-semibold text-violet-400 mt-1 uppercase tracking-wider">Match Score</span>
                                        </div>

                                        {/* Strengths & Weaknesses */}
                                        <div className="md:col-span-8 space-y-3">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-bold text-emerald-400 uppercase">Kekuatan (Strengths)</span>
                                                {aiResult.strengths.map((str, idx) => (
                                                    <p key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                                                        <span className="text-emerald-400 mt-0.5">•</span>
                                                        {str}
                                                    </p>
                                                ))}
                                            </div>
                                            <div className="space-y-1 pt-1">
                                                <span className="text-[9px] font-bold text-rose-400 uppercase">Kesenjangan (Weaknesses)</span>
                                                {aiResult.weaknesses.map((weak, idx) => (
                                                    <p key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
                                                        <span className="text-rose-400 mt-0.5">•</span>
                                                        {weak}
                                                    </p>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <Button
                                            onClick={() => runAIScreening()}
                                            className="h-8 text-xs gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/10"
                                        >
                                            <Brain className="w-3.5 h-3.5" />
                                            Jalankan AI Screening
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* GitHub signals panel */}
                            <div className="rounded-2xl border border-border bg-muted/10 p-5 space-y-3">
                                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Github className="w-4 h-4 text-sky-400" />
                                    GitHub Signal Portofolio
                                </h3>
                                
                                {selectedApp.applicant.github ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground font-semibold uppercase">Username</span>
                                                <p className="text-xs font-bold text-foreground">@{selectedApp.applicant.github}</p>
                                            </div>
                                            <div className="space-y-0.5">
                                                <span className="text-[9px] text-muted-foreground font-semibold uppercase">Declared Skills (GitHub + CV)</span>
                                                <div className="flex flex-wrap gap-1 pt-1">
                                                    {selectedApp.applicant.merged_skills.slice(0, 5).map((s) => (
                                                        <Badge key={s} variant="outline" className="text-[8px] px-1.5 py-0.5 rounded bg-muted/40 font-medium">
                                                            {s}
                                                        </Badge>
                                                    ))}
                                                    {selectedApp.applicant.merged_skills.length > 5 && (
                                                        <span className="text-[8px] text-muted-foreground font-semibold">+{selectedApp.applicant.merged_skills.length - 5} lainnya</span>
                                                    )}
                                                </div>
                                                <p className="text-[9px] text-muted-foreground pt-1">Klaim dari CV/topics — belum tentu ada bukti commit.</p>
                                            </div>
                                        </div>

                                        {/* Skill terverifikasi — bukti commit di repo non-fork milik kandidat */}
                                        <div className="border-t border-border pt-3">
                                            <span className="text-[9px] text-muted-foreground font-semibold uppercase">
                                                Skill terverifikasi (bukti commit)
                                            </span>
                                            {(selectedApp.applicant.verified_skills ?? []).length > 0 ? (
                                                <div className="mt-1.5">
                                                    <VerifiedSkillList
                                                        items={selectedApp.applicant.verified_skills ?? []}
                                                        initial={4}
                                                        showRepos
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground italic pt-1.5">
                                                    Belum ada bukti commit yang cukup.
                                                </p>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-xs text-muted-foreground italic py-1">Kandidat belum menghubungkan portofolio GitHub mereka.</p>
                                )}
                            </div>

                            {/* Recruiter Action Pipeline */}
                            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Award className="w-4 h-4 text-emerald-400" />
                                    Kelola Alur & Status Pelamar
                                </h3>
                                
                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                    <Button
                                        onClick={() => handleStatusChange(selectedApp.id, "interview")}
                                        disabled={statusMutation.isPending}
                                        className={`h-8 text-xs rounded-lg px-4 ${
                                            selectedApp.status === "interview"
                                                ? "bg-amber-500 hover:bg-amber-600 text-white font-bold"
                                                : selectedApp.status === "interview_confirmed"
                                                ? "bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        }`}
                                    >
                                        {selectedApp.status === "interview_confirmed" ? "Dikonfirmasi Hadir ✓" : "Wawancara (Interview)"}
                                    </Button>
                                    <Button
                                        onClick={() => handleStatusChange(selectedApp.id, "offer")}
                                        disabled={statusMutation.isPending}
                                        className={`h-8 text-xs rounded-lg px-4 ${
                                            selectedApp.status === "offer"
                                                ? "bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        }`}
                                    >
                                        Terima (Offer)
                                    </Button>
                                    <Button
                                        onClick={async () => {
                                            if (
                                                await confirmDestructive({
                                                    title: "Tolak pelamar ini?",
                                                    text: "Pelamar akan ditandai sebagai ditolak.",
                                                    confirmText: "Ya, tolak",
                                                })
                                            )
                                                handleStatusChange(selectedApp.id, "rejected");
                                        }}
                                        disabled={statusMutation.isPending}
                                        className={`h-8 text-xs rounded-lg px-4 ${
                                            selectedApp.status === "rejected"
                                                ? "bg-rose-500 hover:bg-rose-600 text-white font-bold"
                                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        }`}
                                    >
                                        Tolak (Reject)
                                    </Button>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="rounded-3xl border border-dashed border-border/60 bg-muted/[0.01] p-12 text-center space-y-4">
                            <div className="w-12 h-12 rounded-2xl border bg-card mx-auto flex items-center justify-center text-muted-foreground">
                                <User className="w-6 h-6" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-bold text-sm text-foreground">Review Portofolio & AI Screening</h3>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                                    Pilih salah satu pelamar di panel sebelah kiri untuk menganalisis portofolio GitHub, menjalankan AI Screening, dan mengunduh CV mereka.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Modal Undangan Wawancara */}
            {showInterviewModal && selectedApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 blur-2xl rounded-full pointer-events-none" />
                        
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                                <Brain className="w-4 h-4 text-violet-400" />
                                Kirim Undangan Wawancara
                            </h3>
                            <button
                                onClick={() => setShowInterviewModal(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-semibold text-muted-foreground mb-1">Metode Wawancara</label>
                                <select
                                    value={interviewMethod}
                                    onChange={(e) => {
                                        setInterviewMethod(e.target.value as "online" | "offline");
                                        setInterviewLocation("");
                                    }}
                                    className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="online">Online (Google Meet / Zoom)</option>
                                    <option value="offline">Offline (Tatap Muka di Kantor)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-muted-foreground mb-1">Jadwal (Tanggal & Waktu)</label>
                                <input
                                    type="datetime-local"
                                    value={interviewDateTime}
                                    onChange={(e) => setInterviewDateTime(e.target.value)}
                                    className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-muted-foreground mb-1">
                                    {interviewMethod === "online" ? "Link Video Conference" : "Alamat Lengkap Kantor"}
                                </label>
                                <input
                                    type="text"
                                    value={interviewLocation}
                                    onChange={(e) => setInterviewLocation(e.target.value)}
                                    placeholder={interviewMethod === "online" ? "https://meet.google.com/abc-defg-hij" : "Jl. Jenderal Sudirman No. 123..."}
                                    className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-muted-foreground mb-1">Nomor WhatsApp Kontak (Opsional)</label>
                                <input
                                    type="text"
                                    value={hrPhone}
                                    onChange={(e) => setHrPhone(e.target.value)}
                                    placeholder="Contoh: 083173289305"
                                    className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-muted-foreground mb-1">Pesan Khusus untuk Kandidat (Opsional)</label>
                                <textarea
                                    value={hrMessage}
                                    onChange={(e) => setHrMessage(e.target.value)}
                                    placeholder="Mohon siapkan laptop dan draf portofolio Anda..."
                                    rows={3}
                                    className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowInterviewModal(false)}
                                className="h-8 text-xs px-4"
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={submitInterviewInvitation}
                                className="h-8 text-xs px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                            >
                                Kirim Undangan
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
