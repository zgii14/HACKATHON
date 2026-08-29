"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, MapPin, Plus, UserCheck, Users, Search, Pencil, Trash2, Archive, ArchiveRestore, Clock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

type RecruiterJob = {
    id: string;
    title: string;
    company: string;
    location: string | null;
    is_remote: boolean;
    required_skills: string[];
    salary: string | null;
    work_type: string | null;
    is_closed?: boolean;
    created_at?: string | null;
    applicant_count: number;
};

export default function RecruiterJobsPage() {
    const { withAuth, authReady } = useApi();
    const qc = useQueryClient();
    const [search, setSearch] = useState("");

    const { data: jobs = [], isLoading } = useQuery<RecruiterJob[]>({
        queryKey: ["my-jobs"],
        queryFn: () => withAuth("/recruiter/jobs/my-jobs"),
        enabled: authReady,
        staleTime: 30 * 1000,
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => withAuth(`/recruiter/jobs/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            toast.success("Lowongan dihapus");
            qc.invalidateQueries({ queryKey: ["my-jobs"] });
        },
        onError: (e: any) => toast.error(e.message || "Gagal hapus"),
    });
    const closeMut = useMutation({
        mutationFn: (id: string) => withAuth(`/recruiter/jobs/${id}/close`, { method: "PATCH" }),
        onSuccess: () => {
            toast.success("Lowongan ditutup");
            qc.invalidateQueries({ queryKey: ["my-jobs"] });
        },
        onError: (e: any) => toast.error(e.message),
    });
    const openMut = useMutation({
        mutationFn: (id: string) => withAuth(`/recruiter/jobs/${id}/open`, { method: "PATCH" }),
        onSuccess: () => {
            toast.success("Lowongan dibuka kembali");
            qc.invalidateQueries({ queryKey: ["my-jobs"] });
        },
        onError: (e: any) => toast.error(e.message),
    });

    const handleDelete = async (job: RecruiterJob) => {
        const res = await Swal.fire({
            title: "Hapus lowongan?",
            text: `Hapus "${job.title}"? Jika sudah ada pelamar, gunakan Tutup saja.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Hapus",
            cancelButtonText: "Batal",
            confirmButtonColor: "#e11d48",
        });
        if (res.isConfirmed) deleteMut.mutate(job.id);
    };
    const handleClose = async (job: RecruiterJob) => {
        if (job.is_closed) openMut.mutate(job.id);
        else closeMut.mutate(job.id);
    };

    const filteredJobs = jobs.filter((j) =>
        j.title.toLowerCase().includes(search.toLowerCase()) ||
        j.company.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="space-y-4 max-w-4xl">
                <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
                <div className="h-64 rounded-2xl border bg-card animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-primary" />
                        Portal Recruiter - Lowongan Kerja
                    </h1>
                    <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                        Kelola lowongan pekerjaan yang Anda buat, pantau pelamar, dan gunakan AI Screening portofolio untuk merekrut developer terbaik.
                    </p>
                </div>

                <Link href="/dashboard/recruiter/jobs/new">
                    <Button className="h-9 text-xs gap-1.5 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/20">
                        <Plus className="w-4 h-4" />
                        Buat Lowongan
                    </Button>
                </Link>
            </div>

            {/* Filter Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full text-xs rounded-xl border border-border bg-muted/10 pl-9 pr-4 py-2 focus:outline-none"
                    placeholder="Cari lowongan..."
                />
            </div>

            {/* Jobs list */}
            <div className="grid grid-cols-1 gap-4">
                {filteredJobs.map((job) => {
                    const posted = job.created_at ? formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: localeId }) : null;
                    const canEdit = (() => {
                        if (job.is_closed) return false;
                        if (!job.created_at) return true;
                        const diff = Date.now() - new Date(job.created_at).getTime();
                        return diff <= 24 * 3600 * 1000;
                    })();
                    return (
                        <div
                            key={job.id}
                            className={`rounded-2xl border bg-card p-5 space-y-3 hover:shadow-lg transition-all duration-300 relative group ${job.is_closed ? "border-amber-500/30 bg-amber-500/[0.03]" : "border-border"}`}
                        >
                            <div className="flex flex-wrap items-center gap-2 text-[10px]">
                                {job.is_closed ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-bold text-amber-600"><Archive className="size-3" /> Tutup</span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-bold text-emerald-600">Aktif</span>
                                )}
                                {posted && (
                                    <span className="inline-flex items-center gap-1 font-mono text-muted-foreground"><Clock className="size-3" /> {posted}</span>
                                )}
                            </div>
                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                                        {job.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground font-semibold">{job.company}</p>
                                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[10px] text-muted-foreground">
                                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location || "Indonesia"} ({job.work_type || "Hybrid"})</span>
                                        {job.salary && <span>• Gaji: {job.salary}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0 mt-2 md:mt-0">
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-foreground flex items-center justify-end gap-1"><Users className="w-4 h-4 text-primary" />{job.applicant_count}</span>
                                        <p className="text-[10px] text-muted-foreground font-medium">Total Pelamar</p>
                                    </div>
                                    <Link href={`/dashboard/recruiter/jobs/${job.id}`}>
                                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1 px-3.5 rounded-lg border-muted-foreground/20 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] font-semibold"><UserCheck className="w-3.5 h-3.5" />Review</Button>
                                    </Link>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {job.required_skills.map((skill) => (
                                    <Badge key={skill} variant="secondary" className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-muted/60 text-muted-foreground border-none">{skill}</Badge>
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 border-t border-border/50 pt-3">
                                <Link href={`/dashboard/recruiter/jobs/${job.id}/edit`} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${canEdit ? "border-border hover:bg-muted" : "border-border/50 text-muted-foreground/50 cursor-not-allowed"}`} onClick={(e) => { if (!canEdit) { e.preventDefault(); toast.error("Edit hanya bisa dalam 24 jam setelah dipost."); }}}>
                                    <Pencil className="size-3.5" /> Edit
                                </Link>
                                <button onClick={() => handleClose(job)} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${job.is_closed ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : "border-amber-500/20 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"}`}>
                                    {job.is_closed ? <><ArchiveRestore className="size-3.5" /> Buka</> : <><Archive className="size-3.5" /> Tutup</>}
                                </button>
                                <button onClick={() => handleDelete(job)} className="ml-auto inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-500/20">
                                    <Trash2 className="size-3.5" /> Hapus
                                </button>
                            </div>
                        </div>
                    );
                })}

                {filteredJobs.length === 0 && (
                    <div className="text-center py-12 border border-dashed rounded-2xl bg-muted/5">
                        <p className="text-xs text-muted-foreground italic">Belum ada lowongan pekerjaan yang diterbitkan.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
