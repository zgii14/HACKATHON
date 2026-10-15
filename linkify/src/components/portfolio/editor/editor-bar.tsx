"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import type { PortfolioRecord } from "../types";
import type { PublishState } from "./editor-state";
import type { AutosaveStatus } from "./use-portfolio-autosave";

type Props = {
    record: PortfolioRecord;
    state: PublishState;
    status: AutosaveStatus;
    busy: string | null;
    canRewrite: boolean;
    onPrimary: () => void;
    onRewrite: () => void;
    onRetry: () => void;
};

const STATE_LABEL: Record<PublishState, string> = {
    draft: "Draft",
    up_to_date: "Sudah publik",
    changed: "Publik · ada perubahan",
};

// origin kosong saat render server; dilengkapi setelah mount supaya hasil server dan browser sama (tanpa hydration error).
function publicAddress(record: PortfolioRecord, origin: string): string | null {
    if (record.status !== "published") return null;
    if (record.subdomain_url && record.subdomain_live) return record.subdomain_url;
    return record.public_url.startsWith("http") ? record.public_url : `${origin}${record.public_url}`;
}

export function EditorBar({ record, state, status, busy, canRewrite, onPrimary, onRewrite, onRetry }: Props) {
    const [origin, setOrigin] = useState("");
    useEffect(() => setOrigin(window.location.origin), []);
    const address = publicAddress(record, origin);
    const blocked = busy !== null || status.state === "saving" || status.state === "error";
    const primaryLabel = busy === "publish" ? "Memproses…" : state === "draft" ? "Publikasikan" : state === "changed" ? "Perbarui publik" : "Sudah terbaru";

    const copy = async () => {
        if (!address) return;
        await navigator.clipboard.writeText(address);
        toast.success("Alamat portfolio disalin.");
    };

    return (
        <div className="sticky top-14 z-10 border-b border-border bg-background/95 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h1 className="text-xl font-bold tracking-[-0.02em]">Portfolio</h1>
                        <span className={cn("whitespace-nowrap rounded-full px-2.5 py-0.5 text-meta font-semibold", state === "changed" ? "bg-amber-500/10 text-amber-700" : state === "up_to_date" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground")}>
                            {STATE_LABEL[state]}
                        </span>
                        <span role="status" className="text-meta text-muted-foreground">
                            {status.state === "saving" && "Menyimpan…"}
                            {status.state === "saved" && "Tersimpan"}
                            {status.state === "error" && (
                                <span className="text-destructive">
                                    Gagal menyimpan: {status.section === "kontak" ? "ada kontak yang tidak valid." : status.message}{" "}
                                    <button type="button" className="font-semibold underline" onClick={onRetry}>Coba lagi</button>
                                </span>
                            )}
                        </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 text-meta text-muted-foreground">
                        {address ? (
                            <>
                                <span className="truncate">{address.replace(/^https?:\/\//, "")}</span>
                                <button type="button" className="font-semibold hover:text-foreground" onClick={copy}>Salin</button>
                                <a className="font-semibold hover:text-foreground" href={address} target="_blank" rel="noreferrer">Pratinjau ↗</a>
                            </>
                        ) : (
                            <span>Belum dipublikasikan. Hanya kamu yang bisa melihat isinya.</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button type="button" aria-label="Aksi lain" className="rounded-lg border border-border p-2 transition hover:bg-muted">
                                <MoreHorizontal className="size-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled={!canRewrite || busy !== null} onSelect={onRewrite}>
                                {busy === "rewrite" ? "Menulis ulang…" : "Tulis ulang dengan AI"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                        type="button"
                        disabled={blocked || state === "up_to_date"}
                        onClick={onPrimary}
                        className="rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {primaryLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
