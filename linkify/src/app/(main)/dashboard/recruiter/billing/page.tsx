"use client";

import { PageHeader, Reveal, Spotlight } from "@/components/dashboard/ui";
import { QrisModal } from "@/components/billing/qris-modal";
import { useApi } from "@/hooks/use-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Sparkles, Crown, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast, Bounce } from "react-toastify";

type Billing = {
    is_premium: boolean;
    jobs: { used: number; limit: number; remaining: number };
    screening: { used: number; limit: number | null; remaining: number | null };
    chat: { used: number; limit: number; remaining: number };
};

export default function BillingPage() {
    const { withAuth, authReady } = useApi();
    const qc = useQueryClient();
    const router = useRouter();
    const [qris, setQris] = useState<{ open: boolean; plan: "talent" | "managed"; amount: number }>({ open: false, plan: "talent", amount: 499000 });
    const { data, isLoading } = useQuery<Billing>({
        queryKey: ["billing-status"],
        queryFn: () => withAuth("/recruiter/billing/status"),
        enabled: authReady,
    });

    const toggle = useMutation({
        mutationFn: () => withAuth<{ is_premium: boolean; message: string }>("/recruiter/billing/mock-toggle", { method: "POST" }),
        onSuccess: (res) => {
            toast.success(res.message + " — Premium berhasil diaktifkan", { transition: Bounce, autoClose: 4000, theme: document.documentElement.classList.contains("dark") ? "dark" : "light" });
            qc.invalidateQueries({ queryKey: ["billing-status"] });
            qc.invalidateQueries({ queryKey: ["chat-quota"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const startAdmin = useMutation({
        mutationFn: () => withAuth<{ conversation_id: string }>("/chat/start-admin", { method: "POST" }),
        onSuccess: (res) => {
            toast.success("Chat dengan admin dibuka", { transition: Bounce });
            router.push(`/dashboard/chat?c=${res.conversation_id}`);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const handleTalentQrisConfirm = () => {
        setQris((s) => ({ ...s, open: false }));
        toggle.mutate();
    };

    const handleManagedQrisConfirm = () => {
        setQris((s) => ({ ...s, open: false }));
        // FE only simulasi — langsung buka chat admin + toast
        toast.success("Pembayaran Managed simulasi berhasil — chat admin dibuka", { transition: Bounce });
        startAdmin.mutate();
    };

    if (isLoading) return <div className="h-64 animate-pulse rounded-xl border bg-card" />;

    const isPremium = !!data?.is_premium;

    return (
        <div className="w-full space-y-6">
            <PageHeader crumb="dasbor / perusahaan / tagihan" title="Tagihan" sub="Kelola paket hiring. Mock toggle tanpa payment gateway." />

            {/* Status ringkas */}
            <Reveal delay={0.06}>
                <div className="rounded-xl border border-border bg-card px-5 py-3 font-mono text-xs text-muted-foreground">
                    Paket: <span className={isPremium ? "font-bold text-violet-600" : "font-bold text-foreground"}>{isPremium ? "Talent Search (Premium)" : "Gratis"}</span>
                    <span className="mx-2">·</span> Lowongan {data?.jobs.used}/{data?.jobs.limit} · Screening {isPremium ? "∞" : `${data?.screening.used}/${data?.screening.limit}`} · Chat {data?.chat.used}/{data?.chat.limit} · Reset Senin 00:00 WIB
                </div>
            </Reveal>

            {/* 3 kolom */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Gratis */}
                <Reveal delay={0.1}>
                    <Spotlight>
                        <div className={`flex h-full flex-col rounded-xl border bg-card p-5 ${!isPremium ? "border-violet-500/40 ring-1 ring-violet-500/20" : "border-border"}`}>
                            <div className="flex items-center gap-2">
                                <div className="flex size-8 items-center justify-center rounded-full bg-muted"><Users className="size-4" /></div>
                                <h3 className="text-sm font-bold">Gratis</h3>
                                {!isPremium && <span className="ml-auto rounded-full bg-violet-600 px-2 py-0.5 text-[10px] font-bold text-white">Dipakai</span>}
                            </div>
                            <p className="mt-3">
                                <span className="text-2xl font-bold">Rp 0</span> <span className="text-xs text-muted-foreground">/ bulan</span>
                            </p>
                            <p className="text-xs text-muted-foreground">Pas untuk coba</p>
                            <ul className="mt-4 flex-1 space-y-2 text-xs">
                                <li className="flex gap-2"><Check className="size-4 shrink-0 text-emerald-600" /> 2 lowongan total</li>
                                <li className="flex gap-2"><Check className="size-4 shrink-0 text-emerald-600" /> 5 profil / minggu (blur &gt;5)</li>
                                <li className="flex gap-2"><Check className="size-4 shrink-0 text-emerald-600" /> Screening 5 / minggu</li>
                                <li className="flex gap-2"><Check className="size-4 shrink-0 text-emerald-600" /> Chat 5 / minggu</li>
                                <li className="flex gap-2"><Check className="size-4 shrink-0 text-emerald-600" /> Pelamar masuk ∞</li>
                            </ul>
                            <button disabled className="mt-6 w-full rounded-full border border-border bg-muted px-4 py-2 text-xs font-bold text-muted-foreground">
                                {isPremium ? "Gratis" : "Dipakai"}
                            </button>
                            <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">2/2 terpakai</p>
                        </div>
                    </Spotlight>
                </Reveal>

                {/* Talent Search */}
                <Reveal delay={0.16}>
                    <Spotlight>
                        <div className={`flex h-full flex-col rounded-xl border bg-card p-5 ${isPremium ? "border-violet-500/40 ring-1 ring-violet-500/20" : "border-violet-500/30"}`}>
                            <div className="flex items-center gap-2">
                                <div className="flex size-8 items-center justify-center rounded-full bg-violet-600 text-white"><Sparkles className="size-4" /></div>
                                <h3 className="text-sm font-bold">Talent Search</h3>
                                <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">Populer</span>
                            </div>
                            <p className="mt-3">
                                <span className="text-2xl font-bold">Rp 499rb</span> <span className="text-xs text-muted-foreground">/ bulan</span>
                            </p>
                            <p className="text-xs text-muted-foreground">Paling banyak dipakai</p>
                            <ul className="mt-4 flex-1 space-y-2 text-xs">
                                <li className="flex gap-2"><Check className="size-4 shrink-0 text-violet-600" /> 10 lowongan total</li>
                                <li className="flex gap-2"><Check className="size-4 shrink-0 text-violet-600" /> Profil unlimited</li>
                                <li className="flex gap-2"><Check className="size-4 shrink-0 text-violet-600" /> Screening ∞</li>
                                <li className="flex gap-2"><Check className="size-4 shrink-0 text-violet-600" /> Chat 100 / minggu</li>
                                <li className="flex gap-2"><Check className="size-4 shrink-0 text-violet-600" /> Badge Premium di chat</li>
                            </ul>
                            <button
                                onClick={() => (isPremium ? toggle.mutate() : setQris({ open: true, plan: "talent", amount: 499000 }))}
                                disabled={toggle.isPending}
                                className={`mt-6 w-full rounded-full px-4 py-2 text-xs font-bold text-white ${isPremium ? "bg-muted text-foreground border border-border" : "bg-violet-600 hover:bg-violet-700"}`}
                            >
                                {toggle.isPending ? "..." : isPremium ? "Batalkan → Gratis" : "Bayar via QRIS"}
                            </button>
                            <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">{isPremium ? "Premium aktif" : "Belum aktif — simulasi QRIS"}</p>
                        </div>
                    </Spotlight>
                </Reveal>

                {/* Managed */}
                <Reveal delay={0.22}>
                    <Spotlight>
                        <div className="flex h-full flex-col rounded-xl border border-border bg-card p-5">
                            <div className="flex items-center gap-2">
                                <div className="flex size-8 items-center justify-center rounded-full bg-amber-500 text-white"><Crown className="size-4" /></div>
                                <h3 className="text-sm font-bold">Managed</h3>
                            </div>
                            <p className="mt-3">
                                <span className="text-2xl font-bold">Rp 2jt</span> <span className="text-xs text-muted-foreground">/ rekrut</span>
                            </p>
                            <p className="text-xs text-muted-foreground">Githire yang carikan</p>
                            <ul className="mt-4 flex-1 space-y-2 text-xs">
                                <li className="flex gap-2"><Check className="size-4 shrink-0 text-amber-600" /> Shortlist 10 kandidat</li>
                                <li className="flex gap-2"><Check className="size-4 shrink-0 text-amber-600" /> Kurasi manual + AI</li>
                                <li className="flex gap-2"><Check className="size-4 shrink-0 text-amber-600" /> Interview guarantee</li>
                                <li className="flex gap-2"><Check className="size-4 shrink-0 text-amber-600" /> Chat via Githire</li>
                                <li className="flex gap-2"><Check className="size-4 shrink-0 text-amber-600" /> Pelamar ∞</li>
                            </ul>
                            <button
                                onClick={() => setQris({ open: true, plan: "managed", amount: 2000000 })}
                                className="mt-6 w-full rounded-full bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600"
                            >
                                Bayar via QRIS
                            </button>
                            <p className="mt-2 text-center font-mono text-[11px] text-muted-foreground">Simulasi QRIS → chat admin • <a href="mailto:hello@githire.com?subject=Managed%20Hiring" className="underline">email</a> juga</p>
                        </div>
                    </Spotlight>
                </Reveal>
            </div>

            <p className="text-center font-mono text-[11px] text-muted-foreground">Semua paket: pelamar masuk ∞ · CV ATS · reset Senin 00:00 WIB</p>

            <QrisModal
                open={qris.open}
                onClose={() => setQris((s) => ({ ...s, open: false }))}
                onConfirm={qris.plan === "talent" ? handleTalentQrisConfirm : handleManagedQrisConfirm}
                amount={qris.amount}
                plan={qris.plan}
                isPending={toggle.isPending || startAdmin.isPending}
            />
        </div>
    );
}
