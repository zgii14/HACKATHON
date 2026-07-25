"use client";

// Hallmark · genre: modern-minimal · macrostructure: Workbench (app-surface) · theme: GitHire violet (locked)

import {
    ActionLink,
    AnimatePresence,
    CountUp,
    EASE_OUT,
    EmptyState,
    MatchCell,
    PageHeader,
    Reveal,
    motion,
    useReducedMotion,
} from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlignmentType, convertInchesToTwip, Document, Packer, Paragraph, TextRun } from "docx";
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

// Status → label + tone token (bukan rainbow; pakai token theme)
const STATUS_CONFIG: Record<ApplicationStatus, { label: string; cls: string }> = {
    applied: { label: "DILAMAR", cls: "border-border text-muted-foreground" },
    interview: { label: "INTERVIEW", cls: "border-primary/40 text-primary" },
    interview_confirmed: { label: "HADIR ✓", cls: "border-success/40 text-success" },
    offer: { label: "OFFER", cls: "border-success/40 text-success" },
    rejected: { label: "DITOLAK", cls: "border-destructive/40 text-destructive" },
};

const ALL_STATUSES: ApplicationStatus[] = ["applied", "interview", "interview_confirmed", "offer", "rejected"];

function StatusTag({ status }: { status: ApplicationStatus }) {
    const cfg = STATUS_CONFIG[status];
    return (
        <span className={`rounded-[3px] border px-1.5 py-px font-mono text-[10px] font-semibold tracking-[0.05em] ${cfg.cls}`}>
            {cfg.label}
        </span>
    );
}

// ── Cover Letter Modal (logic tidak diubah) ──────────────────────────────────
function CoverLetterModal({ app, fallbackName, onClose }: { app: ApplicationOut; fallbackName: string; onClose: () => void }) {
    const { withAuth, authReady } = useApi();
    const [letter, setLetter] = useState("");
    const [loading, setLoading] = useState(false);

    const { data: bio } = useQuery({
        queryKey: ["biodata"],
        queryFn: () => withAuth<BioData>("/me/biodata"),
        enabled: authReady,
        staleTime: 10 * 60 * 1000,
    });

    const hasBio = bio && (bio.bio_birth_place || bio.bio_address || bio.bio_phone);
    const [nameInput, setNameInput] = useState(fallbackName);

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
                { method: "POST", body: JSON.stringify({ full_name: nameInput }) }
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
        const SIZE = 24;
        const LINE_15 = 360;
        const lines = letter.split("\n");
        const paragraphs = lines.map((line) => {
            const trimmed = line.trim();
            if (trimmed === "") {
                return new Paragraph({
                    spacing: { line: LINE_15, lineRule: "auto" as const, after: 0 },
                    children: [new TextRun({ text: "", font: FONT, size: SIZE })],
                });
            }
            const shouldJustify = trimmed.length > 80;
            return new Paragraph({
                alignment: shouldJustify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
                spacing: { line: LINE_15, lineRule: "auto" as const, after: 0 },
                children: [new TextRun({ text: trimmed, font: FONT, size: SIZE })],
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
        saveAs(blob, `Surat-Lamaran-${app.job_company.replace(/\s+/g, "-")}.docx`);
        toast.success("Surat lamaran berhasil diunduh sebagai .docx!");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-background shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-border p-5">
                    <div>
                        <h3 className="text-[15px] font-bold">Generate surat lamaran</h3>
                        <p className="mt-0.5 font-mono text-[11.5px] text-muted-foreground">
                            {app.job_title} · {app.job_company}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Tutup">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4">
                            <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-5">
                    <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                            Nama lengkap
                        </label>
                        <div className="flex gap-2">
                            <input
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                placeholder="Masukkan nama lengkap…"
                                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                            />
                            <button
                                onClick={generate}
                                disabled={loading}
                                className="shrink-0 rounded-md bg-primary px-4 py-2 text-[12.5px] font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            >
                                {loading ? "Generating…" : "Generate"}
                            </button>
                        </div>
                        {hasBio ? (
                            <p className="mt-1.5 font-mono text-[11px] text-success">Data diri tersimpan dipakai otomatis (TTL, alamat, telepon)</p>
                        ) : (
                            <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                                Lengkapi{" "}
                                <Link href="/dashboard/profile" className="font-semibold text-primary hover:underline" onClick={onClose}>
                                    data diri
                                </Link>{" "}
                                untuk surat yang lebih lengkap.
                            </p>
                        )}
                    </div>

                    {letter ? (
                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <label className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Surat lamaran (bisa diedit)</label>
                                <div className="flex gap-3">
                                    <button onClick={copyToClipboard} className="text-[12px] font-semibold text-primary hover:underline">Copy</button>
                                    <button onClick={downloadDocx} className="text-[12px] font-semibold text-primary hover:underline">Download .docx</button>
                                </div>
                            </div>
                            <textarea
                                value={letter}
                                onChange={(e) => setLetter(e.target.value)}
                                rows={18}
                                className="w-full resize-y rounded-md border border-border bg-muted/30 px-4 py-3 font-mono text-[13px] focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                            />
                        </div>
                    ) : (
                        !loading && (
                            <div className="border border-dashed border-border py-10 text-center">
                                <p className="text-[13px] text-muted-foreground">
                                    Klik <span className="font-semibold text-foreground">Generate</span> untuk membuat surat lamaran terpersonalisasi.
                                </p>
                                <p className="mt-1 font-mono text-[11px] text-muted-foreground">proses 5–10 detik</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Application row (expandable) ─────────────────────────────────────────────
function ApplicationRow({
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
    const reduced = useReducedMotion();
    const [open, setOpen] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);

    const statusMutation = useMutation({
        mutationFn: (status: ApplicationStatus) =>
            withAuth(`/applications/${app.job_id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
        onMutate: async (newStatus) => {
            const prev = qc.getQueryData<ApplicationOut[]>(["applications"]);
            qc.setQueryData<ApplicationOut[]>(["applications"], (old) =>
                old?.map((a) => (a.job_id === app.job_id ? { ...a, status: newStatus } : a)) ?? []
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
        mutationFn: () => withAuth(`/applications/${app.job_id}`, { method: "DELETE" }),
        onSuccess: () => {
            qc.setQueryData<ApplicationOut[]>(["applications"], (old) => old?.filter((a) => a.job_id !== app.job_id) ?? []);
            qc.invalidateQueries({ queryKey: ["applications", app.job_id] });
            toast.success("Lamaran ditarik. Kamu bisa apply kembali kapan saja.");
        },
        onError: () => toast.error("Gagal menarik lamaran."),
    });

    const appliedDate = new Date(app.applied_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

    // Parse metadata interview (JSON note)
    let interviewDetails: any = null;
    let isJsonNote = false;
    if ((app.status === "interview" || app.status === "interview_confirmed") && app.note) {
        try {
            interviewDetails = JSON.parse(app.note);
            isJsonNote = true;
        } catch {
            interviewDetails = null;
            isJsonNote = false;
        }
    }
    let formattedDate = "";
    let formattedTime = "";
    if (interviewDetails?.datetime) {
        try {
            formattedDate = new Date(interviewDetails.datetime).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
            formattedTime = new Date(interviewDetails.datetime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
        } catch {
            /* fallback */
        }
    }

    return (
        <li className="border-t border-border/60 last:border-b">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-4 py-3 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
                <span className="min-w-0">
                    <span className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-semibold leading-tight">{app.job_title}</span>
                        {app.roadmap_completed && (
                            <span className="shrink-0 rounded-[3px] border border-success/40 px-1.5 py-px font-mono text-[9.5px] font-semibold text-success">ROADMAP ✓</span>
                        )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {app.job_company}
                        {app.job_location ? ` · ${app.job_location}` : ""} · dilamar {appliedDate}
                    </span>
                </span>
                <StatusTag status={app.status} />
                <span className="hidden shrink-0 sm:block">
                    <MatchCell score={app.match_score} />
                </span>
                <motion.span
                    aria-hidden="true"
                    className="text-muted-foreground"
                    animate={{ rotate: open ? 90 : 0 }}
                    transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                </motion.span>
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="panel"
                        className="overflow-hidden"
                        initial={reduced ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: reduced ? 0.12 : 0.3, ease: EASE_OUT }}
                    >
                        <div className="space-y-4 pb-4 pr-1">
                            {/* Note biasa */}
                            {app.note && !isJsonNote && (
                                <p className="border-l-2 border-border pl-3 text-[13px] text-muted-foreground">{app.note}</p>
                            )}

                            {/* Tiket undangan wawancara */}
                            {isJsonNote && interviewDetails && (
                                <div className="border-l-2 border-primary bg-primary/[0.04] px-4 py-3">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-primary">Undangan wawancara</span>
                                        <span className="font-mono text-[10.5px] text-muted-foreground">
                                            {interviewDetails.type === "online" ? "online meeting" : "offline / tatap muka"}
                                        </span>
                                    </div>
                                    <div className="grid gap-3 text-[13px] sm:grid-cols-2">
                                        <div>
                                            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">Jadwal</span>
                                            <p className="font-semibold">
                                                {new Date(interviewDetails.datetime).toLocaleString("id-ID", {
                                                    weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
                                                })}{" "}
                                                WIB
                                            </p>
                                        </div>
                                        <div>
                                            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                                                {interviewDetails.type === "online" ? "Link meeting" : "Lokasi"}
                                            </span>
                                            {interviewDetails.type === "online" ? (
                                                <a href={interviewDetails.location_or_link} target="_blank" rel="noopener noreferrer" className="block break-all font-semibold text-primary hover:underline">
                                                    {interviewDetails.location_or_link}
                                                </a>
                                            ) : (
                                                <p className="font-semibold">{interviewDetails.location_or_link}</p>
                                            )}
                                        </div>
                                    </div>
                                    {interviewDetails.hr_message && (
                                        <p className="mt-2.5 border-t border-border/40 pt-2 text-[12.5px] text-muted-foreground">
                                            Pesan HRD: {interviewDetails.hr_message}
                                        </p>
                                    )}
                                    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/40 pt-3">
                                        {app.status === "interview" ? (
                                            <button
                                                onClick={() => statusMutation.mutate("interview_confirmed")}
                                                disabled={statusMutation.isPending}
                                                className="rounded-md bg-success px-3 py-1.5 text-[12px] font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                ✓ Konfirmasi hadir
                                            </button>
                                        ) : (
                                            <span className="font-mono text-[11.5px] font-semibold text-success">✓ kehadiran dikonfirmasi</span>
                                        )}
                                        {interviewDetails.hr_phone && (
                                            <a
                                                href={`https://wa.me/${interviewDetails.hr_phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                                    `Halo Bapak/Ibu HRD ${app.job_company}, saya ${fullName || "Pelamar"}. Terkait undangan wawancara posisi ${app.job_title}...`
                                                )}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[12px] font-semibold text-primary hover:underline"
                                            >
                                                WhatsApp HRD
                                            </a>
                                        )}
                                        <a
                                            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${app.recruiter_email || "recruiter@githire.com"}&su=${encodeURIComponent(
                                                `Konfirmasi Wawancara - ${fullName || "Pelamar"}`
                                            )}&body=${encodeURIComponent(
                                                `Selamat pagi/siang Bapak/Ibu HRD,\nPerkenalkan saya ${fullName || "Pelamar"}, kandidat untuk posisi ${app.job_title}.\n\nSaya konfirmasi hadir pada interview ${formattedDate} pukul ${formattedTime} WIB.\n\nHormat saya,\n${fullName || "Pelamar"}`
                                            )}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[12px] font-semibold text-primary hover:underline"
                                        >
                                            Kirim email
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Aksi + status */}
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowStatusMenu((v) => !v)}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:border-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        Ubah status
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3">
                                            <path d="m6 9 6 6 6-6" />
                                        </svg>
                                    </button>
                                    {showStatusMenu && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setShowStatusMenu(false)} />
                                            <div className="absolute left-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-md border border-border bg-background py-1 shadow-lg">
                                                {ALL_STATUSES.map((s) => (
                                                    <button
                                                        key={s}
                                                        onClick={() => statusMutation.mutate(s)}
                                                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-[12.5px] transition-colors hover:bg-muted ${
                                                            s === app.status ? "font-semibold text-primary" : "text-foreground"
                                                        }`}
                                                    >
                                                        {STATUS_CONFIG[s].label}
                                                        {s === app.status && " ✓"}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <ActionLink href={`/dashboard/jobs/${app.job_id}`}>Detail job</ActionLink>
                                <button onClick={() => onGenerateLetter(app)} className="text-[12.5px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                    Surat lamaran
                                </button>
                                <Link href={`/dashboard/roadmap?job_id=${app.job_id}`} className="text-[12.5px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                    Roadmap
                                </Link>
                                {app.apply_url && (
                                    <a href={app.apply_url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-muted-foreground hover:text-foreground">
                                        Portal lamaran ↗
                                    </a>
                                )}
                                <button
                                    onClick={() => withdrawMutation.mutate()}
                                    disabled={withdrawMutation.isPending}
                                    className="ml-auto text-[12px] text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    {withdrawMutation.isPending ? "Menarik…" : "Tarik lamaran"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </li>
    );
}

// ── Main ─────────────────────────────────────────────────────────────────────
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

    const filtered = activeFilter === "all" ? applications : applications.filter((a) => a.status === activeFilter);
    const stats = {
        total: applications.length,
        interview: applications.filter((a) => a.status === "interview" || a.status === "interview_confirmed").length,
        offer: applications.filter((a) => a.status === "offer").length,
        rejected: applications.filter((a) => a.status === "rejected").length,
    };
    const fullName = user?.fullName ?? user?.firstName ?? "";

    return (
        <>
            {letterApp && <CoverLetterModal app={letterApp} fallbackName={fullName} onClose={() => setLetterApp(null)} />}

            <div className="w-full">
                <PageHeader
                    crumb="dasbor / lamaranku"
                    title="Lamaranku"
                    sub="Pantau progress semua lamaran pekerjaan di satu tempat. Klik baris untuk kelola status & aksi."
                />

                {applications.length > 0 && (
                    <Reveal delay={0.05}>
                        <div className="grid grid-cols-4 border-y border-border">
                            {[
                                { k: "Total", v: stats.total },
                                { k: "Interview", v: stats.interview },
                                { k: "Offer", v: stats.offer },
                                { k: "Ditolak", v: stats.rejected },
                            ].map((s, i) => (
                                <div key={s.k} className={`px-5 py-4 ${i > 0 ? "border-l border-border" : ""}`}>
                                    <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{s.k}</p>
                                    <p className="mt-1 font-mono text-[26px] font-semibold tabular-nums tracking-tight">
                                        <CountUp value={s.v} />
                                    </p>
                                </div>
                            ))}
                        </div>
                    </Reveal>
                )}

                {applications.length > 0 && (
                    <Reveal delay={0.1}>
                        <div className="flex flex-wrap items-center gap-1 border-b border-border pt-5">
                            {(["all", ...ALL_STATUSES] as const).map((f) => {
                                const count = f === "all" ? applications.length : applications.filter((a) => a.status === f).length;
                                return (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setActiveFilter(f)}
                                        aria-current={activeFilter === f ? "true" : undefined}
                                        className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                                            activeFilter === f ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        {f === "all" ? "Semua" : STATUS_CONFIG[f].label.replace(" ✓", "")}
                                        <span className="ml-1.5 font-mono text-[10.5px] text-muted-foreground">{count}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </Reveal>
                )}

                {isLoading ? (
                    <div className="mt-5 space-y-2 border-t border-border pt-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-12 animate-pulse rounded bg-muted/30" />
                        ))}
                    </div>
                ) : applications.length === 0 ? (
                    <div className="pt-8">
                        <EmptyState title="Belum ada lamaran">
                            Apply ke lowongan pertamamu untuk mulai tracking.{" "}
                            <Link href="/dashboard/jobs" className="font-semibold text-primary hover:underline">
                                Browse lowongan →
                            </Link>
                        </EmptyState>
                    </div>
                ) : filtered.length === 0 ? (
                    <p className="py-10 text-center text-[13px] text-muted-foreground">
                        Tidak ada lamaran berstatus &ldquo;{activeFilter === "all" ? "semua" : STATUS_CONFIG[activeFilter].label}&rdquo;.
                    </p>
                ) : (
                    <Reveal delay={0.15}>
                        <ul className="pt-1">
                            {filtered.map((app) => (
                                <ApplicationRow key={app.id} app={app} fullName={fullName} onGenerateLetter={setLetterApp} />
                            ))}
                        </ul>
                    </Reveal>
                )}
            </div>
        </>
    );
}
