"use client";

// Hallmark · genre: modern-minimal · macrostructure: Workbench (app-surface) · theme: GitHire violet (locked)

import { BarFill, EmptyState, PageHeader, Reveal } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { useState } from "react";

type BookmarkedJob = {
    job_id: string;
    title: string;
    company: string;
    location: string | null;
    is_remote: boolean;
    total_steps: number;
    completed_steps: number;
    match_score: number | null;
};

export default function MyRoadmapsPage() {
    const { withAuth, authReady } = useApi();
    const qc = useQueryClient();
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const { data: bookmarks = [], isLoading } = useQuery({
        queryKey: ["bookmarks"],
        queryFn: () => withAuth<BookmarkedJob[]>("/me/bookmarks"),
        enabled: authReady,
    });

    const remove = useMutation({
        mutationFn: (jobId: string) => withAuth(`/me/roadmap/cache?job_id=${jobId}`, { method: "DELETE" }),
        onSuccess: (_, jobId) => {
            qc.setQueryData(["bookmarks"], (old: BookmarkedJob[] | undefined) =>
                (old ?? []).filter((b) => b.job_id !== jobId)
            );
            qc.invalidateQueries({ queryKey: ["roadmap"] });
            setConfirmDeleteId(null);
            toast.success("Roadmap job dihapus dari bookmark.");
        },
        onError: (e: Error) => {
            setConfirmDeleteId(null);
            toast.error(`Gagal hapus: ${e.message}`);
        },
    });

    if (isLoading) {
        return (
            <div className="w-full space-y-4">
                <div className="h-6 w-56 animate-pulse rounded bg-muted/50" />
                <div className="space-y-2 border-t border-border pt-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-14 animate-pulse rounded bg-muted/30" />
                    ))}
                </div>
            </div>
        );
    }

    const doneCount = bookmarks.filter((b) => b.total_steps > 0 && b.completed_steps === b.total_steps).length;

    return (
        <div className="w-full">
            <PageHeader
                crumb="dasbor / my roadmaps"
                title="Roadmap tersimpan"
                sub="Job yang sedang kamu kejar. Tiap job punya roadmap dan progress belajar tersendiri."
                right={
                    <div className="font-mono text-[12px] text-muted-foreground">
                        <span className="text-foreground">{bookmarks.length}</span> dibookmark ·{" "}
                        <span className="text-success">{doneCount}</span> selesai
                    </div>
                }
            />

            {bookmarks.length === 0 ? (
                <div className="pt-8">
                    <EmptyState title="Belum ada roadmap tersimpan">
                        Buka detail job lalu klik <span className="font-semibold text-foreground">Buat Roadmap untuk Job Ini</span>{" "}
                        untuk mulai menyimpan target.{" "}
                        <Link href="/dashboard/jobs" className="font-semibold text-primary hover:underline">
                            Browse lowongan →
                        </Link>
                    </EmptyState>
                </div>
            ) : (
                <Reveal delay={0.07}>
                    <ul className="pt-2">
                        {bookmarks.map((b) => {
                            const pct = b.total_steps > 0 ? Math.round((b.completed_steps / b.total_steps) * 100) : 0;
                            const isDone = pct === 100;
                            const confirming = confirmDeleteId === b.job_id;

                            return (
                                <li key={b.job_id} className="border-t border-border/60 last:border-b">
                                    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-5">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[14px] font-semibold leading-tight">
                                                {b.title}
                                                {isDone && (
                                                    <span className="ml-2 rounded-[3px] border border-success/40 px-1.5 py-px align-[2px] font-mono text-[10px] font-semibold tracking-[0.05em] text-success">
                                                        SELESAI
                                                    </span>
                                                )}
                                            </p>
                                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                {b.company}
                                                {b.location ? ` · ${b.location}` : ""}
                                                {b.is_remote ? " · remote" : ""}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3 sm:w-64 sm:shrink-0">
                                            <span className="font-mono text-[11.5px] tabular-nums text-muted-foreground">
                                                {b.completed_steps}/{b.total_steps || 0}
                                            </span>
                                            <BarFill pct={pct} tone={isDone ? "success" : "primary"} className="flex-1" />
                                            <span className="min-w-[34px] text-right font-mono text-[12.5px] font-semibold tabular-nums">
                                                {pct}%
                                            </span>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-4">
                                            <Link
                                                href={`/dashboard/roadmap?job_id=${b.job_id}`}
                                                prefetch={false}
                                                className="text-[12.5px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                Buka roadmap →
                                            </Link>
                                            <Link
                                                href={`/dashboard/jobs/${b.job_id}`}
                                                prefetch={false}
                                                className="text-[12px] text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                Detail
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmDeleteId(b.job_id)}
                                                className="text-[12px] text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                title="Hapus dari bookmark"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </div>

                                    {confirming && (
                                        <div className="flex items-center gap-3 border-l-2 border-destructive bg-destructive/[0.06] px-4 py-2.5 mb-3">
                                            <p className="flex-1 text-xs font-medium text-destructive">
                                                Hapus roadmap ini? Progress tidak bisa dikembalikan.
                                            </p>
                                            <button
                                                type="button"
                                                disabled={remove.isPending}
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="text-[12px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                Batal
                                            </button>
                                            <button
                                                type="button"
                                                disabled={remove.isPending}
                                                onClick={() => remove.mutate(b.job_id)}
                                                className="rounded-md bg-destructive px-3 py-1.5 text-[12px] font-bold text-destructive-foreground transition hover:brightness-110 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                            >
                                                {remove.isPending ? "Menghapus…" : "Hapus"}
                                            </button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </Reveal>
            )}
        </div>
    );
}
