"use client";

import { PageHeader, Reveal } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "react-toastify";

export default function AdminRecruiterDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { withAuth, authReady } = useApi();
    const qc = useQueryClient();
    const router = useRouter();

    const { data, isLoading } = useQuery<any>({
        queryKey: ["admin-recruiter-detail", id],
        queryFn: () => withAuth(`/admin/recruiter-profiles/${id}`),
        enabled: authReady && !!id,
    });

    const approve = useMutation({
        mutationFn: () => withAuth(`/admin/recruiter-requests/${id}/approve`, { method: "POST" }),
        onSuccess: () => {
            toast.success("Disetujui");
            qc.invalidateQueries({ queryKey: ["admin-recruiter-detail"] });
            qc.invalidateQueries({ queryKey: ["admin-stats"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });
    const reject = useMutation({
        mutationFn: () => withAuth(`/admin/recruiter-requests/${id}/reject`, { method: "POST" }),
        onSuccess: () => {
            toast.success("Ditolak");
            qc.invalidateQueries({ queryKey: ["admin-recruiter-detail"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    if (isLoading) return <div className="p-8 font-mono text-sm text-muted-foreground">Memuat...</div>;
    if (!data) return <div className="p-8 text-sm text-muted-foreground">Tidak ditemukan.</div>;

    const p = data.profile;
    const u = data.user;
    const jobs: any[] = data.jobs || [];

    return (
        <div className="w-full max-w-3xl">
            <PageHeader crumb="dasbor / admin / recruiter" title={p.company_name} sub={`${p.company_website} · ${p.industry}`} />
            <Reveal delay={0.06} className="pt-6 space-y-4">
                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex items-center justify-between">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.status === "pending" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : p.status === "approved" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"}`}>{p.status}</span>
                        <span className="font-mono text-xs text-muted-foreground">{u.email} · {u.role} {u.is_premium ? "· Premium" : ""}</span>
                    </div>
                    <div className="mt-4 grid gap-3 text-sm">
                        <p><span className="font-mono text-xs text-muted-foreground">Website:</span> <a href={p.company_website} target="_blank" className="text-violet-600 hover:underline">{p.company_website}</a></p>
                        <p><span className="font-mono text-xs text-muted-foreground">Ukuran:</span> {p.company_size} · {p.industry}</p>
                        <p><span className="font-mono text-xs text-muted-foreground">WA PIC:</span> <a href={`https://wa.me/${p.wa_pic.replace(/[^0-9]/g, "")}`} target="_blank" className="text-emerald-600 hover:underline">{p.wa_pic}</a></p>
                        {p.reason && <p className="rounded-md bg-muted/30 p-3 text-xs leading-relaxed">“{p.reason}”</p>}
                        <p className="font-mono text-xs text-muted-foreground">Diajukan {new Date(p.requested_at).toLocaleString("id-ID")} {p.reviewed_by ? `· reviewed by ${p.reviewed_by} ${p.reviewed_at ? new Date(p.reviewed_at).toLocaleString("id-ID") : ""}` : ""}</p>
                    </div>
                    {p.status === "pending" && (
                        <div className="mt-4 flex gap-2">
                            <button onClick={() => approve.mutate()} disabled={approve.isPending} className="rounded-md bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50">Setujui</button>
                            <button onClick={() => reject.mutate()} disabled={reject.isPending} className="rounded-md border border-border px-4 py-2 text-xs font-bold hover:bg-muted disabled:opacity-50">Tolak</button>
                        </div>
                    )}
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                    <h3 className="text-sm font-semibold">Lowongan ({data.jobs_count})</h3>
                    <div className="mt-3 space-y-2">
                        {jobs.length === 0 && <p className="text-xs text-muted-foreground">Belum ada lowongan.</p>}
                        {jobs.map((j: any) => (
                            <div key={j.id} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{j.title}</p>
                                    <p className="truncate text-xs text-muted-foreground">{j.company} · {j.location || "-"}</p>
                                </div>
                                <Link href={`/dashboard/recruiter/jobs/${j.id}`} className="text-xs font-medium text-violet-600 hover:underline">Lihat</Link>
                            </div>
                        ))}
                    </div>
                </div>

                <button onClick={() => router.back()} className="text-xs font-medium text-muted-foreground hover:text-foreground">← Kembali</button>
            </Reveal>
        </div>
    );
}
