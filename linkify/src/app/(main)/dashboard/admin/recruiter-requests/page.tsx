"use client";

import { PageHeader, Reveal } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

type Req = {
    id: string;
    user_id: string;
    company_name: string;
    company_website: string;
    company_size: string;
    industry: string;
    wa_pic: string;
    reason: string | null;
    status: string;
    requested_at: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
    user_email: string | null;
};

export default function AdminRecruiterRequestsPage() {
    const { withAuth, authReady } = useApi();
    const qc = useQueryClient();
    const router = useRouter();

    const { data: profile } = useQuery({
        queryKey: ["profile"],
        queryFn: () => withAuth<{ is_admin?: boolean } | null>("/me/profile"),
        enabled: authReady,
    });

    const isAdmin = !!profile?.is_admin;

    const { data: reqs, isLoading, error } = useQuery({
        queryKey: ["admin-recruiter-requests"],
        queryFn: () => withAuth<Req[]>("/admin/recruiter-requests"),
        enabled: authReady && isAdmin,
    });

    const approve = useMutation({
        mutationFn: (id: string) => withAuth(`/admin/recruiter-requests/${id}/approve`, { method: "POST" }),
        onSuccess: () => {
            toast.success("Disetujui — user sekarang recruiter.");
            qc.invalidateQueries({ queryKey: ["admin-recruiter-requests"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const reject = useMutation({
        mutationFn: (id: string) => withAuth(`/admin/recruiter-requests/${id}/reject`, { method: "POST" }),
        onSuccess: () => {
            toast.success("Ditolak.");
            qc.invalidateQueries({ queryKey: ["admin-recruiter-requests"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    if (!authReady) return <div className="p-8 font-mono text-sm text-muted-foreground">Memuat...</div>;

    if (!isAdmin) {
        return (
            <div className="w-full max-w-2xl">
                <PageHeader crumb="dasbor / admin" title="Akses ditolak" sub="Halaman ini hanya untuk admin (admin.githire@gmail.com)." />
                <div className="mt-6 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm">
                    Kamu bukan admin. Hubungi admin.githire@gmail.com untuk akses.
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-3xl">
            <PageHeader crumb="dasbor / admin / recruiter" title="Permohonan Recruiter" sub="Tinjau pengajuan dari footer landing. Setujui untuk cap KTP jadi recruiter beneran." />

            <Reveal delay={0.06} className="pt-6">
                {isLoading && <p className="font-mono text-sm text-muted-foreground">Memuat...</p>}
                {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

                {!isLoading && reqs?.length === 0 && (
                    <div className="rounded-md border border-border p-8 text-center">
                        <p className="text-sm font-medium">Belum ada pengajuan</p>
                        <p className="mt-1 text-xs text-muted-foreground">Pengajuan dari /recruiter/apply akan muncul di sini.</p>
                    </div>
                )}

                <div className="space-y-3">
                    {reqs?.map((r) => (
                        <div key={r.id} className="rounded-lg border border-border p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold">{r.company_name} <span className="font-normal text-muted-foreground">· {r.company_website}</span></p>
                                    <p className="mt-1 flex flex-wrap gap-2 font-mono text-[11px] text-muted-foreground">
                                        <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5">{r.company_size}</span>
                                        <span className="rounded-full border border-border bg-muted/30 px-2 py-0.5">{r.industry}</span>
                                        <span>{r.wa_pic}</span>
                                        <span className={`rounded-full px-2 py-0.5 font-semibold ${r.status === "pending" ? "bg-amber-500/10 text-amber-600 border border-amber-500/20" : r.status === "approved" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"}`}>{r.status}</span>
                                    </p>
                                    {r.reason && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">“{r.reason}”</p>}
                                    <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                                        {r.user_email} · {new Date(r.requested_at).toLocaleString("id-ID")}
                                        {r.reviewed_by && ` · reviewed by ${r.reviewed_by}`}
                                    </p>
                                </div>
                                {r.status === "pending" && (
                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            onClick={() => approve.mutate(r.id)}
                                            disabled={approve.isPending || reject.isPending}
                                            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                                        >
                                            Setujui
                                        </button>
                                        <button
                                            onClick={() => reject.mutate(r.id)}
                                            disabled={approve.isPending || reject.isPending}
                                            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                                        >
                                            Tolak
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </Reveal>
        </div>
    );
}
