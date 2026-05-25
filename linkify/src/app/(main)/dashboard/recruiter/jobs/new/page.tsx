"use client";

import { Button } from "@/components/ui/button";
import { useApi } from "@/hooks/use-api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Briefcase, Plus, Save, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function NewJobPage() {
    const { withAuth } = useApi();
    const router = useRouter();
    const qc = useQueryClient();

    const [title, setTitle] = useState("");
    const [company, setCompany] = useState("");
    const [location, setLocation] = useState("");
    const [salary, setSalary] = useState("");
    const [skillsText, setSkillsText] = useState("");
    const [workType, setWorkType] = useState("Hybrid");
    const [isRemote, setIsRemote] = useState(false);
    const [description, setDescription] = useState("");

    const createMutation = useMutation({
        mutationFn: (payload: any) =>
            withAuth("/recruiter/jobs", {
                method: "POST",
                body: JSON.stringify(payload),
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["my-jobs"] });
            toast.success("Lowongan pekerjaan berhasil diterbitkan!");
            router.push("/dashboard/recruiter/jobs");
        },
        onError: (err: any) => {
            toast.error(err.message || "Gagal membuat lowongan.");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !company || !description) {
            toast.error("Judul, Perusahaan, dan Deskripsi wajib diisi!");
            return;
        }

        const required_skills = skillsText
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        createMutation.mutate({
            title,
            company,
            location,
            salary,
            required_skills,
            work_type: workType,
            is_remote: isRemote || workType === "Remote",
            description,
        });
    };

    return (
        <div className="space-y-6 max-w-2xl pb-16">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold mb-1">
                        <Link href="/dashboard/recruiter/jobs" className="hover:text-primary transition-colors flex items-center gap-1">
                            <ArrowLeft className="w-3.5 h-3.5" /> Lowongan Saya
                        </Link>
                        <span>/</span>
                        <span className="text-foreground">Buat Lowongan</span>
                    </div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-primary" />
                        Buat Lowongan Baru
                    </h1>
                    <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                        Terbitkan posisi pekerjaan baru dan biarkan AI mencocokkannya dengan developer terbaik.
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        Detail Posisi Pekerjaan
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Nama Pekerjaan (Title)*</label>
                            <input
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full text-xs rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/25"
                                placeholder="Contoh: Senior Backend Python Engineer"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Nama Perusahaan*</label>
                            <input
                                required
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                className="w-full text-xs rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 focus:outline-none"
                                placeholder="Contoh: GitHire Enterprise"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Lokasi Kantor</label>
                            <input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full text-xs rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 focus:outline-none"
                                placeholder="Contoh: Jakarta, Indonesia"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Rentang Gaji (Opsional)</label>
                            <input
                                value={salary}
                                onChange={(e) => setSalary(e.target.value)}
                                className="w-full text-xs rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 focus:outline-none"
                                placeholder="Contoh: Rp 12 jt - 18 jt"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Sistem Kerja</label>
                            <select
                                value={workType}
                                onChange={(e) => {
                                    setWorkType(e.target.value);
                                    if (e.target.value === "Remote") setIsRemote(true);
                                }}
                                className="w-full text-xs rounded-xl border border-border bg-card px-3.5 py-2.5 focus:outline-none"
                            >
                                <option value="Remote">Remote (100% Kerja Jauh)</option>
                                <option value="Hybrid">Hybrid (Campuran)</option>
                                <option value="Kerja di kantor">On-Site (Kerja di Kantor)</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Required Skills (Pisahkan dengan koma)*</label>
                            <input
                                required
                                value={skillsText}
                                onChange={(e) => setSkillsText(e.target.value)}
                                className="w-full text-xs rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 focus:outline-none"
                                placeholder="Contoh: Python, FastAPI, PostgreSQL, Docker"
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">Sistem pencocokan AI akan menyaring profil kandidat berdasarkan kata kunci ini.</p>
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Deskripsi Pekerjaan & Persyaratan*</label>
                            <textarea
                                required
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={6}
                                className="w-full text-xs rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 focus:outline-none leading-relaxed"
                                placeholder="Tuliskan detail pekerjaan, tugas, tanggung jawab, dan persyaratan kualifikasi..."
                            />
                        </div>
                    </div>
                </div>

                {/* Submit buttons */}
                <div className="flex items-center justify-end gap-2.5">
                    <Link href="/dashboard/recruiter/jobs">
                        <Button type="button" variant="outline" className="h-9 text-xs rounded-xl">
                            Batal
                        </Button>
                    </Link>
                    <Button
                        type="submit"
                        disabled={createMutation.isPending}
                        className="h-9 text-xs rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-5 flex items-center gap-1.5 shadow-md shadow-primary/10"
                    >
                        <Save className="w-4 h-4" />
                        {createMutation.isPending ? "Menerbitkan..." : "Terbitkan Lowongan"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
