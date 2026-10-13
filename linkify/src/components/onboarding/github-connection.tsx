"use client";

import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import { confirmDestructive } from "@/lib/confirm";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Github } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

export type GithubConnectionState = "verified" | "legacy_unverified" | "none";

const RETURN_PATH = "/dashboard/onboarding";
const RETURN_URL = `${RETURN_PATH}?github=connected`;

interface Props {
    connection: GithubConnectionState;
    username: string | null;
    verifiedAt: string | null;
    hasPublishedPortfolio?: boolean;
}

/**
 * Status + aksi koneksi GitHub. OAuth sepenuhnya diurus Clerk; setelah Clerk
 * memverifikasi akun, backend membaca identitasnya sendiri lewat
 * POST /profiles/github/connect (username dari browser tidak pernah dipakai).
 */
export function GithubConnection({ connection, username, verifiedAt, hasPublishedPortfolio }: Props) {
    const { user, isLoaded } = useUser();
    const { withAuth, authReady } = useApi();
    const qc = useQueryClient();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [redirecting, setRedirecting] = useState(false);
    const autoLinked = useRef(false);

    const githubAccount = user?.externalAccounts.find((account) => account.provider === "github");
    const clerkVerified = githubAccount?.verification?.status === "verified";

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
                toast.error("Login GitHub belum selesai. Coba hubungkan lagi.");
                return;
            }
            toast.error(error.message);
        },
    });

    // Tautkan otomatis sekali: sepulang dari GitHub, atau user yang daftar lewat GitHub.
    useEffect(() => {
        if (!isLoaded || !authReady || autoLinked.current) return;
        const returned = searchParams.get("github") === "connected";
        // Percobaan otomatis tanpa klik cukup sekali per akun GitHub per sesi,
        // supaya error (mis. sudah dipakai akun lain) tidak muncul tiap buka halaman.
        const attemptKey = `githire:github-autolink:${githubAccount?.providerUserId ?? ""}`;
        let alreadyTried = false;
        try {
            alreadyTried = sessionStorage.getItem(attemptKey) === "1";
        } catch {
            // sessionStorage bisa diblokir; anggap belum pernah dicoba.
        }
        const shouldAutoLink = clerkVerified && connection !== "verified" && !alreadyTried;
        if (!returned && !shouldAutoLink) return;
        autoLinked.current = true;
        try {
            sessionStorage.setItem(attemptKey, "1");
        } catch {
            // abaikan
        }
        if (clerkVerified) link.mutate();
        else if (returned) toast.error("Login GitHub belum selesai. Coba hubungkan lagi.");
        if (returned) router.replace(RETURN_PATH);
    }, [isLoaded, authReady, clerkVerified, connection, searchParams, router, link, githubAccount?.providerUserId]);

    const openGithub = async () => {
        if (!user) return;
        setRedirecting(true);
        try {
            // Akun GitHub yang belum terverifikasi di Clerk diulang, bukan dibuat dobel.
            const account =
                githubAccount && !clerkVerified
                    ? await githubAccount.reauthorize({ redirectUrl: RETURN_URL })
                    : await user.createExternalAccount({ strategy: "oauth_github", redirectUrl: RETURN_URL });
            const target = account.verification?.externalVerificationRedirectURL;
            if (!target) throw new Error("missing redirect");
            window.location.href = target.href;
        } catch {
            setRedirecting(false);
            toast.error("Tidak bisa membuka GitHub. Coba lagi.");
        }
    };

    const changeAccount = async () => {
        const confirmed = await confirmDestructive({
            title: "Ganti akun GitHub?",
            text: hasPublishedPortfolio
                ? "Data GitHub diganti dengan akun baru dan portfolio publikmu disembunyikan sampai kamu publish lagi."
                : "Data GitHub diganti dengan akun baru.",
            confirmText: "Ya, ganti akun",
        });
        if (!confirmed || !githubAccount) return;
        setRedirecting(true);
        try {
            await githubAccount.destroy();
            await user?.reload();
            const account = await user!.createExternalAccount({ strategy: "oauth_github", redirectUrl: RETURN_URL });
            const target = account.verification?.externalVerificationRedirectURL;
            if (!target) throw new Error("missing redirect");
            window.location.href = target.href;
        } catch {
            setRedirecting(false);
            toast.error("Tidak bisa mengganti akun GitHub. Coba lagi.");
        }
    };

    const busy = redirecting || link.isPending;
    const busyLabel = redirecting ? "Membuka GitHub…" : "Menghubungkan…";
    const primaryButton = "inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-[13px] font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

    return (
        <section className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">
                        <Github className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                        {connection === "none" ? (
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
                        disabled={busy || !githubAccount}
                        className="shrink-0 text-[13px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        {busy ? busyLabel : "Ganti akun GitHub"}
                    </button>
                ) : (
                    <button type="button" onClick={openGithub} disabled={busy || !isLoaded} className={primaryButton}>
                        <Github className="size-4" aria-hidden="true" />
                        {busy ? busyLabel : connection === "none" ? "Hubungkan GitHub" : "Verifikasi dengan GitHub"}
                    </button>
                )}
            </div>
        </section>
    );
}
