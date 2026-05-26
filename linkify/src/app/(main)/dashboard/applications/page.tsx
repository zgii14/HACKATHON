"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    BookOpen, CheckCircle2, ChevronDown, Copy, Download,
    ExternalLink, FileText, Info, Loader2, SendHorizonal,
    Trash2, X,
} from "lucide-react";
import {
    Document, Packer, Paragraph, TextRun, AlignmentType, convertInchesToTwip,
} from "docx";
import { saveAs } from "file-saver";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type ApplicationStatus = "applied" | "interview" | "interview_confirmed" | "rejected" | "offer";

type ApplicationOut = {
    id: string;
    job_id: string;
    job_title: string;
    job_company: string;
    job_location: string | null;
    apply_url: string | null;
    status: ApplicationStatus;
    note: string | null;
    applied_at: string;
    updated_at: string;
    roadmap_completed: boolean;
    match_score: number | null;
    recruiter_email?: string | null;
};

type BioData = {
    bio_full_name: string | null;
    bio_birth_place: string | null;
    bio_birth_date: string | null;
    bio_address: string | null;
    bio_phone: string | null;
};

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; className: string }> = {
    applied:   { label: "Dilamar",       className: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
    interview: { label: "Interview",     className: "bg-violet-500/15 text-violet-500 border-violet-500/30" },
    interview_confirmed: { label: "Hadir Wawancara ✓", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
    offer:     { label: "Dapat Offer! 🎉", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
    rejected:  { label: "Ditolak",       className: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
};

const ALL_STATUSES: ApplicationStatus[] = ["applied", "interview", "interview_confirmed", "offer", "rejected"];

// ── Cover Letter Modal ────────────────────────────────────────────────────────

function CoverLetterModal({
    app,
    fallbackName,
    onClose,
}: {
    app: ApplicationOut;
    fallbackName: string;
    onClose: () => void;
}) {
    const { withAuth, authReady } = useApi();
    const [letter, setLetter] = useState("");
    const [loading, setLoading] = useState(false);

    // Ambil bio data tersimpan
    const { data: bio } = useQuery({
        queryKey: ["biodata"],
        queryFn: () => withAuth<BioData>("/me/biodata"),
        enabled: authReady,
        staleTime: 10 * 60 * 1000,
    });

    const hasBio = bio && (bio.bio_birth_place || bio.bio_address || bio.bio_phone);
    const [nameInput, setNameInput] = useState(fallbackName);

    // Sync nameInput begitu bio data selesai di-fetch (jika user belum edit manual)
    useEffect(() => {
        if (bio?.bio_full_name) setNameInput(bio.bio_full_name);
    }, [bio?.bio_full_name]);

    const generate = async () => {
        if (!nameInput.trim()) {
            toast.error("Masukkan nama lengkap kamu terlebih dahulu.");
            return;
        }
        setLoading(true);
        try {
            const res = await withAuth<{ letter: string; job_title: string; job_company: string }>(
                `/applications/${app.job_id}/generate-letter`,
                {
                    method: "POST",
                    body: JSON.stringify({ full_name: nameInput }),
                }
            );
            setLetter(res.letter);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Gagal generate surat lamaran";
            toast.error(msg.length > 120 ? "Gagal generate surat lamaran. Coba lagi." : msg);
            console.error("[generate-letter]", err);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(letter);
        toast.success("Surat lamaran disalin ke clipboard!");
    };

    const downloadDocx = async () => {
        const FONT = "Times New Roman";
        const SIZE = 24; // 12pt
        const LINE_15 = 360; // 1.5 spacing (240 = single, 360 = 1.5x, 480 = double)

        const lines = letter.split("\n");

        const paragraphs = lines.map((line) => {
            const trimmed = line.trim();

            // Baris kosong → spacer paragraph
            if (trimmed === "") {
                return new Paragraph({
                    spacing: { line: LINE_15, lineRule: "auto" as const, after: 0 },
                    children: [new TextRun({ text: "", font: FONT, size: SIZE })],
                });
            }

            // Deteksi paragraf panjang (isi surat) → justify
            // Paragraf pendek (header, penutup, tanda tangan) → left
            const isBodyParagraph = trimmed.length > 60 && !trimmed.startsWith("Nama") &&
                !trimmed.startsWith("Tempat") && !trimmed.startsWith("Alamat") &&
                !trimmed.startsWith("Telepon") && !trimmed.startsWith("No.") &&
                !trimmed.startsWith("Kepada") && !trimmed.startsWith("HRD") &&
                !trimmed.startsWith("PT.") && !trimmed.startsWith("di Tempat") &&
                !trimmed.startsWith("Hormat") && !trimmed.startsWith("Ttd") &&
                !trimmed.startsWith("Dengan hormat") === false;

            // Paragraf "Dengan hormat" dan isi → justify
            const shouldJustify = trimmed.length > 80;

            return new Paragraph({
                alignment: shouldJustify
                    ? AlignmentType.JUSTIFIED
                    : AlignmentType.LEFT,
                spacing: {
                    line: LINE_15,
                    lineRule: "auto" as const,
                    after: 0,
                },
                children: [
                    new TextRun({
                        text: trimmed,
                        font: FONT,
                        size: SIZE,
                    }),
                ],
            });
        });

        const doc = new Document({
            sections: [
                {
                    properties: {
                        page: {
                            margin: {
                                top: convertInchesToTwip(1),
                                right: convertInchesToTwip(1),
                                bottom: convertInchesToTwip(1),
                                left: convertInchesToTwip(1.25),
                            },
                        },
                    },
                    children: paragraphs,
                },
            ],
        });

        const blob = await Packer.toBlob(doc);
        const filename = `Surat-Lamaran-${app.job_company.replace(/\s+/g, "-")}.docx`;
        saveAs(blob, filename);
        toast.success("Surat lamaran berhasil diunduh sebagai .docx!");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
                    <div>
                        <h3 className="font-semibold flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            Generate Surat Lamaran
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{app.job_title} · {app.job_company}</p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                    {/* Name input */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                            Nama Lengkap
                        </label>
                        <div className="flex gap-2">
                            <input
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                placeholder="Masukkan nama lengkap..."
                                className="flex-1 text-sm rounded-lg border border-border bg-muted/50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            <Button onClick={generate} disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <SendHorizonal className="w-3.5 h-3.5 mr-1.5" />
                                        Generate
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Status bio data */}
                        {hasBio ? (
                            <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                Data diri tersimpan akan dipakai otomatis (TTL, alamat, telepon)
                            </p>
                        ) : (
                            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5">
                                <Info className="w-3 h-3 shrink-0" />
                                <span>
                                    Lengkapi{" "}
                                    <Link href="/dashboard/profile" className="text-primary underline" onClick={onClose}>
                                        data diri
                                    </Link>
                                    {" "}untuk surat yang lebih lengkap (TTL, alamat, telepon).
                                </span>
                            </p>
                        )}
                    </div>

                    {/* Letter textarea */}
                    {letter && (
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Surat Lamaran (bisa diedit)
                                </label>
                                <div className="flex gap-1.5">
                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={copyToClipboard}>
                                        <Copy className="w-3 h-3 mr-1" />
                                        Copy
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={downloadDocx}>
                                        <Download className="w-3 h-3 mr-1" />
                                        Download .docx
                                    </Button>
                                </div>
                            </div>
                            <textarea
                                value={letter}
                                onChange={(e) => setLetter(e.target.value)}
                                rows={18}
                                className="w-full text-sm rounded-lg border border-border bg-muted/30 px-4 py-3 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                    )}

                    {!letter && !loading && (
                        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center">
                            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                                Klik <strong>Generate</strong> untuk membuat surat lamaran yang dipersonalisasi
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 opacity-70">
                                Proses memerlukan 5–10 detik
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Application Card ──────────────────────────────────────────────────────────

function ApplicationCard({
    app,
    fullName,
    onGenerateLetter,
}: {
    app: ApplicationOut;
    fullName: string;
    onGenerateLetter: (app: ApplicationOut) => void;
}) {
    const { withAuth } = useApi();
    const qc = useQueryClient();
    const [showStatusMenu, setShowStatusMenu] = useState(false);

    const statusMutation = useMutation({
        mutationFn: (status: ApplicationStatus) =>
            withAuth(`/applications/${app.job_id}/status`, {
                method: "PATCH",
                body: JSON.stringify({ status }),
            }),
        onMutate: async (newStatus) => {
            // Optimistic update
            const prev = qc.getQueryData<ApplicationOut[]>(["applications"]);
            qc.setQueryData<ApplicationOut[]>(["applications"], (old) =>
                old?.map((a) => a.job_id === app.job_id ? { ...a, status: newStatus } : a) ?? []
            );
            return { prev };
        },
        onSuccess: (_, newStatus) => {
            toast.success(`Status diperbarui ke "${STATUS_CONFIG[newStatus].label}"`);
            setShowStatusMenu(false);
        },
        onError: (_err, _vars, context) => {
            if (context?.prev) qc.setQueryData(["applications"], context.prev);
            toast.error("Gagal update status.");
        },
    });

    const withdrawMutation = useMutation({
        mutationFn: () =>
            withAuth(`/applications/${app.job_id}`, { method: "DELETE" }),
        onSuccess: () => {
            qc.setQueryData<ApplicationOut[]>(["applications"], (old) =>
                old?.filter((a) => a.job_id !== app.job_id) ?? []
            );
            qc.invalidateQueries({ queryKey: ["applications", app.job_id] });
            toast.success("Lamaran ditarik. Kamu bisa apply kembali kapan saja.");
        },
        onError: () => toast.error("Gagal menarik lamaran."),
    });

    const cfg = STATUS_CONFIG[app.status];
    const appliedDate = new Date(app.applied_at).toLocaleDateString("id-ID", {
        day: "numeric", month: "short", year: "numeric",
    });
    const matchPct = app.match_score != null ? Math.round(app.match_score * 100) : null;

    // Parse interview metadata if status is interview or interview_confirmed
    let interviewDetails: any = null;
    let isJsonNote = false;
    if ((app.status === "interview" || app.status === "interview_confirmed") && app.note) {
        try {
            interviewDetails = JSON.parse(app.note);
            isJsonNote = true;
        } catch (e) {
            interviewDetails = null;
            isJsonNote = false;
        }
    }

    return (
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4 hover:shadow-md transition-shadow">
            {/* Top row */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/dashboard/jobs/${app.job_id}`} className="font-semibold truncate hover:text-primary transition-colors">
                            {app.job_title}
                        </Link>
                        {app.roadmap_completed && (
                            <Badge className="text-xs bg-emerald-500/15 text-emerald-500 border-emerald-500/30 border shrink-0">
                                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                Roadmap Selesai
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {app.job_company}
                        {app.job_location && ` · ${app.job_location}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Dilamar {appliedDate}</p>
                </div>

                {/* Match score */}
                {matchPct != null && (
                    <div className="shrink-0 text-center">
                        <p className={`text-lg font-bold ${matchPct >= 60 ? "text-emerald-500" : matchPct >= 30 ? "text-amber-500" : "text-rose-500"}`}>
                            {matchPct}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">match</p>
                    </div>
                )}
            </div>

            {/* Note - Default raw string for non-interview / backward compat */}
            {app.note && !isJsonNote && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 italic">
                    &ldquo;{app.note}&rdquo;
                </p>
            )}

            {/* Glowing Ticket Undangan Wawancara */}
            {isJsonNote && interviewDetails && (
                <div className={`rounded-xl border p-4 space-y-3.5 relative overflow-hidden transition-all duration-300 ${
                    app.status === "interview_confirmed"
                        ? "border-emerald-500/20 bg-emerald-500/[0.02]"
                        : "border-violet-500/30 bg-violet-500/[0.02] shadow-[0_0_15px_rgba(139,92,246,0.06)] animate-pulse"
                }`}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/[0.02] blur-xl rounded-full pointer-events-none" />
                    
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block animate-ping" />
                            Undangan Wawancara
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                            {interviewDetails.type === "online" ? "💻 Online Meeting" : "🏢 Offline (Tatap Muka)"}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-0.5">
                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Jadwal & Waktu</span>
                            <p className="font-bold text-foreground">
                                {new Date(interviewDetails.datetime).toLocaleString("id-ID", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                })} WIB
                            </p>
                        </div>
                        <div className="space-y-0.5">
                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">
                                {interviewDetails.type === "online" ? "Link Meeting" : "Lokasi Kantor"}
                            </span>
                            {interviewDetails.type === "online" ? (
                                <a
                                    href={interviewDetails.location_or_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-bold text-primary underline break-all block hover:text-primary/80"
                                >
                                    {interviewDetails.location_or_link}
                                </a>
                            ) : (
                                <p className="font-bold text-foreground">{interviewDetails.location_or_link}</p>
                            )}
                        </div>
                    </div>

                    {interviewDetails.hr_message && (
                        <div className="pt-2.5 border-t border-border/30">
                            <span className="text-[9px] text-muted-foreground font-bold tracking-wider uppercase">Pesan dari HRD</span>
                            <p className="text-xs text-muted-foreground leading-relaxed italic mt-1">&ldquo;{interviewDetails.hr_message}&rdquo;</p>
                        </div>
                    )}

                    {/* Action Row */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/20">
                        {app.status === "interview" ? (
                            <Button
                                size="sm"
                                onClick={() => statusMutation.mutate("interview_confirmed")}
                                disabled={statusMutation.isPending}
                                className="h-7 text-[10px] font-bold gap-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/10"
                            >
                                ✓ Konfirmasi Hadir
                            </Button>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                                ✓ Kehadiran Telah Dikonfirmasi
                            </span>
                        )}

                        {/* WhatsApp / Email Dropdown */}
                        <div className="relative group">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-[10px] font-bold gap-1 rounded-lg border-muted-foreground/20"
                            >
                                💬 Hubungi Rekruter
                            </Button>
                            
                            <div className="absolute left-0 bottom-full pb-1.5 hidden group-hover:block z-20 min-w-[150px] animate-in slide-in-from-bottom-2 duration-200">
                                <div className="bg-background border border-border rounded-xl shadow-xl overflow-hidden">
                                    {interviewDetails.hr_phone && (
                                        <a
                                            href={`https://wa.me/${interviewDetails.hr_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                                `Halo Bapak/Ibu HRD ${app.job_company}, saya ${fullName || "Pelamar"}. Terkait dengan undangan wawancara posisi ${app.job_title} pada hari ${new Date(interviewDetails.datetime).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}...`
                                            )}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center px-3.5 py-2 text-[10px] hover:bg-muted text-foreground transition-colors font-medium border-b border-border/30"
                                        >
                                            WhatsApp Chat
                                        </a>
                                    )}
                                    <a
                                        href={`mailto:${app.recruiter_email || "recruiter@githire.com"}?subject=${encodeURIComponent(
                                            `Konfirmasi Wawancara - ${fullName || "Pelamar"}`
                                        )}&body=${encodeURIComponent(
                                            `Halo Bapak/Ibu HRD ${app.job_company},\n\nTerima kasih atas undangan wawancaranya. Saya ingin mengonfirmasi bahwa saya akan hadir pada jadwal yang telah ditentukan.\n\nHormat saya,\n${fullName || "Pelamar"}`
                                        )}`}
                                        className="flex items-center px-3.5 py-2 text-[10px] hover:bg-muted text-foreground transition-colors font-medium"
                                    >
                                        Kirim Email
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom row */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                {/* Status selector */}
                <div className="relative">
                    <button
                        onClick={() => setShowStatusMenu(!showStatusMenu)}
                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border ${cfg.className} transition-all hover:opacity-80`}
                    >
                        {cfg.label}
                        <ChevronDown className="w-3 h-3" />
                    </button>
                    {showStatusMenu && (
                        <div className="absolute left-0 top-full mt-1 z-10 bg-background border border-border rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                            {ALL_STATUSES.map((s) => (
                                <button
                                    key={s}
                                    onClick={() => statusMutation.mutate(s)}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${s === app.status ? "font-semibold" : ""}`}
                                >
                                    {STATUS_CONFIG[s].label}
                                    {s === app.status && " ✓"}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                    <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                        <Link href={`/dashboard/jobs/${app.job_id}`}>
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Detail
                        </Link>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onGenerateLetter(app)}
                    >
                        <FileText className="w-3 h-3 mr-1" />
                        Surat Lamaran
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                        <Link href={`/dashboard/roadmap?job_id=${app.job_id}`}>
                            <BookOpen className="w-3 h-3 mr-1" />
                            Roadmap
                        </Link>
                    </Button>
                    {app.apply_url && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() => window.open(app.apply_url!, "_blank", "noopener,noreferrer")}
                        >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Portal Lamaran
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-muted-foreground hover:text-rose-500"
                        onClick={() => withdrawMutation.mutate()}
                        disabled={withdrawMutation.isPending}
                    >
                        {withdrawMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <Trash2 className="w-3 h-3" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ApplicationsPage() {
    const { withAuth, authReady } = useApi();
    const { user } = useUser();
    const [activeFilter, setActiveFilter] = useState<ApplicationStatus | "all">("all");
    const [letterApp, setLetterApp] = useState<ApplicationOut | null>(null);

    const { data: applications = [], isLoading } = useQuery({
        queryKey: ["applications"],
        queryFn: () => withAuth<ApplicationOut[]>("/applications"),
        enabled: authReady,
        staleTime: 30_000,
    });

    const filtered = activeFilter === "all"
        ? applications
        : applications.filter((a) => a.status === activeFilter);

    const stats = {
        total: applications.length,
        interview: applications.filter((a) => a.status === "interview").length,
        offer: applications.filter((a) => a.status === "offer").length,
        rejected: applications.filter((a) => a.status === "rejected").length,
    };

    const fullName = user?.fullName ?? user?.firstName ?? "";

    return (
        <>
            {/* Cover Letter Modal */}
            {letterApp && (
                <CoverLetterModal
                    app={letterApp}
                    fallbackName={fullName}
                    onClose={() => setLetterApp(null)}
                />
            )}

            <div className="space-y-6 max-w-3xl">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <SendHorizonal className="w-6 h-6 text-primary" />
                        Lamaranku
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Pantau progress semua lamaran pekerjaan kamu di satu tempat.
                    </p>
                </div>

                {/* Stats */}
                {applications.length > 0 && (
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { label: "Total", value: stats.total, color: "text-foreground" },
                            { label: "Interview", value: stats.interview, color: "text-violet-500" },
                            { label: "Offer", value: stats.offer, color: "text-emerald-500" },
                            { label: "Ditolak", value: stats.rejected, color: "text-rose-500" },
                        ].map((s) => (
                            <div key={s.label} className="rounded-xl border bg-card p-3 text-center">
                                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filter tabs */}
                {applications.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                        {(["all", ...ALL_STATUSES] as const).map((f) => {
                            const isActive = activeFilter === f;
                            const count = f === "all" ? applications.length : applications.filter(a => a.status === f).length;
                            return (
                                <button
                                    key={f}
                                    onClick={() => setActiveFilter(f)}
                                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                                        isActive
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "border-border text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                    {f === "all" ? "Semua" : STATUS_CONFIG[f].label}
                                    <span className="ml-1.5 opacity-70">({count})</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Loading */}
                {isLoading && (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-32 rounded-2xl border bg-muted/30 animate-pulse" />
                        ))}
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && applications.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/10 py-16 text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
                            <SendHorizonal className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                            <h2 className="font-semibold">Belum ada lamaran</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Apply ke lowongan pertamamu untuk mulai tracking di sini.
                            </p>
                        </div>
                        <Button asChild>
                            <Link href="/dashboard/jobs">
                                Browse Lowongan
                            </Link>
                        </Button>
                    </div>
                )}

                {/* Empty filter state */}
                {!isLoading && applications.length > 0 && filtered.length === 0 && (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                        Tidak ada lamaran dengan status &ldquo;{activeFilter === "all" ? "semua" : STATUS_CONFIG[activeFilter].label}&rdquo;
                    </div>
                )}

                {/* Application list */}
                <div className="space-y-3">
                    {filtered.map((app) => (
                        <ApplicationCard
                            key={app.id}
                            app={app}
                            fullName={fullName}
                            onGenerateLetter={setLetterApp}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}
