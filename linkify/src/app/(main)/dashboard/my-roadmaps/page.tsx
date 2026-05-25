"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, CheckCircle2, MapPin, Trash2, Wifi } from "lucide-react";
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

function ProgressBar({ done, total }: { done: number; total: number }) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const color =
        pct === 100 ? "from-green-500 to-emerald-500" :
        pct >= 50   ? "from-violet-500 to-purple-500" :
                      "from-primary to-violet-500";
    return (
        <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{done} dari {total} langkah</span>
                <span className="font-medium">{pct}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                    className={`h-1.5 rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

function ScoreBadge({ score }: { score: number | null }) {
    if (score == null) return null;
    const pct = Math.round(score * 100);
    const cls =
        pct >= 60 ? "bg-green-500/15 text-green-500 border-green-500/30" :
        pct >= 30 ? "bg-amber-500/15 text-amber-500 border-amber-500/30" :
                   "bg-rose-500/15 text-rose-500 border-rose-500/30";
    return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
            {pct}% match
        </span>
    );
}

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
        mutationFn: (jobId: string) =>
            withAuth(`/me/roadmap/cache?job_id=${jobId}`, { method: "DELETE" }),
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
            <div className="space-y-4 max-w-2xl animate-pulse">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-28 bg-muted rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold">My Roadmaps</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Job yang sedang kamu kejar. Setiap job punya roadmap dan progress tersendiri.
                </p>
            </div>

            {bookmarks.length === 0 && (
                <div className="text-center py-16 space-y-4">
                    <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                    <h2 className="font-semibold text-lg">Belum ada roadmap yang tersimpan</h2>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Buka halaman detail job lalu klik <strong>&quot;Buat Roadmap untuk Job Ini&quot;</strong> untuk mulai menyimpan job yang kamu targetkan.
                    </p>
                    <Button asChild variant="outline">
                        <Link href="/dashboard/jobs">Browse Lowongan</Link>
                    </Button>
                </div>
            )}

            <div className="space-y-3">
                {bookmarks.map((b) => {
                    const pct = b.total_steps > 0
                        ? Math.round((b.completed_steps / b.total_steps) * 100)
                        : 0;
                    const isDone = pct === 100;

                    return (
                        <Card key={b.job_id} className={isDone ? "border-green-500/30 bg-green-500/5" : ""}>
                            <CardHeader className="pb-2 pt-4 px-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <CardTitle className="text-base leading-snug">{b.title}</CardTitle>
                                            {isDone && (
                                                <Badge className="text-xs bg-green-500/20 text-green-600 border-0 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Selesai
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center flex-wrap gap-x-2">
                                            <span>{b.company}</span>
                                            {b.location && (
                                                <span className="flex items-center gap-0.5">
                                                    <MapPin className="w-2.5 h-2.5" />{b.location}
                                                </span>
                                            )}
                                            {b.is_remote && (
                                                <span className="flex items-center gap-0.5 text-emerald-500">
                                                    <Wifi className="w-2.5 h-2.5" />Remote
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <ScoreBadge score={b.match_score} />
                                </div>
                            </CardHeader>
                            <CardContent className="px-5 pb-4 space-y-3">
                                <ProgressBar done={b.completed_steps} total={b.total_steps} />

                                {/* Inline confirm banner */}
                                {confirmDeleteId === b.job_id ? (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                                        <p className="text-xs text-destructive flex-1 font-medium">
                                            Hapus roadmap ini? Progress tidak bisa dikembalikan.
                                        </p>
                                        <div className="flex gap-1.5 shrink-0">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-xs h-7 px-2"
                                                disabled={remove.isPending}
                                                onClick={() => setConfirmDeleteId(null)}
                                            >
                                                Batal
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="text-xs h-7 px-2"
                                                disabled={remove.isPending}
                                                onClick={() => remove.mutate(b.job_id)}
                                            >
                                                {remove.isPending ? "Menghapus…" : "Hapus"}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Button asChild size="sm" variant="outline" className="flex-1 text-xs">
                                            <Link href={`/dashboard/roadmap?job_id=${b.job_id}`} prefetch={false}>
                                                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                                                Buka Roadmap
                                            </Link>
                                        </Button>
                                        <Button asChild size="sm" variant="ghost" className="text-xs">
                                            <Link href={`/dashboard/jobs/${b.job_id}`} prefetch={false}>
                                                Detail Job
                                            </Link>
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-xs text-muted-foreground hover:text-destructive ml-auto"
                                            onClick={() => setConfirmDeleteId(b.job_id)}
                                            title="Hapus dari bookmark"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {bookmarks.length > 0 && (
                <p className="text-xs text-center text-muted-foreground">
                    {bookmarks.length} job dibookmark ·{" "}
                    {bookmarks.filter((b) => b.completed_steps === b.total_steps && b.total_steps > 0).length} selesai
                </p>
            )}
        </div>
    );
}
