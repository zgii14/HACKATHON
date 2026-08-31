"use client";

// Hallmark · genre: modern-minimal · macrostructure: Workbench (app-surface) · theme: GitHire violet (locked)

import { BarFill, CountUp, JobListRow, Reveal, SecTitle } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

type Profile = {
    github_username: string | null;
    merged_skills: string[] | null;
    updated_at: string | null;
} | null;

type Job = {
    id: string;
    title: string;
    company: string;
    location: string | null;
    is_remote: boolean;
    match_score: number | null;
    required_skills: string[];
    description?: string | null;
};

type SkillGap = {
    missing_skills: string[];
    missing_skill_count: number;
    unproven_demand: { skill: string; canonical_skill: string; job_count: number }[];
    has_profile: boolean;
    user_skill_count: number;
    total_job_skills: number;
    weak_skills: string[];
    github_backed_count: number;
    verified_skill_count: number;
};

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

function LoadingOverview() {
    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between pt-2">
                <div className="space-y-2">
                    <div className="h-3 w-44 animate-pulse rounded bg-muted/50" />
                    <div className="h-6 w-72 animate-pulse rounded bg-muted/50" />
                </div>
                <div className="h-10 w-40 animate-pulse rounded bg-muted/40" />
            </div>
            <div className="grid grid-cols-2 gap-px border-y border-border md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 animate-pulse bg-muted/30" />
                ))}
            </div>
            <div className="grid gap-10 lg:grid-cols-[4fr_8fr]">
                <div className="h-56 animate-pulse rounded bg-muted/30" />
                <div className="h-56 animate-pulse rounded bg-muted/30" />
            </div>
        </div>
    );
}

export default function DashboardHomePage() {
    const { withAuth, isLoaded, authReady } = useApi();
    const { user } = useUser();

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: () => withAuth<Profile | null>("/me/profile"),
        enabled: authReady,
        staleTime: 10 * 60 * 1000,
        retry: (failureCount, error) => {
            if ((error as Error).message === "AUTH_NOT_READY") return false;
            return failureCount < 2;
        },
    });

    const hasProfile = !!profile?.merged_skills?.length;

    const { data: gap } = useQuery({
        queryKey: ["skill-gap"],
        queryFn: () => withAuth<SkillGap>("/me/skill-gap"),
        enabled: authReady && hasProfile,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const { data: recommended } = useQuery({
        queryKey: ["jobs", "recommended"],
        queryFn: () => withAuth<Job[]>("/jobs/recommended"),
        enabled: authReady && hasProfile,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const { data: bookmarks = [], isLoading: bookmarksLoading } = useQuery({
        queryKey: ["bookmarks"],
        queryFn: () => withAuth<BookmarkedJob[]>("/me/bookmarks"),
        enabled: authReady && hasProfile,
        staleTime: 60_000,
        retry: false,
    });

    const { data: applications = [] } = useQuery({
        queryKey: ["applications"],
        queryFn: () => withAuth<{ id: string; status: string }[]>("/applications"),
        enabled: authReady && hasProfile,
        staleTime: 60_000,
        retry: false,
    });

    if (!isLoaded || (authReady && profileLoading)) {
        return <LoadingOverview />;
    }

    const firstName = user?.firstName ?? user?.username ?? "kamu";
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "pagi" : hour < 18 ? "siang" : "malam";
    const today = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date());

    const skillCount = profile?.merged_skills?.length ?? 0;
    const githubBacked = gap?.github_backed_count ?? 0;
    // Hanya skill dengan bukti commit yang boleh dilabeli "verified"
    const verifiedCount = gap?.verified_skill_count ?? 0;
    const gapCount = gap?.missing_skill_count ?? 0;
    const weakCount = gap?.unproven_demand?.length ?? 0;
    const topMatches = (recommended ?? []).slice(0, 5);
    const primaryMatch = topMatches[0];

    const activeBookmarks = bookmarks.length;
    const finishedBookmarks = bookmarks.filter((b) => b.total_steps > 0 && b.completed_steps === b.total_steps).length;
    const activeRoadmap = bookmarks.find((b) => b.total_steps > 0 && b.completed_steps < b.total_steps) ?? bookmarks[0];

    const appCount = applications.length;
    const interviewCount = applications.filter((a) => a.status === "interview" || a.status === "interview_confirmed").length;
    const offerCount = applications.filter((a) => a.status === "offer").length;

    const readinessItems = [
        {
            label: "Skill profile",
            complete: skillCount > 0,
            helper: `${skillCount} skill terdeteksi`,
            href: "/dashboard/profile",
        },
        {
            label: "GitHub evidence",
            complete: verifiedCount > 0,
            helper: verifiedCount > 0 ? `${verifiedCount} skill terverifikasi` : "belum ada bukti commit",
            href: "/dashboard/profile",
        },
        {
            label: "Job target",
            complete: activeBookmarks > 0,
            helper: activeBookmarks > 0 ? `${activeBookmarks} job dikejar` : "belum pilih target",
            href: "/dashboard/jobs",
        },
        {
            label: "Application tracker",
            complete: appCount > 0,
            helper: appCount > 0 ? `${appCount} lamaran dicatat` : "belum ada lamaran",
            href: "/dashboard/applications",
        },
    ];
    const readinessDone = readinessItems.filter((item) => item.complete).length;
    const readinessScore = Math.round((readinessDone / readinessItems.length) * 100);

    const nextAction = !hasProfile
        ? {
              title: "Lengkapi profil karier",
              description: "Hubungkan GitHub dan upload CV untuk membuka rekomendasi job, skill gap, dan roadmap personal.",
              href: "/dashboard/onboarding",
              cta: "Mulai onboarding",
          }
        : gapCount > 0
          ? {
                title: "Tutup skill gap prioritas",
                description: `Mulai dari ${gap?.missing_skills?.[0] ?? "skill paling dibutuhkan"} agar match score naik di lowongan relevan.`,
                href: "/dashboard/skill-gap",
                cta: "Lihat skill gap",
            }
          : activeRoadmap
            ? {
                  title: "Lanjutkan roadmap aktif",
                  description: `${activeRoadmap.title} sudah ${activeRoadmap.completed_steps}/${activeRoadmap.total_steps || 0} langkah selesai.`,
                  href: `/dashboard/roadmap?job_id=${activeRoadmap.job_id}`,
                  cta: "Buka roadmap",
              }
            : primaryMatch
              ? {
                    title: "Pilih target job terbaik",
                    description: `${primaryMatch.title} punya match score terbaik dari rekomendasi saat ini.`,
                    href: `/dashboard/jobs/${primaryMatch.id}`,
                    cta: "Lihat detail job",
                }
              : {
                    title: "Cari lowongan baru",
                    description: "Browse lowongan fresh graduate dan buat roadmap dari job yang ingin dikejar.",
                    href: "/dashboard/jobs",
                    cta: "Browse jobs",
                };

    /* ── State tanpa profil: blok tipografis polos ── */
    if (!hasProfile) {
        return (
            <Reveal className="mx-auto max-w-xl py-16">
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    dasbor / onboarding
                </p>
                <h1 className="mt-3 text-2xl font-bold tracking-tight">
                    Selamat {greeting}, {firstName}. Bangun profil GitHire dulu.
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Setelah GitHub dan CV tersambung, dasbor ini menampilkan match score, skill gap, roadmap
                    belajar, dan status lamaran dalam satu alur kerja.
                </p>
                <Link
                    href="/dashboard/onboarding"
                    className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-[13px] font-bold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                    Mulai onboarding →
                </Link>
                <div className="mt-10 border-t border-border pt-5">
                    <ul className="space-y-2.5">
                        {["Hubungkan akun GitHub", "Upload CV", "Sistem gabungkan skill + verifikasi dari repo"].map((step, i) => (
                            <li key={step} className="flex items-baseline gap-3 text-[13px] text-muted-foreground">
                                <span className="font-mono text-[11px] tabular-nums text-primary">{i + 1}.</span>
                                {step}
                            </li>
                        ))}
                    </ul>
                </div>
            </Reveal>
        );
    }

    return (
        <div className="w-full">
            {/* ── Head: crumb + greeting kiri, readiness kanan ── */}
            <Reveal>
                <div className="flex flex-col gap-6 pb-6 pt-1 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="font-mono text-[11px] text-muted-foreground">
                            dasbor / <span className="font-medium text-foreground">ringkasan</span> · {today}
                        </p>
                        <h1 className="mt-2 text-[22px] font-bold tracking-tight">
                            Selamat {greeting}, {firstName}
                        </h1>
                    </div>
                    <div className="md:text-right">
                        <div className="flex items-baseline gap-2.5 md:justify-end">
                            <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                                Kesiapan profil
                            </span>
                            <CountUp value={readinessScore} className="font-mono text-[28px] font-semibold tabular-nums tracking-tight" />
                            <span className="font-mono text-xs text-muted-foreground">/100</span>
                        </div>
                        <BarFill pct={readinessScore} className="mt-2 w-44 md:ml-auto" />
                        {profile?.github_username && (
                            <Link
                                href={`https://github.com/${profile.github_username}`}
                                target="_blank"
                                className="mt-2 inline-block font-mono text-[11.5px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                github.com/{profile.github_username} ↗
                            </Link>
                        )}
                    </div>
                </div>
            </Reveal>

            {/* ── Stat strip: 4 angka, hairline, nol ikon ── */}
            <Reveal delay={0.07}>
                <div className="grid grid-cols-2 border-y border-border md:grid-cols-4">
                    {[
                        { k: "Skill", v: skillCount, d: `${verifiedCount} verified · ${githubBacked} di GitHub`, href: "/dashboard/profile" },
                        { k: "Skill gap", v: gapCount, d: weakCount > 0 ? `${weakCount} perlu bukti` : "prioritas pasar", href: "/dashboard/skill-gap" },
                        { k: "Roadmap", v: activeBookmarks, d: `${finishedBookmarks} selesai`, href: "/dashboard/my-roadmaps" },
                        { k: "Lamaran", v: appCount, d: offerCount > 0 ? `${offerCount} offer` : interviewCount > 0 ? `${interviewCount} interview` : "status aktif", href: "/dashboard/applications" },
                    ].map((s, i) => (
                        <Link
                            key={s.k}
                            href={s.href}
                            prefetch={false}
                            className={`group relative overflow-hidden px-5 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                                i > 0 ? "border-l border-border max-md:[&:nth-child(3)]:border-l-0" : ""
                            } max-md:[&:nth-child(n+3)]:border-t max-md:[&:nth-child(n+3)]:border-border`}
                        >
                            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
                                {s.k}
                            </p>
                            <p className="mt-1 font-mono text-[30px] font-semibold tabular-nums tracking-tight">
                                <CountUp value={s.v} />
                            </p>
                            <p className="font-mono text-[11.5px] text-muted-foreground transition-colors group-hover:text-foreground">
                                {s.d}
                            </p>
                            <span
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-primary transition-transform duration-300 ease-out group-hover:scale-x-100 motion-reduce:transition-none"
                            />
                        </Link>
                    ))}
                </div>
            </Reveal>

            {/* ── Split 4/8: checklist + next action | top match table ── */}
            <div className="grid gap-10 pt-7 lg:grid-cols-[4fr_8fr]">
                <Reveal delay={0.14}>
                    <section aria-label="Checklist kesiapan">
                        <SecTitle title="Berikutnya" meta={`${readinessDone}/${readinessItems.length} selesai`} />
                        <ul>
                            {readinessItems.map((item) => (
                                <li
                                    key={item.label}
                                    className="flex items-center gap-3 border-b border-border/60 py-3 text-[13.5px]"
                                >
                                    <span
                                        className={`grid size-[15px] shrink-0 place-items-center rounded-[3px] border-[1.5px] ${
                                            item.complete
                                                ? "border-primary bg-primary"
                                                : "border-muted-foreground/50"
                                        }`}
                                    >
                                        {item.complete && (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary-foreground))" strokeWidth="3.5" className="size-2.5">
                                                <path d="M20 6 9 17l-5-5" />
                                            </svg>
                                        )}
                                    </span>
                                    <span className={item.complete ? "text-muted-foreground line-through decoration-muted-foreground/50" : ""}>
                                        {item.label}
                                    </span>
                                    <span className="ml-auto font-mono text-[11px] text-muted-foreground">{item.helper}</span>
                                </li>
                            ))}
                        </ul>

                        {/* Langkah berikutnya */}
                        <div className="mt-5 border-l-2 border-primary py-1 pl-4">
                            <p className="text-[13.5px] font-bold">{nextAction.title}</p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{nextAction.description}</p>
                            <Link
                                href={nextAction.href}
                                prefetch={false}
                                className="mt-2.5 inline-block text-[12.5px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {nextAction.cta} →
                            </Link>
                        </div>
                    </section>
                </Reveal>

                <Reveal delay={0.21}>
                    <section aria-label="Lowongan paling cocok">
                        <SecTitle title="Match teratas untukmu" meta={`${topMatches.length} dari ${recommended?.length ?? 0} rekomendasi`} />
                        {topMatches.length === 0 ? (
                            <p className="py-7 text-center text-[13px] text-muted-foreground">
                                Belum ada rekomendasi.{" "}
                                <Link href="/dashboard/jobs" className="font-semibold text-primary hover:underline">
                                    Browse lowongan
                                </Link>{" "}
                                atau update profil untuk mulai.
                            </p>
                        ) : (
                            <>
                                <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-4 pb-2 pt-3">
                                    <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.07em] text-muted-foreground">Posisi</span>
                                    <span className="text-right font-mono text-[10.5px] font-medium uppercase tracking-[0.07em] text-muted-foreground">Match</span>
                                    <span className="w-4" aria-hidden="true" />
                                </div>
                                <ul>
                                    {topMatches.map((job, i) => (
                                        <JobListRow key={job.id} job={job} index={i} />
                                    ))}
                                </ul>
                                <div className="flex items-center justify-between border-t border-border/60 pt-3">
                                    <span className="font-mono text-[11.5px] text-muted-foreground">
                                        Klik baris untuk lihat deskripsi · {recommended?.length ?? 0} cocok total
                                    </span>
                                    <Link
                                        href="/dashboard/jobs/recommended"
                                        className="text-[12.5px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        Lihat semua →
                                    </Link>
                                </div>
                            </>
                        )}
                    </section>
                </Reveal>
            </div>

            {/* ── Bawah: roadmap aktif | lamaran + skill gap ── */}
            <div className="grid gap-10 pt-10 lg:grid-cols-[7fr_5fr]">
                <Reveal delay={0.28}>
                    <section aria-label="Roadmap aktif">
                        <SecTitle
                            title="Roadmap aktif"
                            meta={
                                <Link href="/dashboard/my-roadmaps" className="hover:text-foreground hover:underline">
                                    semua roadmap →
                                </Link>
                            }
                        />
                        {bookmarksLoading ? (
                            <div className="space-y-2 pt-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-12 animate-pulse rounded bg-muted/30" />
                                ))}
                            </div>
                        ) : bookmarks.length === 0 ? (
                            <p className="py-7 text-center text-[13px] text-muted-foreground">
                                Belum ada roadmap target.{" "}
                                <Link href="/dashboard/jobs" className="font-semibold text-primary hover:underline">
                                    Pilih lowongan
                                </Link>{" "}
                                lalu buat roadmap dari detail job.
                            </p>
                        ) : (
                            <ul>
                                {bookmarks.slice(0, 4).map((bookmark) => {
                                    const pct = bookmark.total_steps > 0 ? Math.round((bookmark.completed_steps / bookmark.total_steps) * 100) : 0;
                                    const isDone = bookmark.total_steps > 0 && bookmark.completed_steps === bookmark.total_steps;
                                    return (
                                        <li key={bookmark.job_id} className="border-b border-border/60 transition-colors hover:bg-muted/35">
                                            <Link
                                                href={`/dashboard/roadmap?job_id=${bookmark.job_id}`}
                                                prefetch={false}
                                                className="flex items-center gap-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[13.5px] font-semibold leading-tight">
                                                        {bookmark.title}
                                                        {isDone && (
                                                            <span className="ml-2 rounded-[3px] border border-success/40 px-1.5 py-px align-[2px] font-mono text-[10px] font-semibold tracking-[0.05em] text-success">
                                                                SELESAI
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                        {bookmark.company}
                                                        {bookmark.is_remote ? " · remote" : ""}
                                                    </p>
                                                </div>
                                                <span className="font-mono text-[11.5px] tabular-nums text-muted-foreground">
                                                    {bookmark.completed_steps}/{bookmark.total_steps || 0}
                                                </span>
                                                <BarFill pct={pct} className="w-20 shrink-0" />
                                                <span className="min-w-[34px] text-right font-mono text-[12.5px] font-semibold tabular-nums">
                                                    {pct}%
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </section>
                </Reveal>

                <Reveal delay={0.35}>
                    <div className="space-y-8">
                        <section aria-label="Status lamaran">
                            <SecTitle
                                title="Status lamaran"
                                meta={
                                    <Link href="/dashboard/applications" className="hover:text-foreground hover:underline">
                                        detail →
                                    </Link>
                                }
                            />
                            <div className="grid grid-cols-3 pt-1">
                                {[
                                    { k: "Total", v: appCount },
                                    { k: "Interview", v: interviewCount },
                                    { k: "Offer", v: offerCount },
                                ].map((s, i) => (
                                    <div key={s.k} className={`py-3 ${i > 0 ? "border-l border-border pl-5" : ""}`}>
                                        <p className="font-mono text-[24px] font-semibold tabular-nums tracking-tight">
                                            <CountUp value={s.v} />
                                        </p>
                                        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{s.k}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section aria-label="Skill gap prioritas">
                            <SecTitle
                                title="Skill gap prioritas"
                                meta={
                                    <Link href="/dashboard/skill-gap" className="hover:text-foreground hover:underline">
                                        analisis →
                                    </Link>
                                }
                            />
                            {gapCount > 0 ? (
                                <div className="pt-3">
                                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                                        {(gap?.missing_skills ?? []).slice(0, 8).map((skill, i) => (
                                            <span key={skill}>
                                                {i > 0 && <span className="mx-1.5 text-border">·</span>}
                                                <span className="font-semibold text-foreground">{skill}</span>
                                            </span>
                                        ))}
                                        {gapCount > 8 && <span className="ml-1.5 font-mono text-xs">+{gapCount - 8} lagi</span>}
                                    </p>
                                    {weakCount > 0 && (
                                        <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                                            <span className="font-mono font-semibold text-warning">{weakCount}</span> skill ada di
                                            CV tapi belum punya bukti kuat dari GitHub.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="pt-3 text-[13px] text-muted-foreground">
                                    Skill utama pasar sudah tertutup. Saatnya{" "}
                                    <Link href="/dashboard/jobs" className="font-semibold text-primary hover:underline">
                                        pilih target job
                                    </Link>
                                    .
                                </p>
                            )}
                        </section>
                    </div>
                </Reveal>
            </div>
        </div>
    );
}
