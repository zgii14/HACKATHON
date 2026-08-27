"use client";

// Hallmark · shared dashboard primitives · genre: modern-minimal · theme: GitHire violet (locked)
// Satu sumber kebenaran untuk semua page dashboard biar seragam.

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const ACTION_CLS =
    "inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-[12.5px] font-bold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/* ── Reveal: fade + slide-up saat mount ── */
export function Reveal({
    children,
    delay = 0,
    className = "",
}: {
    children: React.ReactNode;
    delay?: number;
    className?: string;
}) {
    const reduced = useReducedMotion();
    return (
        <motion.div
            className={className}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT, delay }}
        >
            {children}
        </motion.div>
    );
}

/* ── Count-up angka via rAF ── */
export function useCountUp(target: number, duration = 900) {
    const reduced = useReducedMotion();
    const [value, setValue] = useState(reduced ? target : 0);
    const raf = useRef<number>();

    useEffect(() => {
        if (reduced) {
            setValue(target);
            return;
        }
        let t0: number | null = null;
        const tick = (t: number) => {
            if (t0 === null) t0 = t;
            const p = Math.min((t - t0) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setValue(Math.round(target * eased));
            if (p < 1) raf.current = requestAnimationFrame(tick);
        };
        const start = setTimeout(() => {
            raf.current = requestAnimationFrame(tick);
        }, 200);
        return () => {
            clearTimeout(start);
            if (raf.current) cancelAnimationFrame(raf.current);
        };
    }, [target, duration, reduced]);

    return value;
}

export function CountUp({ value, className = "" }: { value: number; className?: string }) {
    const display = useCountUp(value);
    return <span className={className}>{display}</span>;
}

/* ── Bar tipis yang mengisi dari 0 ── */
export function BarFill({
    pct,
    tone = "primary",
    className = "",
}: {
    pct: number;
    tone?: "primary" | "warning" | "success";
    className?: string;
}) {
    const reduced = useReducedMotion();
    const [width, setWidth] = useState(reduced ? pct : 0);

    useEffect(() => {
        if (reduced) {
            setWidth(pct);
            return;
        }
        const t = setTimeout(() => setWidth(pct), 300);
        return () => clearTimeout(t);
    }, [pct, reduced]);

    const bar = tone === "warning" ? "bg-warning" : tone === "success" ? "bg-success" : "bg-primary";

    return (
        <span className={`block h-[3px] bg-muted ${className}`}>
            <span
                className={`block h-full ${bar}`}
                style={{ width: `${width}%`, transition: reduced ? "none" : "width .8s cubic-bezier(0.16,1,0.3,1)" }}
            />
        </span>
    );
}

/* ── Judul section: teks + garis hairline bawah ── */
export function SecTitle({ title, meta }: { title: string; meta?: React.ReactNode }) {
    return (
        <div className="flex items-baseline justify-between border-b border-border pb-2.5">
            <h2 className="text-[13px] font-bold tracking-tight">{title}</h2>
            {meta && <span className="font-mono text-[11px] text-muted-foreground">{meta}</span>}
        </div>
    );
}

/* ── Breadcrumb mono: segmen terakhir tegas ── */
export function Crumb({ path }: { path: string }) {
    const segs = path.split("/").map((s) => s.trim());
    return (
        <p className="font-mono text-[11px] text-muted-foreground">
            {segs.map((s, i) => (
                <span key={i}>
                    {i > 0 && " / "}
                    {i === segs.length - 1 ? <span className="font-medium text-foreground">{s}</span> : s}
                </span>
            ))}
        </p>
    );
}

/* ── Header halaman: crumb + judul kiri, slot kanan ── */
export function PageHeader({
    crumb,
    title,
    sub,
    right,
}: {
    crumb: string;
    title: string;
    sub?: string;
    right?: React.ReactNode;
}) {
    return (
        <Reveal>
            <div className="flex flex-col gap-5 border-b border-border pb-6 pt-1 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                    <Crumb path={crumb} />
                    <h1 className="mt-2 text-[22px] font-bold tracking-tight">{title}</h1>
                    {sub && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{sub}</p>}
                </div>
                {right && <div className="shrink-0 md:text-right">{right}</div>}
            </div>
        </Reveal>
    );
}

/* ── Match cell: angka mono + bar mini ── */
export function MatchCell({ score }: { score: number | null }) {
    if (score == null) return <span className="font-mono text-xs text-muted-foreground">—</span>;
    const pct = Math.round(score * 100);
    const low = pct < 70;
    return (
        <span className="flex items-center justify-end gap-2.5">
            <span className="min-w-[34px] text-right font-mono text-[13px] font-semibold tabular-nums">{pct}%</span>
            <BarFill pct={pct} tone={low ? "warning" : "primary"} className="w-14" />
        </span>
    );
}

/* ── Tombol aksi utama (satu-satunya fill) ── */
export function ActionLink({
    href,
    children,
    external = false,
}: {
    href: string;
    children: React.ReactNode;
    external?: boolean;
}) {
    if (external) {
        return (
            <a href={href} className={ACTION_CLS} target="_blank" rel="noreferrer">
                {children}
            </a>
        );
    }
    return (
        <Link href={href} prefetch={false} className={ACTION_CLS}>
            {children}
        </Link>
    );
}

/* ── Baris job expandable: ringkas → deskripsi + skill + CTA. Dipakai lintas page. ── */
export type JobRowData = {
    id: string;
    title: string;
    company: string;
    location: string | null;
    is_remote: boolean;
    match_score: number | null;
    required_skills: string[];
    description?: string | null;
    salary?: string | null;
    work_type?: string | null;
    min_experience?: string | null;
};

export function JobListRow({ job, rank, index }: { job: JobRowData; rank?: number; index?: number }) {
    const [open, setOpen] = useState(false);
    const reduced = useReducedMotion();
    const pct = job.match_score == null ? null : Math.round(job.match_score * 100);
    const cols = rank != null ? "grid-cols-[auto_minmax(0,1fr)_auto_auto]" : "grid-cols-[minmax(0,1fr)_auto_auto]";
    const stagger = Math.min((index ?? 0) * 0.04, 0.4);

    return (
        <motion.li
            className="border-t border-border/60 last:border-b"
            initial={reduced ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.4, ease: EASE_OUT, delay: stagger }}
        >
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className={`grid w-full ${cols} items-center gap-4 py-3 text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`}
            >
                {rank != null && (
                    <span className="w-6 shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">{rank}</span>
                )}
                <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold leading-tight">{job.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {job.company}
                        {job.location ? ` · ${job.location}` : ""}
                        {job.is_remote ? " · remote" : ""}
                    </span>
                </span>
                <span className="shrink-0">
                    <MatchCell score={job.match_score} />
                </span>
                <motion.span
                    aria-hidden="true"
                    className="text-muted-foreground"
                    animate={{ rotate: open ? 90 : 0 }}
                    transition={{ duration: reduced ? 0 : 0.2, ease: EASE_OUT }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                        <path d="m9 18 6-6-6-6" />
                    </svg>
                </motion.span>
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="panel"
                        className="overflow-hidden"
                        initial={reduced ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: reduced ? 0.12 : 0.3, ease: EASE_OUT }}
                    >
                        <motion.div
                            className="pb-4 pr-4"
                            initial={reduced ? false : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: reduced ? 0 : 0.28, ease: EASE_OUT, delay: reduced ? 0 : 0.05 }}
                        >
                            {(job.salary || job.work_type || job.min_experience) && (
                                <p className="mb-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11.5px] text-muted-foreground">
                                    {job.salary && <span className="text-success">{job.salary}</span>}
                                    {job.work_type && <span>{job.work_type}</span>}
                                    {job.min_experience && <span>pengalaman {job.min_experience}</span>}
                                </p>
                            )}

                            {job.description ? (
                                <p className="max-w-prose text-[13px] leading-relaxed text-muted-foreground">{job.description}</p>
                            ) : (
                                <p className="text-[13px] text-muted-foreground">Deskripsi belum tersedia untuk lowongan ini.</p>
                            )}

                            {job.required_skills.length > 0 && (
                                <p className="mt-3 text-xs leading-relaxed">
                                    <span className="font-mono uppercase tracking-[0.06em] text-muted-foreground">skill · </span>
                                    {job.required_skills.map((skill, i) => (
                                        <span key={skill}>
                                            {i > 0 && <span className="mx-1.5 text-border">·</span>}
                                            <span className="font-medium text-foreground">{skill}</span>
                                        </span>
                                    ))}
                                </p>
                            )}

                            <div className="mt-4 flex flex-wrap items-center gap-4">
                                <ActionLink href={`/dashboard/jobs/${job.id}`}>
                                    Lihat detail
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
                                        <path d="M5 12h14M13 5l7 7-7 7" />
                                    </svg>
                                </ActionLink>
                                <Link
                                    href={`/dashboard/roadmap?job_id=${job.id}`}
                                    prefetch={false}
                                    className="text-[12.5px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    Buat roadmap
                                </Link>
                                {pct != null && (
                                    <span className="font-mono text-[11.5px] text-muted-foreground">match {pct}% dengan profilmu</span>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.li>
    );
}

/* ── JobCard: kartu Joblet-style (2 kolom desktop / 1 kolom mobile) ── */
export function JobCard({
    job,
    rank,
    index,
    featured = false,
}: {
    job: JobRowData;
    rank?: number;
    index?: number;
    featured?: boolean;
}) {
    const reduced = useReducedMotion();
    const pct = job.match_score == null ? null : Math.round(job.match_score * 100);
    const stagger = Math.min((index ?? 0) * 0.04, 0.4);
    const badge = pct == null ? null : pct >= 80 ? "Top match" : pct >= 60 ? "High match" : "Match";

    return (
        <motion.li
            className="relative h-full"
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.4, ease: EASE_OUT, delay: stagger }}
        >
            <Link
                href={`/dashboard/jobs/${job.id}`}
                aria-label={`Lihat detail ${job.title}`}
                className="absolute inset-0 z-0 rounded-lg transition-colors duration-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div
                className={`group relative flex h-full flex-col rounded-lg border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                    featured
                        ? "border-primary/40 bg-primary/[0.04]"
                        : "border-border bg-background hover:border-primary/40"
                }`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {rank != null && (
                            <span className="font-mono text-[10.5px] uppercase tracking-[0.07em] text-muted-foreground">
                                #{rank}
                                {featured ? " · pilihan teratas" : ""}
                            </span>
                        )}
                        <h3 className={`mt-1 line-clamp-2 text-[15px] leading-tight tracking-tight ${featured ? "font-bold text-primary" : "font-bold"}`}>
                            {job.title}
                        </h3>
                        <p className="mt-1 truncate text-[12.5px] text-muted-foreground">
                            {job.company}
                            {job.location ? ` · ${job.location}` : ""}
                            {job.is_remote ? " · remote" : ""}
                        </p>
                    </div>
                    {badge != null && (
                        <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.05em] ${
                                badge === "Top match"
                                    ? "border-primary/50 bg-primary/10 text-primary"
                                    : "border-border bg-muted/40 text-muted-foreground"
                            }`}
                        >
                            {badge}
                        </span>
                    )}
                </div>

                {job.salary && <p className="mt-2.5 text-[13.5px] font-semibold text-success">{job.salary}</p>}

                {pct != null && (
                    <div className="mt-3">
                        <div className="flex items-baseline justify-between">
                            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-muted-foreground">Match</span>
                            <span className="font-mono text-[16px] font-semibold tabular-nums tracking-tight">{pct}%</span>
                        </div>
                        <BarFill pct={pct} tone={pct >= 60 ? "primary" : "warning"} className="mt-1 w-full" />
                    </div>
                )}

                {job.required_skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {job.required_skills.slice(0, 5).map((skill) => (
                            <span key={skill} className="rounded-[4px] border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                {skill}
                            </span>
                        ))}
                        {job.required_skills.length > 5 && (
                            <span className="px-1 py-0.5 text-[11px] text-muted-foreground">+{job.required_skills.length - 5}</span>
                        )}
                    </div>
                )}

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
                    <span className="truncate font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted-foreground">
                        {job.work_type || (job.is_remote ? "Remote" : "On-site")}
                        {job.min_experience ? ` · ${job.min_experience}` : ""}
                    </span>
                    <div className="flex shrink-0 items-center gap-3">
                        <Link
                            href={`/dashboard/roadmap?job_id=${job.id}`}
                            prefetch={false}
                            className="relative z-10 text-[12.5px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            Buat roadmap
                        </Link>
                        <Link
                            href={`/dashboard/jobs/${job.id}`}
                            prefetch={false}
                            className="relative z-10 inline-flex items-center gap-1 text-[12.5px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            Lihat detail
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                            >
                                <path d="M5 12h14M13 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </motion.li>
    );
}

/* ── Spotlight: sorot lembut ikut kursor + lift halus saat hover ── */
export function Spotlight({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    const reduced = useReducedMotion();
    const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
    return (
        <div
            onMouseMove={reduced ? undefined : (e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
            }}
            onMouseLeave={() => setPos(null)}
            className={`group relative isolate transition-transform duration-300 ease-out hover:-translate-y-0.5 ${className}`}
        >
            {!reduced && pos && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: `radial-gradient(340px circle at ${pos.x}px ${pos.y}px, hsl(var(--primary) / 0.10), transparent 60%)` }}
                />
            )}
            {children}
        </div>
    );
}

/* ── State kosong: tegak, actionable, non-italic ── */
export function EmptyState({
    title,
    children,
}: {
    title: string;
    children?: React.ReactNode;
}) {
    return (
        <div className="border-y border-border py-14 text-center">
            <p className="text-[15px] font-bold">{title}</p>
            {children && <p className="mx-auto mt-1.5 max-w-md text-[13.5px] text-muted-foreground">{children}</p>}
        </div>
    );
}

/* ── Re-export motion helpers untuk page yang butuh accordion ── */
export { AnimatePresence, motion, useReducedMotion };
