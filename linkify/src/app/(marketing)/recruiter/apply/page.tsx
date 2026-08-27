"use client";

import MaxWidthWrapper from "@/components/global/max-width-wrapper";
import { useApi } from "@/hooks/use-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "react-toastify";

type ReqStatus = {
    id: string;
    status: string;
    company_name: string;
    requested_at: string;
} | null;

export default function RecruiterApplyPage() {
    const { withAuth, authReady, isSignedIn } = useApi();
    const qc = useQueryClient();

    const [form, setForm] = useState({
        company_name: "",
        company_website: "",
        company_size: "1-50",
        industry: "",
        wa_pic: "",
        reason: "",
    });

    const { data: existing, isLoading } = useQuery({
        queryKey: ["recruiter-request"],
        queryFn: () => withAuth<ReqStatus>("/me/recruiter-request"),
        enabled: authReady,
    });

    const { data: profile } = useQuery({
        queryKey: ["profile"],
        queryFn: () => withAuth<{ role: string | null }>("/me/profile"),
        enabled: authReady,
    });

    const isRecruiter = profile?.role === "recruiter";
    const isPending = existing?.status === "pending";

    const submit = useMutation({
        mutationFn: () =>
            withAuth("/me/recruiter-request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            }),
        onSuccess: () => {
            toast.success("Pengajuan terkirim. Menunggu persetujuan admin (1-2 hari).");
            qc.invalidateQueries({ queryKey: ["recruiter-request"] });
            qc.invalidateQueries({ queryKey: ["profile"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.company_name.trim() || form.company_name.trim().length < 3) return toast.error("Nama perusahaan minimal 3 karakter.");
        if (!/^https?:\/\/.+/.test(form.company_website.trim())) return toast.error("Website harus diawali http:// atau https://");
        if (!form.industry.trim()) return toast.error("Industri wajib diisi.");
        if (!form.wa_pic.trim()) return toast.error("WA PIC wajib diisi.");
        submit.mutate();
    };

    if (!isSignedIn && !isLoading) {
        return (
            <MaxWidthWrapper className="py-16">
                <div className="mx-auto max-w-xl rounded-xl border border-border p-8 text-center">
                    <h1 className="text-2xl font-semibold">Daftar sebagai Recruiter</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Silakan login dulu untuk mengajukan pendaftaran recruiter.</p>
                    <Link href="/auth/sign-in" className="mt-6 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110">
                        Masuk / Daftar
                    </Link>
                </div>
            </MaxWidthWrapper>
        );
    }

    if (isRecruiter) {
        return (
            <MaxWidthWrapper className="py-16">
                <div className="mx-auto max-w-xl rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
                    <h1 className="text-xl font-semibold text-emerald-600">Kamu sudah menjadi recruiter ✓</h1>
                    <p className="mt-2 text-sm text-muted-foreground">Akses recruiter sudah aktif.</p>
                    <Link href="/dashboard/recruiter/jobs" className="mt-6 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">
                        Ke Dashboard Recruiter
                    </Link>
                </div>
            </MaxWidthWrapper>
        );
    }

    if (isPending) {
        return (
            <MaxWidthWrapper className="py-16">
                <div className="mx-auto max-w-xl rounded-xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
                    <h1 className="text-xl font-semibold">Menunggu persetujuan admin</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Pengajuan untuk <span className="font-medium text-foreground">{existing?.company_name}</span> sedang ditinjau. Biasanya 1-2 hari.
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">Diajukan: {existing?.requested_at ? new Date(existing.requested_at).toLocaleString("id-ID") : "-"}</p>
                    <Link href="/dashboard" className="mt-6 inline-flex text-sm font-medium text-primary hover:underline">
                        Kembali ke Dashboard
                    </Link>
                </div>
            </MaxWidthWrapper>
        );
    }

    return (
        <MaxWidthWrapper className="py-12">
            <div className="mx-auto max-w-xl">
                <h1 className="text-3xl font-semibold tracking-tight">Daftar sebagai Recruiter</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    Isi data perusahaan. Hidden di footer landing — hanya yang butuh yang menemukan. Admin <span className="font-mono text-xs">admin.githire@gmail.com</span> akan meninjau 1-2 hari.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                    <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Nama perusahaan *</label>
                        <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Tokopedia" className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25" />
                    </div>
                    <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Website perusahaan *</label>
                        <input value={form.company_website} onChange={(e) => setForm({ ...form, company_website: e.target.value })} placeholder="https://tokopedia.com" className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Ukuran *</label>
                            <select value={form.company_size} onChange={(e) => setForm({ ...form, company_size: e.target.value })} className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm">
                                <option value="1-50">1–50 karyawan</option>
                                <option value="50-200">50–200 karyawan</option>
                                <option value="200+">200+ karyawan</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Industri *</label>
                            <input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="E-commerce" className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25" />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-muted-foreground">WA PIC *</label>
                        <input value={form.wa_pic} onChange={(e) => setForm({ ...form, wa_pic: e.target.value })} placeholder="+62 812-3456-7890" className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25" />
                    </div>
                    <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Alasan rekrut via GitHire</label>
                        <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Kami cari fresh graduate yang portofolionya terbukti lewat kode, bukan cuma CV..." rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25" />
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{form.reason.length}/500</p>
                    </div>

                    <button type="submit" disabled={submit.isPending} className="w-full rounded-md bg-primary px-5 py-3 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50">
                        {submit.isPending ? "Mengirim..." : "Kirim Permohonan"}
                    </button>
                    <p className="text-center font-mono text-[11px] text-muted-foreground">Gratis. Tidak ada biaya pendaftaran.</p>
                </form>
            </div>
        </MaxWidthWrapper>
    );
}
