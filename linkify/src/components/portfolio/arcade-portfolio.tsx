"use client";

import { AnimatePresence, motion, useReducedMotion, type MotionValue, type Variants } from "framer-motion";
import { ArrowUpRight, Award, BadgeCheck, Github, Globe, Linkedin, Mail, MessageCircle, Star, Trophy, type LucideIcon } from "lucide-react";
import { Yellowtail } from "next/font/google";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ProjectCover } from "./arcade-cover";
import {
    ARCADE_EASE,
    CountUp,
    CrtBoot,
    DrawWave,
    GlitchName,
    GrowLine,
    HOLO,
    ParallaxLayer,
    PopText,
    Shimmer,
    StaggerGroup,
    TiltCard,
    Unlock,
    VelocitySkew,
    XpBar,
    popItem,
    riseItem,
    slideItem,
    useHeroDepth,
    usePointerParallax,
} from "./arcade-motion";
import { contactHref, filterProjects, getArcadeCopy, getTechFilters, pickSkills, splitHeadline, type ArcadeCopy } from "./arcade-portfolio-config";
import type { PortfolioProject, PublicPortfolio, PublicPortfolioContent } from "./types";

// Font script khusus tema Arcade; next/font men-self-host saat build, jadi hanya ikut di chunk tema ini.
const yellowtail = Yellowtail({ weight: "400", subsets: ["latin"], display: "swap" });

type ArcadePortfolioProps = {
    portfolio: PublicPortfolio;
    apiBase: string;
    contacts: Array<[string, string]>;
};

type SectionKey = keyof PublicPortfolioContent["sections"];
type Reduce = { reduceMotion: boolean | null };

const DOTS = { backgroundImage: "radial-gradient(#2A2F55 1.2px, transparent 1.4px)", backgroundSize: "24px 24px" };
const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D17]";
const HOVER_SPRING = { type: "spring", stiffness: 420, damping: 18 } as const;

const CONTACT_ICONS: Record<string, LucideIcon> = {
    github: Github,
    linkedin: Linkedin,
    email: Mail,
    whatsapp: MessageCircle,
    website: Globe,
};

const photoVariants: Variants = {
    hidden: { opacity: 0, scale: 0.6, rotate: -18 },
    show: { opacity: 1, scale: 1, rotate: -4, transition: { type: "spring", stiffness: 260, damping: 14 } },
};
const headlineVariants: Variants = {
    hidden: { opacity: 0, y: 14, rotate: -3 },
    show: { opacity: 1, y: 0, rotate: 0, transition: { duration: 0.6, ease: ARCADE_EASE } },
};
const cardVariants: Variants = {
    hidden: { opacity: 0, y: 28, scale: 0.96 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: ARCADE_EASE } },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.22 } },
};

/**
 * useReducedMotion bernilai null di server tapi bisa langsung true di client, sehingga render pertama berbeda
 * (hydration mismatch). Preferensi baru dipakai setelah mount agar markup awal identik dengan server.
 */
function useHydratedReducedMotion() {
    const prefersReduced = useReducedMotion();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    return mounted ? prefersReduced : null;
}

function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "GH";
}

function Boot({ reduceMotion, className = "", children }: Reduce & { className?: string; children: ReactNode }) {
    if (reduceMotion) return <div className={className}>{children}</div>;
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7, ease: ARCADE_EASE }}
        >
            {children}
        </motion.div>
    );
}

/** Tiga kotak title bar. Di hero ikut urutan CrtBoot (variants), di window lain statis. */
function TitleSquares({ tone, sequenced = false }: { tone: "dark" | "light"; sequenced?: boolean }) {
    const border = tone === "dark" ? "border-[#0B0D17]" : "border-[#9AA0C3]";
    return (
        <span className="flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((item) =>
                sequenced ? <motion.span key={item} className={`size-2.5 border-2 ${border}`} variants={popItem} /> : <span key={item} className={`size-2.5 border-2 ${border}`} />,
            )}
        </span>
    );
}

function Window({ tone, title, className = "", bodyClassName = "", sequenced, children }: { tone: "holo" | "violet" | "plain"; title?: string; className?: string; bodyClassName?: string; sequenced?: boolean; children: ReactNode }) {
    if (tone === "holo") {
        return (
            <div className={`relative p-[3px] ${className}`} style={{ backgroundImage: HOLO }}>
                <div className="flex h-7 items-center justify-between px-2"><TitleSquares tone="dark" sequenced={sequenced} />{title && <span className="truncate pl-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0B0D17]">{title}</span>}</div>
                <div className={`bg-[#0B0D17] ${bodyClassName}`}>{children}</div>
            </div>
        );
    }
    const violet = tone === "violet";
    return (
        <div className={`border-[3px] ${violet ? "border-[#5B3FD9]" : "border-[#2A2F55]"} ${className}`}>
            <div className={`flex h-7 items-center justify-between px-2 ${violet ? "bg-[#5B3FD9]" : "bg-[#141833]"}`}>
                <TitleSquares tone={violet ? "dark" : "light"} />
                {title && <span className={`truncate pl-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] ${violet ? "text-[#F5F3EE]" : "text-[#9AA0C3]"}`}>{title}</span>}
            </div>
            <div className={`bg-[#0B0D17] ${bodyClassName}`}>{children}</div>
        </div>
    );
}

function SectionHeading({ text, reduceMotion }: Reduce & { text: string }) {
    return (
        <VelocitySkew reduceMotion={reduceMotion}>
            <h2 className="text-4xl font-extrabold tracking-[-0.03em] text-[#5EEAD4] sm:text-5xl"><PopText text={text} reduceMotion={reduceMotion} /></h2>
        </VelocitySkew>
    );
}

/** Ikon kontak sebagai anak variants: di hero ikut urutan CrtBoot, di footer dibungkus StaggerGroup. */
function ContactIcons({ contacts, size = "md", reduceMotion = null }: { contacts: Array<[string, string]>; size?: "md" | "lg"; reduceMotion?: boolean | null }) {
    const links = contacts.map(([kind, value]) => [kind, contactHref(kind, value)] as const).filter((entry): entry is readonly [string, string] => Boolean(entry[1]));
    if (!links.length) return null;
    return (
        <>
            {links.map(([kind, href]) => {
                const Icon = CONTACT_ICONS[kind] ?? Globe;
                return (
                    <motion.a
                        key={kind}
                        href={href}
                        target={kind === "email" ? undefined : "_blank"}
                        rel="noreferrer"
                        aria-label={kind}
                        variants={reduceMotion ? undefined : riseItem}
                        whileHover={reduceMotion ? undefined : { y: -4, transition: HOVER_SPRING }}
                        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                        whileFocus={reduceMotion ? undefined : { y: -4, transition: HOVER_SPRING }}
                        className={`inline-flex items-center gap-2 border-2 border-[#2A2F55] bg-[#0B0D17] text-[#F5F3EE] transition-colors duration-200 hover:border-[#5EEAD4] hover:text-[#5EEAD4] hover:shadow-[3px_3px_0_#5B3FD9] motion-reduce:transition-none ${size === "lg" ? "min-h-12 px-4 text-sm font-semibold capitalize" : "size-11 justify-center"} ${FOCUS}`}
                    >
                        <Icon className="size-4" aria-hidden="true" />
                        {size === "lg" && <span>{kind}</span>}
                    </motion.a>
                );
            })}
        </>
    );
}

function HalftonePhoto({ portfolio, apiBase, reduceMotion, className = "" }: Pick<ArcadePortfolioProps, "portfolio" | "apiBase"> & Reduce & { className?: string }) {
    const name = portfolio.content.name || "Portfolio";
    // Luar: meletup masuk mengikuti urutan CrtBoot. Dalam: melayang terus (animasi sendiri, tidak ikut variants).
    return (
        <motion.div className={`shrink-0 ${className}`} variants={reduceMotion ? undefined : photoVariants} style={{ rotate: -4 }}>
            <motion.div
                className="relative size-full overflow-hidden border-[3px] border-[#5B3FD9] bg-[#141833] shadow-[6px_6px_0_#5B3FD9]"
                animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
                transition={reduceMotion ? undefined : { duration: 5, delay: 2, repeat: Infinity, ease: "easeInOut" }}
            >
                {portfolio.has_photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`${apiBase}/portfolios/${portfolio.public_id}/photo`} alt={`Foto ${name}`} className="size-full object-cover grayscale contrast-125" />
                ) : (
                    <span className="flex size-full items-center justify-center text-4xl font-extrabold text-[#F5F3EE]">{initials(name)}</span>
                )}
                <span className="pointer-events-none absolute inset-0 mix-blend-color" style={{ backgroundImage: HOLO }} aria-hidden="true" />
                <span className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(rgba(11,13,23,0.75) 0.9px, transparent 1.2px)", backgroundSize: "4px 4px" }} aria-hidden="true" />
            </motion.div>
        </motion.div>
    );
}

function Ornaments({ sx, sy }: { sx: MotionValue<number>; sy: MotionValue<number> }) {
    return (
        <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden="true">
            <ParallaxLayer sx={sx} sy={sy} depth={-40} className="absolute left-[6%] top-[22%]">
                <span className="block size-24 rounded-full border-[3px] border-[#F0ABFC]/50" />
                <span className="absolute left-4 top-4 block size-16 rounded-full border-2 border-dashed border-[#5EEAD4]/40" />
            </ParallaxLayer>
            <ParallaxLayer sx={sx} sy={sy} depth={55} className="absolute bottom-[20%] right-[7%]">
                <span className="block size-0 border-x-[34px] border-b-[58px] border-x-transparent border-b-[#5B3FD9]/50" />
            </ParallaxLayer>
            <ParallaxLayer sx={sx} sy={sy} depth={25} className="absolute right-[12%] top-[18%]">
                <span className="block size-28" style={{ backgroundImage: "radial-gradient(#A78BFA 1.6px, transparent 1.8px)", backgroundSize: "12px 12px" }} />
            </ParallaxLayer>
            <ParallaxLayer sx={sx} sy={sy} depth={-28} className="absolute bottom-[26%] left-[14%]">
                <span className="block size-20" style={{ backgroundImage: "radial-gradient(#5EEAD4 1.4px, transparent 1.6px)", backgroundSize: "10px 10px" }} />
            </ParallaxLayer>
            <ParallaxLayer sx={sx} sy={sy} depth={70} className="absolute right-[24%] top-[70%]">
                <span className="block size-3 rotate-45 bg-[#FDE68A]/70" />
            </ParallaxLayer>
            <ParallaxLayer sx={sx} sy={sy} depth={-60} className="absolute left-[24%] top-[12%]">
                <span className="block size-2.5 bg-[#5EEAD4]/70" />
            </ParallaxLayer>
        </div>
    );
}

function Hero({ portfolio, apiBase, contacts, copy, reduceMotion }: ArcadePortfolioProps & Reduce & { copy: ArcadeCopy }) {
    const content = portfolio.content;
    const name = content.name || "Portfolio";
    const segments = splitHeadline(content.headline ?? "");
    const heroRef = useRef<HTMLElement>(null);
    const depth = useHeroDepth(heroRef, reduceMotion);
    const { sx, sy, onPointerMove } = usePointerParallax(reduceMotion);
    return (
        <section ref={heroRef} id="top" onPointerMove={onPointerMove} className="relative flex min-h-[100svh] flex-col overflow-hidden px-5 pb-10 pt-6 sm:px-8" style={DOTS}>
            <Ornaments sx={sx} sy={sy} />
            <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between">
                <a href="#top" className={`bg-clip-text text-2xl font-extrabold tracking-[-0.04em] text-transparent ${FOCUS}`} style={{ backgroundImage: HOLO }}>{initials(name)}</a>
                {portfolio.github_verified && <span className="inline-flex items-center gap-1.5 border-2 border-[#5EEAD4]/60 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#5EEAD4]"><BadgeCheck className="size-3.5" aria-hidden="true" />{copy.githubVerified}</span>}
            </header>

            <motion.div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center py-10" style={depth}>
                <div className="relative">
                    {/* Urutan muncul: layar menyala, lalu (stagger) kotak title bar, foto, sapuan nama, headline, kontak. */}
                    <CrtBoot reduceMotion={reduceMotion}>
                        <Window tone="holo" sequenced bodyClassName="relative overflow-hidden px-5 py-10 sm:px-12 sm:py-14">
                            <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:gap-10 md:text-left">
                                <HalftonePhoto portfolio={portfolio} apiBase={apiBase} reduceMotion={reduceMotion} className="size-28 sm:size-36 md:size-44" />
                                <div className="min-w-0 flex-1">
                                    <GlitchName
                                        text={name}
                                        reduceMotion={reduceMotion}
                                        className="bg-clip-text text-[clamp(2.4rem,7.5vw,5.5rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.04em] text-transparent [overflow-wrap:anywhere]"
                                        style={{ backgroundImage: HOLO, filter: "drop-shadow(4px 4px 0 #5B3FD9)" }}
                                    />
                                    {segments.length > 0 && (
                                        <p className={`${yellowtail.className} mt-5 text-[clamp(1.6rem,3.6vw,2.6rem)] leading-tight text-[#FDE68A]`}>
                                            {segments.map((segment, index) => (
                                                <motion.span key={`${segment}-${index}`} className="inline-block" variants={reduceMotion ? undefined : headlineVariants}>
                                                    {index > 0 && <span className="mx-2 align-middle font-sans text-[0.55em] text-[#F0ABFC]" aria-hidden="true">×</span>}
                                                    {segment}
                                                </motion.span>
                                            ))}
                                        </p>
                                    )}
                                    <div className="mt-7 flex flex-wrap justify-center gap-2 md:justify-start"><ContactIcons contacts={contacts} reduceMotion={reduceMotion} /></div>
                                </div>
                            </div>
                            <Shimmer reduceMotion={reduceMotion} delay={2.4} />
                        </Window>
                    </CrtBoot>
                    <motion.span
                        className="absolute -bottom-3 -right-3 -z-10 hidden size-full border-2 border-[#5B3FD9]/70 sm:block"
                        initial={reduceMotion ? false : { opacity: 0, x: -12, y: -12 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 0.6, delay: 1.1, ease: ARCADE_EASE }}
                        aria-hidden="true"
                    />
                </div>
            </motion.div>

            <a href="#arcade-content" aria-label={copy.scroll} className={`relative z-10 mx-auto flex flex-col items-center ${FOCUS}`}>
                <motion.span
                    className="flex flex-col items-center"
                    animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
                    transition={reduceMotion ? undefined : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                >
                    <span className="h-14 border-l-2 border-dashed border-[#A78BFA]" />
                    <span className="size-0 border-x-[9px] border-t-[12px] border-x-transparent border-t-[#A78BFA]" />
                </motion.span>
            </a>
        </section>
    );
}

function ProjectCard({ project, index, copy, reduceMotion }: Reduce & { project: PortfolioProject; index: number; copy: ArcadeCopy }) {
    const tech = (project.tech_stack ?? []).slice(0, 5);
    return (
        <TiltCard reduceMotion={reduceMotion}>
            <a href={project.url} target="_blank" rel="noreferrer" aria-label={`${copy.openRepo}: ${project.repo_name}`} className={`group block ${FOCUS}`}>
                <Window tone="violet" title={`level ${String(index + 1).padStart(2, "0")}`} bodyClassName="flex flex-col">
                    <ProjectCover project={project} reduceMotion={reduceMotion} />
                    <div className="flex-1 p-5">
                        {project.description && <p className="line-clamp-3 text-[15px] leading-7 text-[#F5F3EE]/85">{project.description}</p>}
                        {tech.length > 0 && <div className={`flex flex-wrap gap-1.5 ${project.description ? "mt-4" : ""}`}>{tech.map((item) => <span key={item} className="border border-[#2A2F55] px-2 py-0.5 font-mono text-[11px] text-[#5EEAD4]">{item}</span>)}</div>}
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t-[3px] border-[#5B3FD9] bg-[#5B3FD9]/15 px-5 py-2 font-mono text-xs text-[#9AA0C3]">
                        <span className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1"><Star className="size-3.5 text-[#FDE68A]" aria-hidden="true" /><CountUp value={project.stars} reduceMotion={reduceMotion} /> {copy.stars}</span>
                            <span><CountUp value={project.own_commits} reduceMotion={reduceMotion} /> {copy.commits}</span>
                        </span>
                        <ArrowUpRight className="size-4 text-[#F5F3EE] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
                    </div>
                </Window>
                <div className="relative mt-6 pl-5">
                    <span className="absolute -top-3 left-0 h-14 w-12 border-l-[3px] border-t-[3px] border-[#5B3FD9] transition-transform duration-300 group-hover:-translate-x-1 group-hover:-translate-y-1 motion-reduce:transition-none" aria-hidden="true" />
                    <h3 className="relative text-2xl font-extrabold leading-tight tracking-[-0.02em] text-[#F5F3EE] [overflow-wrap:anywhere] sm:text-3xl">{project.repo_name}</h3>
                </div>
            </a>
        </TiltCard>
    );
}

/**
 * Grid proyek dengan filter tech ala menu game: kartu menyusun ulang (layout), yang keluar dianimasikan
 * (AnimatePresence popLayout), dan penanda tab aktif berpindah antar tombol (layoutId).
 */
function ProjectGrid({ projects, copy, reduceMotion }: Reduce & { projects: PortfolioProject[]; copy: ArcadeCopy }) {
    const filters = getTechFilters(projects);
    const [active, setActive] = useState<string | null>(null);
    const visible = filterProjects(projects, active);

    return (
        <>
            {filters.length > 0 && (
                <div role="group" aria-label={copy.filterTech} className="-mx-5 mb-10 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                    {[null, ...filters].map((tech) => {
                        const selected = active === tech;
                        return (
                            <motion.button
                                key={tech ?? "all"}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setActive(tech)}
                                whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                                whileHover={reduceMotion ? undefined : { y: -2, transition: HOVER_SPRING }}
                                className={`relative shrink-0 border-2 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] transition-colors duration-200 motion-reduce:transition-none ${selected ? "border-[#5B3FD9] text-[#F5F3EE]" : "border-[#2A2F55] text-[#9AA0C3] hover:border-[#5EEAD4]/60 hover:text-[#F5F3EE]"} ${FOCUS}`}
                            >
                                {selected && (
                                    <motion.span
                                        layoutId="arcade-filter-active"
                                        className="absolute inset-0 bg-[#5B3FD9]"
                                        transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 34 }}
                                        aria-hidden="true"
                                    />
                                )}
                                <span className="relative">{tech ?? copy.allProjects}</span>
                            </motion.button>
                        );
                    })}
                </div>
            )}
            <motion.div layout={!reduceMotion} className="grid gap-x-10 gap-y-14 md:grid-cols-2">
                <AnimatePresence mode="popLayout">
                    {visible.map((project) => {
                        const index = projects.indexOf(project);
                        return (
                            <motion.div
                                key={`${project.repo_name}-${index}`}
                                layout={!reduceMotion}
                                variants={reduceMotion ? undefined : cardVariants}
                                initial={reduceMotion ? false : "hidden"}
                                whileInView="show"
                                exit="exit"
                                viewport={{ once: true, amount: 0.15 }}
                            >
                                <ProjectCard project={project} index={index} copy={copy} reduceMotion={reduceMotion} />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </motion.div>
        </>
    );
}

function Timeline({ items, reduceMotion }: Reduce & { items: Array<{ key: string; title?: string; subtitle: string; period?: string; extra?: string[] }> }) {
    return (
        <StaggerGroup as="ol" reduceMotion={reduceMotion} stagger={0.1} delay={0.15} amount={0.1} className="relative ml-1.5 space-y-8">
            <GrowLine reduceMotion={reduceMotion} className="absolute bottom-0 left-0 top-0 w-0.5 bg-[#5B3FD9]" />
            {items.map((item) => (
                <motion.li key={item.key} className="relative pl-6" variants={reduceMotion ? undefined : slideItem}>
                    <motion.span className="absolute -left-[5px] top-2 size-3 bg-[#5EEAD4]" variants={reduceMotion ? undefined : popItem} aria-hidden="true" />
                    {item.period && <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#F0ABFC]">{item.period}</p>}
                    {item.title && <h3 className="mt-1 text-lg font-bold text-[#F5F3EE] [overflow-wrap:anywhere]">{item.title}</h3>}
                    {item.subtitle && <p className="mt-0.5 text-sm text-[#9AA0C3]">{item.subtitle}</p>}
                    {item.extra && item.extra.length > 0 && (
                        <ul className="mt-3 space-y-1.5 text-[15px] leading-7 text-[#F5F3EE]/85">
                            {item.extra.map((line, lineIndex) => <li key={`${item.key}-${lineIndex}`} className="flex gap-2"><span className="text-[#A78BFA]" aria-hidden="true">▸</span><span>{line}</span></li>)}
                        </ul>
                    )}
                </motion.li>
            ))}
        </StaggerGroup>
    );
}

function Section({ id, title, reduceMotion, children }: Reduce & { id: string; title: string; children: ReactNode }) {
    return (
        <section id={id} className="mx-auto max-w-6xl scroll-mt-6 px-5 py-16 sm:px-8 sm:py-20">
            <SectionHeading text={title} reduceMotion={reduceMotion} />
            <div className="mt-10">{children}</div>
        </section>
    );
}

export function ArcadePortfolio({ portfolio, apiBase, contacts }: ArcadePortfolioProps) {
    const reduceMotion = useHydratedReducedMotion();
    const content = portfolio.content;
    const copy = getArcadeCopy(content.language);
    const sectionOn = (key: SectionKey) => content.sections?.[key] !== false;

    const projects = (content.projects ?? []).slice(0, 6);
    const skills = pickSkills(content.skills ?? [], portfolio.verified_skills ?? []);
    const experience = content.experience ?? [];
    const education = content.education ?? [];
    const certifications = (content.certifications ?? []).filter(Boolean);
    const bio = (content.bio ?? "").trim();

    return (
        <main lang={content.language} className="min-h-screen overflow-x-hidden bg-[#0B0D17] text-[#F5F3EE] selection:bg-[#5B3FD9] selection:text-[#F5F3EE]">
            <XpBar reduceMotion={reduceMotion} />
            <Hero portfolio={portfolio} apiBase={apiBase} contacts={contacts} copy={copy} reduceMotion={reduceMotion} />
            <div id="arcade-content"><DrawWave reduceMotion={reduceMotion} /></div>

            {bio && (
                <section id="about" className="mx-auto max-w-4xl scroll-mt-6 px-5 py-16 sm:px-8 sm:py-20">
                    <Boot reduceMotion={reduceMotion}>
                        <Window tone="plain" title="about.txt" bodyClassName="p-6 sm:p-10">
                            <p className="whitespace-pre-line text-[17px] leading-8 text-[#F5F3EE]/90">{bio}</p>
                        </Window>
                    </Boot>
                </section>
            )}

            {sectionOn("projects") && projects.length > 0 && (
                <Section id="projects" title={copy.projects} reduceMotion={reduceMotion}>
                    <ProjectGrid projects={projects} copy={copy} reduceMotion={reduceMotion} />
                </Section>
            )}

            {sectionOn("skills") && (skills.verified.length > 0 || skills.others.length > 0) && (
                <Section id="skills" title={copy.skills} reduceMotion={reduceMotion}>
                    {skills.verified.length > 0 && (
                        <div>
                            <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-[#5EEAD4]"><BadgeCheck className="size-4" aria-hidden="true" />{copy.verified}</p>
                            <StaggerGroup reduceMotion={reduceMotion} stagger={0.09} delay={0.1} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {skills.verified.map((item) => (
                                    <Unlock key={item.skill} reduceMotion={reduceMotion} className="border-2 border-[#2A2F55] bg-[#11142A] p-4 transition-colors duration-200 hover:border-[#5EEAD4]/60 motion-reduce:transition-none">
                                        <div className="flex items-center justify-between gap-2">
                                            <Trophy className="size-4 text-[#FDE68A]" aria-hidden="true" />
                                            {item.level && <span className="truncate font-mono text-[11px] uppercase tracking-[0.12em] text-[#F0ABFC]">{item.level}</span>}
                                        </div>
                                        <p className="mt-3 text-lg font-bold text-[#F5F3EE] [overflow-wrap:anywhere]">{item.skill}</p>
                                        {item.evidence && <p className="mt-1 font-mono text-xs text-[#9AA0C3]"><CountUp value={item.evidence.own_commits} reduceMotion={reduceMotion} /> {copy.commits} · <CountUp value={item.evidence.repos} reduceMotion={reduceMotion} /> {copy.repos}</p>}
                                    </Unlock>
                                ))}
                            </StaggerGroup>
                        </div>
                    )}
                    {skills.others.length > 0 && (
                        <div className={skills.verified.length > 0 ? "mt-10" : ""}>
                            {skills.verified.length > 0 && <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#9AA0C3]">{copy.otherSkills}</p>}
                            <StaggerGroup reduceMotion={reduceMotion} stagger={0.03} className="mt-4 flex flex-wrap gap-2">
                                {skills.others.map((skill) => (
                                    <motion.span
                                        key={skill}
                                        className="border-2 border-[#2A2F55] px-3 py-1.5 text-sm font-semibold text-[#F5F3EE]"
                                        variants={reduceMotion ? undefined : popItem}
                                        whileHover={reduceMotion ? undefined : { y: -3, rotate: -2, transition: HOVER_SPRING }}
                                    >
                                        {skill}
                                    </motion.span>
                                ))}
                            </StaggerGroup>
                        </div>
                    )}
                </Section>
            )}

            {sectionOn("experience") && experience.length > 0 && (
                <Section id="experience" title={copy.experience} reduceMotion={reduceMotion}>
                    <Boot reduceMotion={reduceMotion}>
                        <Window tone="plain" title="experience.log" bodyClassName="p-6 sm:p-10">
                            <Timeline reduceMotion={reduceMotion} items={experience.map((item, index) => ({
                                key: `${item.company}-${item.role}-${index}`,
                                title: item.role || item.company,
                                subtitle: [item.role ? item.company : undefined, item.location].filter(Boolean).join(" · "),
                                period: item.period,
                                extra: (item.bullets ?? []).filter(Boolean),
                            }))} />
                        </Window>
                    </Boot>
                </Section>
            )}

            {sectionOn("education") && education.length > 0 && (
                <Section id="education" title={copy.education} reduceMotion={reduceMotion}>
                    <Boot reduceMotion={reduceMotion}>
                        <Window tone="plain" title="education.log" bodyClassName="p-6 sm:p-10">
                            <Timeline reduceMotion={reduceMotion} items={education.map((item, index) => ({
                                key: `${item.institution}-${index}`,
                                title: item.institution,
                                subtitle: [item.degree, item.major, item.gpa ? `GPA ${item.gpa}` : undefined].filter(Boolean).join(" · "),
                                period: item.period,
                            }))} />
                        </Window>
                    </Boot>
                </Section>
            )}

            {sectionOn("certifications") && certifications.length > 0 && (
                <Section id="certifications" title={copy.certifications} reduceMotion={reduceMotion}>
                    <Boot reduceMotion={reduceMotion}>
                        <Window tone="plain" title="certs.txt" bodyClassName="p-6 sm:p-8">
                            <StaggerGroup as="ul" reduceMotion={reduceMotion} stagger={0.05} className="grid gap-4 sm:grid-cols-2">
                                {certifications.map((item, index) => (
                                    <motion.li key={`${item}-${index}`} className="flex gap-3 text-[15px] leading-7 text-[#F5F3EE]/90" variants={reduceMotion ? undefined : riseItem}>
                                        <Award className="mt-1 size-4 shrink-0 text-[#FDE68A]" aria-hidden="true" />
                                        <span className="[overflow-wrap:anywhere]">{item}</span>
                                    </motion.li>
                                ))}
                            </StaggerGroup>
                        </Window>
                    </Boot>
                </Section>
            )}

            <DrawWave reduceMotion={reduceMotion} />
            <footer className="mx-auto max-w-6xl px-5 pb-10 pt-16 sm:px-8">
                {contacts.length > 0 && (
                    <div className="mb-14">
                        <SectionHeading text={copy.contact} reduceMotion={reduceMotion} />
                        <StaggerGroup reduceMotion={reduceMotion} stagger={0.08} className="mt-6 flex flex-wrap gap-2">
                            <ContactIcons contacts={contacts} size="lg" reduceMotion={reduceMotion} />
                        </StaggerGroup>
                    </div>
                )}
                <div className="flex flex-col gap-2 border-t-2 border-[#2A2F55] pt-6 font-mono text-xs text-[#9AA0C3] sm:flex-row sm:items-center sm:justify-between">
                    <span>© {new Date().getFullYear()} {content.name || "Portfolio"}</span>
                    <span>{copy.madeWith} <strong className="font-semibold text-[#A78BFA]">GitHire</strong></span>
                </div>
            </footer>
        </main>
    );
}
