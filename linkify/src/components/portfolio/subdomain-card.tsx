"use client";

import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import { ROOT_DOMAIN, toSubdomainCandidate } from "@/utils/functions/subdomain-host";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import type { PortfolioRecord } from "./types";

type Check = { name: string; available: boolean; reason: "invalid" | "reserved" | "taken" | null };

const REASON_COPY: Record<NonNullable<Check["reason"]>, string> = {
    invalid: "3-30 karakter: huruf kecil, angka, atau tanda -, tidak diawali atau diakhiri -.",
    reserved: "Nama ini dipakai sistem GitHire.",
    taken: "Sudah dipakai orang lain.",
};

/** Klaim atau ganti alamat nama.githire.my.id untuk portfolio publik. */
export function SubdomainCard({ portfolio, suggestion }: { portfolio: PortfolioRecord; suggestion: string | null }) {
    const { withAuth } = useApi();
    const queryClient = useQueryClient();
    const current = portfolio.subdomain;
    const [value, setValue] = useState(current ?? toSubdomainCandidate(suggestion) ?? "");
    const [check, setCheck] = useState<Check | null>(null);
    const [saving, setSaving] = useState(false);
    const name = value.trim().toLowerCase();
    const unchanged = name === (current ?? "");

    useEffect(() => {
        setCheck(null);
        if (!name || unchanged) return;
        const timer = window.setTimeout(() => {
            withAuth<Check>(`/me/portfolio/subdomain/check?name=${encodeURIComponent(name)}`)
                .then((result) => setCheck(result.name === name ? result : null))
                .catch(() => setCheck(null));
        }, 400);
        return () => window.clearTimeout(timer);
    }, [name, unchanged, withAuth]);

    const save = async () => {
        setSaving(true);
        try {
            const record = await withAuth<PortfolioRecord>("/me/portfolio/subdomain", {
                method: "PUT",
                body: JSON.stringify({ name }),
            });
            queryClient.setQueryData(["portfolio"], record);
            toast.success(`Alamat portfolio: ${record.subdomain}.${ROOT_DOMAIN}`);
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Gagal menyimpan alamat. Coba lagi.");
        } finally {
            setSaving(false);
        }
    };

    const copy = async () => {
        if (!portfolio.subdomain_url) return;
        await navigator.clipboard.writeText(portfolio.subdomain_url);
        toast.success("Alamat disalin.");
    };

    return (
        <section className="border border-border p-4">
            <p className="text-meta uppercase tracking-wide text-muted-foreground">Alamat portfolio</p>
            <div className="mt-3 flex items-center rounded-md border border-border bg-background focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                <input
                    aria-label="Nama alamat portfolio"
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                    value={value}
                    maxLength={30}
                    placeholder="namamu"
                    onChange={(event) => setValue(event.target.value)}
                />
                <span className="shrink-0 pr-3 text-xs text-muted-foreground">.{ROOT_DOMAIN}</span>
            </div>
            <p role="status" className="mt-1.5 min-h-4 text-xs">
                {check?.available && <span className="text-emerald-600">Tersedia.</span>}
                {check?.reason && <span className="text-destructive">{REASON_COPY[check.reason]}</span>}
            </p>
            <button
                type="button"
                className="mt-2 w-full rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={saving || unchanged || !check?.available}
                onClick={save}
            >
                {saving ? "Menyimpan…" : current ? "Ganti alamat" : "Pakai alamat ini"}
            </button>
            {portfolio.subdomain_url && (
                <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                    <a className="truncate font-semibold text-primary hover:underline" href={portfolio.subdomain_url} target="_blank" rel="noreferrer">
                        {portfolio.subdomain}.{ROOT_DOMAIN}
                    </a>
                    <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={copy}>Salin</button>
                </div>
            )}
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {!portfolio.subdomain_live
                    ? "Alamat ini aktif segera. Sambil menunggu, link /p/ tetap bisa dibagikan."
                    : portfolio.status !== "published"
                        ? "Alamat aktif setelah portfolio dipublish."
                        : "Bisa diganti sekali per 30 hari. Alamat lama tetap mengarah ke yang baru selama 30 hari."}
            </p>
        </section>
    );
}
