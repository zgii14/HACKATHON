"use client";

import { EmptyState, PageHeader, SecTitle } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { EditorWorkspace, type EditorProfile } from "./editor/editor-workspace";
import { MAX_PORTFOLIO_PROJECTS, rankRepositories } from "./portfolio-editor-helpers";
import type { PortfolioLanguage, PortfolioRecord } from "./types";

type Profile = EditorProfile & {
    cv_data: Record<string, unknown> | null;
    github_connection?: "verified" | "legacy_unverified" | "none";
};

export function PortfolioEditor() {
    const { withAuth, authReady } = useApi();
    const queryClient = useQueryClient();
    const [language, setLanguage] = useState<PortfolioLanguage>("id");
    const [repoNames, setRepoNames] = useState<string[]>([]);
    const [generating, setGenerating] = useState(false);

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: () => withAuth<Profile | null>("/me/profile"),
        enabled: authReady,
    });
    const { data: portfolio, isLoading: portfolioLoading } = useQuery({
        queryKey: ["portfolio"],
        queryFn: () => withAuth<PortfolioRecord | null>("/me/portfolio"),
        enabled: authReady,
    });

    const repos = useMemo(() => profile?.github_signals?.repos_detail ?? [], [profile]);
    const rankedRepos = useMemo(() => rankRepositories(repos), [repos]);

    // Default hanya sekali; tanpa ref ini, melepas semua centang langsung memilih ulang 6 repo.
    const repoDefaultsApplied = useRef(false);
    useEffect(() => {
        if (repoDefaultsApplied.current || !rankedRepos.length) return;
        repoDefaultsApplied.current = true;
        setRepoNames(rankedRepos.slice(0, MAX_PORTFOLIO_PROJECTS).map((repo) => repo.name));
    }, [rankedRepos]);

    const toggleRepo = (name: string) => {
        setRepoNames((current) => current.includes(name)
            ? current.filter((item) => item !== name)
            : current.length < MAX_PORTFOLIO_PROJECTS ? [...current, name] : current);
    };

    const generate = async () => {
        setGenerating(true);
        try {
            const result = await withAuth<PortfolioRecord>("/me/portfolio/generate", {
                method: "POST",
                body: JSON.stringify({ language, repo_names: repoNames }),
            });
            queryClient.setQueryData(["portfolio"], result);
            toast.success("Draft portfolio berhasil dibuat.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi.");
        } finally {
            setGenerating(false);
        }
    };

    if (profileLoading || portfolioLoading) {
        return <div className="h-48 animate-pulse rounded-md bg-muted/40" />;
    }

    if (!profile?.cv_data || !profile.github_signals) {
        const needsGithub = (profile?.github_connection ?? "none") === "none";
        return (
            <div className="w-full">
                <PageHeader crumb="dasbor / portfolio" title="Portfolio saya" />
                <div className="pt-8">
                    <EmptyState title={needsGithub ? "Hubungkan GitHub dulu" : "CV belum lengkap"}>
                        {needsGithub
                            ? "Portfolio dibangun dari repo GitHub-mu. Hubungkan GitHub lalu upload CV. "
                            : "Upload CV terlebih dahulu. "}
                        <Link className="font-semibold text-primary hover:underline" href="/dashboard/onboarding">Buka Data GitHub & CV →</Link>
                    </EmptyState>
                </div>
            </div>
        );
    }

    if (!portfolio?.draft_content) {
        const choice = "rounded-lg border border-border px-3 py-2 text-[13px] font-semibold transition hover:bg-muted";
        return (
            <div className="w-full max-w-3xl">
                <PageHeader crumb="dasbor / portfolio" title="Buat portfolio publik" sub="Pilih bahasa dan maksimal enam repository. AI menyiapkan draft yang wajib kamu periksa sebelum dipublikasikan." />
                <section className="pt-8">
                    <SecTitle title="Bahasa portfolio" />
                    <div className="mt-3 flex gap-2">
                        {(["id", "en"] as PortfolioLanguage[]).map((value) => (
                            <button key={value} type="button" onClick={() => setLanguage(value)} className={`${choice} ${language === value ? "border-primary bg-primary/10 text-primary" : ""}`}>
                                {value === "id" ? "Bahasa Indonesia" : "English"}
                            </button>
                        ))}
                    </div>
                </section>
                <section className="pt-8">
                    <SecTitle title="Proyek unggulan" meta={`${repoNames.length}/6 dipilih`} />
                    <div className="mt-3 divide-y divide-border border-y border-border">
                        {rankedRepos.map((repo) => {
                            const disabled = !repoNames.includes(repo.name) && repoNames.length >= MAX_PORTFOLIO_PROJECTS;
                            return (
                                <label key={repo.name} className={`flex items-center gap-3 py-3 text-sm ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                                    <input type="checkbox" checked={repoNames.includes(repo.name)} onChange={() => toggleRepo(repo.name)} disabled={disabled} />
                                    <span className="min-w-0 flex-1 truncate font-medium">{repo.name}</span>
                                    <span className="font-mono text-meta text-muted-foreground">★ {repo.stars ?? 0} · {repo.own_commits ?? 0} commit</span>
                                </label>
                            );
                        })}
                    </div>
                    <button type="button" className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50" disabled={generating || repoNames.length === 0} onClick={generate}>
                        {generating ? "Menyusun draft…" : "Buat draft portfolio"}
                    </button>
                </section>
            </div>
        );
    }

    return <EditorWorkspace key={portfolio.public_id} record={portfolio} profile={profile} />;
}
