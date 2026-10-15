import { GithubVerifiedLabel } from "@/components/dashboard/github-verified-label";
import { Reveal } from "@/components/dashboard/ui";
import type { PublicPortfolio } from "@/components/portfolio/types";
import { cn } from "@/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CtaLink } from "./cta-link";
import { GlowCard } from "./glow-card";

export type PublicJob = {
    id: string;
    title: string;
    company: string;
    location: string | null;
    work_type: string | null;
    is_remote: boolean;
};

export type PublicJobs = { total: number; items: PublicJob[] };

const container = "mx-auto max-w-6xl px-5 sm:px-8";
const h2 = "text-[clamp(1.75rem,3.4vw,2.6rem)] font-extrabold leading-[1.08] tracking-[-0.035em] [text-wrap:balance]";
const pill = "inline-flex rounded-full px-6 py-3 text-[15px] font-semibold transition active:translate-y-px";

const STEPS = [
    { title: "Hubungkan GitHub", copy: "Repo publikmu dibaca untuk menemukan skill yang benar-benar kamu pakai di commit." },
    { title: "Upload CV", copy: "Pengalaman, pendidikan, dan sertifikat diambil dari CV, lalu bisa kamu sunting." },
    { title: "Pilih tampilan dan bagikan", copy: "Pilih satu dari empat tema, publish, dan bagikan satu link ke recruiter." },
];

/* ── Section 3: isi portfolio dari kerja nyata ── */
export function ProofSection({ portfolio }: { portfolio: PublicPortfolio | null }) {
    const skills = (portfolio?.verified_skills ?? []).slice(0, 6);
    return (
        <section id="portfolio" className="scroll-mt-20 py-20 md:py-28">
            <div className={cn(container, "grid gap-12 lg:grid-cols-2 lg:items-end lg:gap-16")}>
                <Reveal className="min-w-0">
                    <h2 className={h2}>Isinya dari kerja nyatamu, bukan klaim.</h2>
                    <ul className="mt-8 space-y-6">
                        {STEPS.map((step) => (
                            <li key={step.title}>
                                <p className="text-[16px] font-bold">{step.title}</p>
                                <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">{step.copy}</p>
                            </li>
                        ))}
                    </ul>
                </Reveal>
                {skills.length > 0 && (
                    <Reveal delay={0.08} className="min-w-0">
                        <div className="rounded-xl border border-border bg-card p-5">
                            <p className="text-[14px] font-bold">Skill terverifikasi dari commit</p>
                            <ul className="mt-3 divide-y divide-border">
                                {skills.map((item) => (
                                    <li key={item.skill} className="flex items-baseline justify-between gap-4 py-2.5">
                                        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-[14px] font-semibold">
                                            {item.skill}
                                            {item.level && <span className="font-normal text-muted-foreground">{item.level}</span>}
                                        </span>
                                        <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">
                                            {item.evidence?.repos ?? 0} repo · {item.evidence?.own_commits ?? 0} commit
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Reveal>
                )}
            </div>
        </section>
    );
}

/* ── Section 4: yang dilihat recruiter ── */
export function RecruiterViewSection({ portfolio }: { portfolio: PublicPortfolio | null }) {
    const content = portfolio?.content;
    return (
        <section className="border-y border-border bg-muted/40 py-20 md:py-28">
            <div className={cn(container, "grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16")}>
                <Reveal className="min-w-0">
                    <h2 className={h2}>Satu link yang langsung dibaca recruiter.</h2>
                    <p className="mt-5 text-[16px] leading-relaxed text-muted-foreground">
                        Recruiter melihat skill yang terbukti di repo, proyek yang kamu pilih, dan label GitHub terverifikasi sebelum membuka lamaran.
                    </p>
                </Reveal>
                {content && (
                    <Reveal delay={0.08} className="min-w-0">
                        <div className="rounded-xl border border-border bg-card p-5">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[15px] font-bold">{content.name}</p>
                                <GithubVerifiedLabel verified={portfolio?.github_verified} />
                            </div>
                            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{content.headline}</p>
                            <div className="mt-4 flex flex-wrap gap-1.5">
                                {(portfolio?.verified_skills ?? []).slice(0, 4).map((item) => (
                                    <span key={item.skill} className="rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-semibold text-primary">
                                        {item.skill}
                                    </span>
                                ))}
                            </div>
                            <ul className="mt-4 space-y-1 border-t border-border pt-4 text-[13px] text-muted-foreground">
                                {(content.projects ?? []).slice(0, 3).map((project) => (
                                    <li key={project.repo_name} className="truncate">
                                        <span className="font-semibold text-foreground">{project.repo_name}</span>
                                        {project.tech_stack?.length ? ` · ${project.tech_stack.slice(0, 3).join(", ")}` : ""}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Reveal>
                )}
            </div>
        </section>
    );
}

/* ── Section 5: lowongan asli yang sedang buka ── */
export function JobsSection({ jobs }: { jobs: PublicJobs | null }) {
    if (!jobs || jobs.items.length === 0) return null;
    return (
        <section id="lowongan" className="scroll-mt-20 py-20 md:py-28">
            <div className={container}>
                <Reveal>
                    <h2 className={h2}>Lowongan IT yang sedang buka.</h2>
                    <ul className="mt-10 divide-y divide-border border-y border-border">
                        {jobs.items.map((job) => (
                            <li key={job.id}>
                                <Link href={`/dashboard/jobs/${job.id}`} className="group flex flex-col gap-1 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between sm:px-2">
                                    <span className="text-[16px] font-semibold transition-colors group-hover:text-primary">{job.title.trim()}</span>
                                    <span className="flex items-center gap-3 text-[14px] text-muted-foreground">
                                        <span>
                                            {job.company}
                                            {job.is_remote ? " · Remote" : job.location ? ` · ${job.location}` : ""}
                                        </span>
                                        <ArrowRight
                                            aria-hidden="true"
                                            className="hidden size-4 -translate-x-2 text-primary opacity-0 transition duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100 sm:block"
                                        />
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                        <p className="text-[15px] text-muted-foreground">
                            <span className="font-mono font-semibold tabular-nums text-foreground">{jobs.total}</span> lowongan aktif
                        </p>
                        <Link href="/dashboard/jobs" className="text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
                            Lihat semua lowongan
                        </Link>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

/* ── Section 6: untuk recruiter ── */
export function RecruiterCtaSection() {
    return (
        <section id="recruiter" className="scroll-mt-20 border-t border-border py-20 md:py-24">
            <Reveal className={cn(container, "flex flex-col gap-6 md:flex-row md:items-end md:justify-between")}>
                <div className="max-w-2xl">
                    <h2 className={h2}>Merekrut developer?</h2>
                    <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
                        Cari kandidat dari skill yang terbukti di repo, baca portfolio mereka, dan saring lamaran dengan bantuan AI.
                    </p>
                </div>
                <Link href="/recruiter/apply" className={cn(pill, "shrink-0 border border-border bg-background text-foreground hover:bg-muted")}>
                    Daftar sebagai recruiter
                </Link>
            </Reveal>
        </section>
    );
}

/* ── Section 7: harga ── */
const PLANS = [
    { name: "Starter", price: "Gratis", period: "", soon: false, features: ["Import CV dan GitHub", "Skill terverifikasi", "4 tema portfolio", "Publish portfolio", "Job match"] },
    { name: "Premium", price: "Rp 79.000", period: "/ bulan", soon: true, features: ["Semua fitur Starter", "Subdomain nama.githire.my.id"] },
    { name: "Pro", price: "Rp 159.000", period: "/ bulan", soon: true, features: ["Semua fitur Premium", "Custom domain", "Tambah dan susun section bebas"] },
];

export function PricingSection() {
    return (
        <section id="harga" className="scroll-mt-20 border-t border-border bg-muted/40 py-20 md:py-28">
            <div className={container}>
                <Reveal>
                    <h2 className={h2}>Harga</h2>
                    <div className="mt-10 grid gap-4 md:grid-cols-3">
                        {PLANS.map((plan) => (
                            <GlowCard
                                key={plan.name}
                                className={cn(
                                    "flex flex-col rounded-xl border bg-card p-6 transition-[transform,box-shadow] duration-300 ease-out motion-safe:hover:-translate-y-1",
                                    plan.soon
                                        ? "border-border hover:shadow-[0_16px_40px_-24px_rgba(76,29,149,0.25)]"
                                        : "border-primary shadow-[0_16px_40px_-20px_rgba(76,29,149,0.35)] hover:shadow-[0_24px_50px_-20px_rgba(76,29,149,0.45)]",
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[17px] font-bold">{plan.name}</h3>
                                    {plan.soon && <span className="rounded-full bg-muted px-2.5 py-1 text-[12px] font-semibold text-muted-foreground">Segera</span>}
                                </div>
                                <p className="mt-4">
                                    <span className="text-[28px] font-extrabold tracking-[-0.03em]">{plan.price}</span>
                                    {plan.period && <span className="ml-1 text-[14px] text-muted-foreground">{plan.period}</span>}
                                </p>
                                <ul className="mt-5 flex-1 space-y-2 text-[14px] text-muted-foreground">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className={cn(plan.soon && "opacity-80")}>{feature}</li>
                                    ))}
                                </ul>
                                {!plan.soon && (
                                    <CtaLink label="Mulai gratis" className={cn(pill, "mt-6 justify-center bg-primary text-primary-foreground hover:brightness-110")} />
                                )}
                            </GlowCard>
                        ))}
                    </div>
                </Reveal>
            </div>
        </section>
    );
}

/* ── Section 8: penutup (satu-satunya blok berwarna penuh) ── */
export function ClosingSection() {
    return (
        <section className="px-5 py-20 sm:px-8 md:py-24">
            <Reveal className="mx-auto max-w-6xl">
                <GlowCard glow="rgb(255 255 255 / 0.16)" className="rounded-2xl bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12 md:py-20">
                    <h2 className="text-[clamp(2rem,4.2vw,3.2rem)] font-extrabold leading-[1.05] tracking-[-0.04em]">Buat portfolio-mu hari ini.</h2>
                    <CtaLink className={cn(pill, "mt-8 bg-white text-primary hover:bg-white/90")} />
                </GlowCard>
            </Reveal>
        </section>
    );
}
