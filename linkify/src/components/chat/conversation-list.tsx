"use client";

import { cn } from "@/utils";
import { format, formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { MessageCircle, Search, Trash2 } from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

export type Conv = {
    id: string;
    other_user_id: string;
    other_name: string | null;
    other_email: string | null;
    other_company: string | null;
    job_id: string | null;
    job_title: string | null;
    job_company: string | null;
    updated_at: string;
    expires_at?: string | null;
    last_message: string | null;
    last_message_at: string | null;
    last_message_status: string | null;
    unread_count: number;
};

export function ConversationList({
    convs,
    selectedId,
    onSelect,
    quota,
    search,
    onSearchChange,
}: {
    convs: Conv[] | undefined;
    selectedId: string | null;
    onSelect: (id: string) => void;
    quota: { limit: number | null; used: number; remaining: number | null; is_premium: boolean } | undefined;
    search: string;
    onSearchChange: (v: string) => void;
}) {
    const { withAuth } = useApi();
    const qc = useQueryClient();
    const delConv = useMutation({
        mutationFn: (id: string) => withAuth(`/chat/${id}`, { method: "DELETE" }),
        onSuccess: () => {
            toast.success("Chat dihapus untuk kedua sisi");
            qc.invalidateQueries({ queryKey: ["chat-conversations"] });
        },
        onError: (e: any) => toast.error(e.message || "Gagal hapus"),
    });
    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const isDark = document.documentElement.classList.contains("dark");
        const res = await Swal.fire({
            title: "Hapus chat?",
            text: "Chat akan terhapus untuk kedua sisi dan tidak bisa dipulihkan.",
            icon: "warning",
            theme: isDark ? "dark" : "light",
            showCancelButton: true,
            confirmButtonText: "Hapus",
            cancelButtonText: "Batal",
            confirmButtonColor: "#e11d48",
        });
        if (res.isConfirmed) delConv.mutate(id);
    };
    const filtered = (convs ?? []).filter((c) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
            (c.other_name ?? "").toLowerCase().includes(q) ||
            (c.other_company ?? "").toLowerCase().includes(q) ||
            (c.job_title ?? "").toLowerCase().includes(q) ||
            (c.last_message ?? "").toLowerCase().includes(q)
        );
    });

    return (
        <div className="flex w-full shrink-0 flex-col border-r border-border bg-card md:w-[340px]">
            {/* header */}
            <div className="border-b border-border px-3 py-3">
                <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                        <MessageCircle className="size-4 text-violet-600" /> Chat
                    </h3>
                    {quota && quota.limit !== null && (
                        <span
                            className={cn(
                                "rounded-full px-2 py-0.5 font-mono text-[10px] font-bold",
                                quota.remaining === 0
                                    ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                    : quota.used / (quota.limit || 1) > 0.8
                                      ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                      : "bg-violet-500/10 text-violet-600 border border-violet-500/20"
                            )}
                        >
                            {quota.used}/{quota.limit} {quota.is_premium ? "· Premium" : "· Free"}
                        </span>
                    )}
                </div>
                <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Cari nama, perusahaan, lowongan..."
                        className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-xs focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                    />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 && (
                    <div className="p-8 text-center">
                        <p className="text-xs font-medium text-muted-foreground">
                            {search ? "Tidak ada hasil." : "Belum ada percakapan."}
                        </p>
                        {!search && <p className="mt-1 text-[11px] text-muted-foreground">Mulai dari halaman Cari Kandidat → Chat.</p>}
                    </div>
                )}
                {filtered.map((c) => {
                    const active = selectedId === c.id;
                    const initials = (c.other_name ?? c.other_email ?? "?").slice(0, 2).toUpperCase();
                    const time = c.last_message_at ? format(new Date(c.last_message_at), "HH:mm", { locale: id }) : "";
                    const dateLabel = c.last_message_at ? format(new Date(c.last_message_at), "d MMM", { locale: id }) : "";
                    const isToday = c.last_message_at ? new Date(c.last_message_at).toDateString() === new Date().toDateString() : false;
                    const expiresLabel = c.expires_at ? `Sisa ${formatDistanceToNow(new Date(c.expires_at), { locale: id })}` : null;
                    return (
                        <div
                            key={c.id}
                            className={cn(
                                "group flex w-full items-center gap-3 border-b border-border/50 px-3 py-3 text-left transition-colors hover:bg-muted/40",
                                active && "bg-violet-500/5"
                            )}
                        >
                            <button onClick={() => onSelect(c.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                <div className="relative shrink-0">
                                    <div className="flex size-9 items-center justify-center rounded-full bg-violet-600 text-[11px] font-bold text-white">
                                        {initials}
                                    </div>
                                    {c.unread_count > 0 && (
                                        <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-sm">
                                            {c.unread_count > 9 ? "9+" : c.unread_count}
                                        </span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <span className="truncate text-xs font-semibold text-foreground">{c.other_name || c.other_email || c.other_user_id.slice(0, 8)}</span>
                                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{isToday ? time : dateLabel}</span>
                                    </div>
                                    {c.job_title && (
                                        <p className="truncate text-[10px] font-medium text-violet-600 dark:text-violet-300">Re: {c.job_title}{c.job_company ? ` · ${c.job_company}` : ""}</p>
                                    )}
                                    {c.other_company && !c.job_title && (
                                        <p className="truncate text-[10px] text-muted-foreground">{c.other_company}</p>
                                    )}
                                    <p className={cn("truncate text-xs", c.unread_count > 0 ? "font-semibold text-foreground" : "text-muted-foreground")}>
                                        {c.last_message || "—"}
                                    </p>
                                    {expiresLabel && <p className="font-mono text-[10px] text-amber-600">{expiresLabel} lagi</p>}
                                </div>
                            </button>
                            <button onClick={(e) => handleDelete(e, c.id)} className="hidden shrink-0 rounded p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 group-hover:flex" title="Hapus chat">
                                <Trash2 className="size-3.5" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
