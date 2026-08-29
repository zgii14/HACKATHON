"use client";

import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

export default function EditJobPage() {
    const { id } = useParams<{ id: string }>();
    const { withAuth, authReady } = useApi();
    const router = useRouter();

    const { data: job, isLoading } = useQuery<any>({
        queryKey: ["job-edit", id],
        queryFn: () => withAuth(`/jobs/${id}`),
        enabled: authReady && !!id,
    });

    const [title, setTitle] = useState("");
    const [company, setCompany] = useState("");
    const [location, setLocation] = useState("");
    const [salary, setSalary] = useState("");
    const [skillsText, setSkillsText] = useState("");
    const [workType, setWorkType] = useState("Hybrid");
    const [description, setDescription] = useState("");

    useEffect(() => {
        if (job) {
            setTitle(job.title || "");
            setCompany(job.company || "");
            setLocation(job.location || "");
            setSalary(job.salary || "");
            setSkillsText((job.required_skills || []).join(", "));
            setWorkType(job.work_type || "Hybrid");
            setDescription(job.description || "");
        }
    }, [job]);

    const canEdit = (() => {
        if (!job?.created_at) return true;
        if (job?.is_closed) return false;
        return Date.now() - new Date(job.created_at).getTime() <= 24 * 3600 * 1000;
    })();

    const mut = useMutation({
        mutationFn: (payload: any) => withAuth(`/recruiter/jobs/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
        onSuccess: () => {
            toast.success("Lowongan diperbarui");
            router.push("/dashboard/recruiter/jobs");
        },
        onError: (e: any) => toast.error(e.message || "Gagal update"),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!canEdit) return toast.error("Edit hanya bisa dalam 24 jam setelah dipost.");
        mut.mutate({
            title, company, location, salary, required_skills: skillsText.split(",").map((s) => s.trim()).filter(Boolean), work_type: workType, is_remote: workType === "Remote", description,
        });
    };

    if (isLoading) return <div className="p-8 font-mono text-sm text-muted-foreground">Memuat...</div>;
    if (!job) return <div className="p-8 text-sm">Lowongan tidak ditemukan.</div>;

    return (
        <div className="max-w-2xl space-y-6 pb-16">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/dashboard/recruiter/jobs" className="hover:text-primary flex items-center gap-1"><ArrowLeft className="size-3.5" /> Lowongan Saya</Link>
                <span>/</span>
                <span className="text-foreground">Edit</span>
            </div>
            <h1 className="text-2xl font-bold">Edit Lowongan</h1>
            {!canEdit && <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700">Edit hanya bisa dalam 24 jam setelah dipost atau jika belum ditutup.</div>}
            <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-5">
                <div><label className="text-xs font-semibold text-muted-foreground">Judul*</label><input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 text-xs" /></div>
                <div><label className="text-xs font-semibold text-muted-foreground">Perusahaan*</label><input value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 text-xs" /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-semibold text-muted-foreground">Lokasi</label><input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 text-xs" /></div>
                    <div><label className="text-xs font-semibold text-muted-foreground">Gaji</label><input value={salary} onChange={(e) => setSalary(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 text-xs" /></div>
                </div>
                <div><label className="text-xs font-semibold text-muted-foreground">Skills (koma)</label><input value={skillsText} onChange={(e) => setSkillsText(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 text-xs" /></div>
                <div><label className="text-xs font-semibold text-muted-foreground">Deskripsi*</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} className="mt-1 w-full rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 text-xs" /></div>
                <div className="flex justify-end gap-2">
                    <Link href="/dashboard/recruiter/jobs"><Button type="button" variant="outline" className="rounded-xl text-xs">Batal</Button></Link>
                    <Button type="submit" disabled={mut.isPending || !canEdit} className="rounded-xl bg-primary text-xs font-bold text-white disabled:opacity-40"><Save className="size-4" /> {mut.isPending ? "Menyimpan..." : "Simpan"}</Button>
                </div>
            </form>
        </div>
    );
}
