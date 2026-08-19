"use client";

// Hallmark · genre: modern-minimal · macrostructure: Workbench (app-surface) · theme: GitHire violet (locked)

import { useState } from "react";

/**
 * Skill yang lolos verifikasi bukti commit GitHub (backend:
 * app/services/skill_verification.py). Berbeda dari merged_skills yang bersifat
 * declared — merged_skills tetap dipakai untuk matching, verified hanya bukti.
 */
export type VerifiedSkillLevel = "mahir" | "menengah" | "pemula";

export type VerifiedSkill = {
    skill: string;
    level: VerifiedSkillLevel;
    verified: boolean;
    score: number;
    evidence: {
        repos: number;
        bytes: number;
        last_used: string | null;
        own_commits: number;
        confidence: "high" | "low";
        commit_source: string;
        repo_names: string[];
        repo_urls: string[];
    };
};

// Level dibedakan warna DAN teks — warna tidak pernah jadi satu-satunya penanda
const LEVEL_STYLE: Record<VerifiedSkillLevel, string> = {
    mahir: "border-success/40 text-success",
    menengah: "border-primary/40 text-primary",
    pemula: "border-border text-muted-foreground",
};

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function formatLastUsed(value: string | null | undefined): string {
    if (!value) return "tidak diketahui";
    const [year, month] = value.split("-");
    const idx = Number(month) - 1;
    if (!year || Number.isNaN(idx) || idx < 0 || idx > 11) return value;
    return `${MONTHS[idx]} ${year}`;
}

export function LevelBadge({ level }: { level: VerifiedSkillLevel }) {
    return (
        <span
            className={`shrink-0 rounded-[3px] border px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.06em] ${LEVEL_STYLE[level] ?? LEVEL_STYLE.pemula}`}
        >
            {level}
        </span>
    );
}

export function VerifiedSkillRow({
    item,
    showRepos = false,
}: {
    item: VerifiedSkill;
    showRepos?: boolean;
}) {
    const ev = item.evidence ?? ({} as VerifiedSkill["evidence"]);
    const names = ev.repo_names ?? [];
    const urls = ev.repo_urls ?? [];

    return (
        <div className="border-b border-border py-3 last:border-b-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <span className="text-[13.5px] font-semibold">{item.skill}</span>
                <LevelBadge level={item.level} />
                <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
                    skor {item.score}
                </span>
            </div>
            <p className="mt-1 font-mono text-[11.5px] leading-relaxed text-muted-foreground">
                dipakai di {ev.repos ?? 0} repo · {ev.own_commits ?? 0} commit sendiri · terakhir{" "}
                {formatLastUsed(ev.last_used)}
            </p>
            {showRepos && urls.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    {urls.map((url, i) => (
                        <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[11px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {names[i] ?? url} ↗
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Daftar skill terverifikasi yang dipangkas. Skill diurutkan skor menurun dari
 * backend, jadi yang terpotong selalu yang paling lemah — recruiter melihat
 * bukti terkuat lebih dulu tanpa panel jadi kepanjangan.
 */
export function VerifiedSkillList({
    items,
    initial = 4,
    showRepos = false,
}: {
    items: VerifiedSkill[];
    initial?: number;
    showRepos?: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const hidden = items.length - initial;
    const visible = expanded ? items : items.slice(0, initial);

    return (
        <div>
            <div className="border-t border-border">
                {visible.map((item) => (
                    <VerifiedSkillRow key={item.skill} item={item} showRepos={showRepos} />
                ))}
            </div>
            {hidden > 0 && (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className="mt-2 font-mono text-[11.5px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {expanded ? "Tampilkan lebih sedikit" : `Lihat semua (${items.length}) →`}
                </button>
            )}
        </div>
    );
}

/** Ringkasan padat untuk list/kartu kandidat di sisi recruiter. */
export function VerifiedSkillChips({
    items,
    max = 4,
}: {
    items: VerifiedSkill[];
    max?: number;
}) {
    if (!items.length) return null;
    const shown = items.slice(0, max);
    const rest = items.length - shown.length;
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {shown.map((item) => (
                <span
                    key={item.skill}
                    className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[12px]"
                    title={`Terverifikasi · ${item.evidence?.repos ?? 0} repo · ${item.evidence?.own_commits ?? 0} commit`}
                >
                    {item.skill}
                    <LevelBadge level={item.level} />
                </span>
            ))}
            {rest > 0 && (
                <span className="font-mono text-[11px] text-muted-foreground">+{rest} lagi</span>
            )}
        </div>
    );
}
