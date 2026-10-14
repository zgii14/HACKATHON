"use client";

import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import { confirmDestructive } from "@/lib/confirm";
import { useClerk, useUser } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Github } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "react-toastify";

export type GithubConnectionState = "verified" | "legacy_unverified" | "none";

interface Props {
    connection: GithubConnectionState;
    username: string | null;
    verifiedAt: string | null;
    hasPublishedPortfolio?: boolean;
}

/**
 * Status + aksi koneksi GitHub. Koneksi dibuat/dihapus lewat jendela akun Clerk
 * (openUserProfile), karena Clerk mewajibkan verifikasi ulang untuk aksi ini dan
 * jendelanya menanganinya sendiri. Setelah Clerk punya GitHub terverifikasi,
 * backend membaca identitasnya lewat POST /profiles/github/connect
 * (username dari browser tidak pernah dipakai).
 */
export function GithubConnection({ connection, username, verifiedAt, hasPublishedPortfolio }: Props) {
    const { user, isLoaded } = useUser();
    const { openUserProfile } = useClerk();
    const { withAuth, authReady } = useApi();
    const qc = useQueryClient();
    const autoLinked = useRef(false);

    const githubAccount = user?.externalAccounts.find((account) => account.provider === "github");
    const clerkVerified = githubAccount?.verification?.status === "verified";
    // Clerk bisa menyimpan koneksi "verified" tanpa ID GitHub (mis. alur ganti akun
    // yang terputus). Koneksi seperti itu tidak bisa ditautkan; minta disambungkan ulang.
    const githubUsable = clerkVerified && /^\d+$/.test(githubAccount?.providerUserId ?? "");
    const githubBroken = clerkVerified && !githubUsable;

    const link = useMutation({
        mutationFn: () => withAuth<{ github_username: string }>("/profiles/github/connect", { method: "POST" }),
        onSuccess: (result) => {
            for (const key of [["profile"], ["me"], ["skill-gap"], ["jobs", "recommended"], ["portfolio"]]) {
                qc.invalidateQueries({ queryKey: key });
            }
            toast.success(`GitHub terhubung sebagai @${result.github_username}`);
        },
        onError: (error: Error) => {
            if (error instanceof ApiError && error.code === "GITHUB_NOT_CONNECTED") {
                toast.error("Koneksi GitHub belum lengkap. Hubungkan lagi lewat pengaturan akun.");
                return;
            }
            toast.error(error.message);
        },
    });

    // Tautkan otomatis sekali begitu Clerk punya GitHub yang valid (pulang dari OAuth,
    // atau user yang daftar lewat GitHub). Sekali per akun GitHub per sesi, supaya
    // error (mis. sudah dipakai akun lain) tidak muncul tiap buka halaman.
    useEffect(() => {
        if (!isLoaded || !authReady || autoLinked.current) return;
        if (!githubUsable || connection === "verified") return;
        const attemptKey = `githire:github-autolink:${githubAccount?.providerUserId}`;
        try {
            if (sessionStorage.getItem(attemptKey) === "1") return;
            sessionStorage.setItem(attemptKey, "1");
        } catch {
            // sessionStorage bisa diblokir; tetap coba sekali per mount.
        }
        autoLinked.current = true;
        link.mutate();
    }, [isLoaded, authReady, githubUsable, connection, githubAccount?.providerUserId, link]);

    const openAccountSettings = () => openUserProfile();

    const changeAccount = async () => {
        const confirmed = await confirmDestructive({
            title: "Ganti akun GitHub?",
            text: `${hasPublishedPortfolio ? "Portfolio publikmu akan disembunyikan sampai kamu publish lagi. " : ""}Di jendela akun, hapus GitHub lalu hubungkan lagi. Untuk akun GitHub yang berbeda, logout dulu dari github.com.`,
            confirmText: "Buka pengaturan akun",
        });
        if (confirmed) openAccountSettings();
    };

    const busy = link.isPending;
    const busyLabel = "Menghubungkan…";
    const primaryButton = "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[13px] font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

    return (
        <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">
                        <Github className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        {githubBroken && connection !== "verified" ? (
                            <>
                                <p className="text-sm font-semibold">Koneksi GitHub belum lengkap</p>
                                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                                    GitHub tercatat di akun login-mu, tapi datanya tidak terbaca. Buka pengaturan akun, hapus GitHub, lalu hubungkan lagi.
                                </p>
                            </>
                        ) : connection === "none" ? (
                            <>
                                <p className="text-sm font-semibold">GitHub belum terhubung</p>
                                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                                    Hubungkan GitHub untuk verifikasi skill dari repo, portfolio, dan label terverifikasi di mata recruiter. GitHire hanya membaca data publik.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                                    @{username ?? "-"}
                                    {connection === "verified" ? (
                                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-micro font-bold text-emerald-600">Terverifikasi</span>
                                    ) : (
                                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-micro font-bold text-amber-600">Belum diverifikasi</span>
                                    )}
                                </p>
                                <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                                    {connection === "verified"
                                        ? `Terhubung lewat login GitHub${verifiedAt ? ` sejak ${new Date(verifiedAt).toLocaleDateString("id-ID")}` : ""}.`
                                        : "Username ini diketik manual. Verifikasi dengan login GitHub agar recruiter melihat label terverifikasi."}
                                </p>
                            </>
                        )}
                    </div>
                </div>

                {connection === "verified" ? (
                    <button
                        type="button"
                        onClick={changeAccount}
                        disabled={busy}
                        className="shrink-0 text-[13px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {busy ? busyLabel : "Ganti akun GitHub"}
                    </button>
                ) : (
                    <button type="button" onClick={openAccountSettings} disabled={busy || !isLoaded} className={primaryButton}>
                        <Github className="size-4" aria-hidden="true" />
                        {busy ? busyLabel : githubBroken ? "Perbaiki koneksi GitHub" : connection === "none" ? "Hubungkan GitHub" : "Verifikasi dengan GitHub"}
                    </button>
                )}
            </div>
        </section>
    );
}
