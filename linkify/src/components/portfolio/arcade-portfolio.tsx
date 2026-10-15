"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Award, BadgeCheck, Github, Globe, Linkedin, Mail, MessageCircle, Star, Trophy, type LucideIcon } from "lucide-react";
import { Yellowtail } from "next/font/google";
import type { MotionValue } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { ProjectCover } from "./arcade-cover";
import { ARCADE_EASE, CountUp, CrtBoot, DrawWave, GlitchName, GrowLine, HOLO, ParallaxLayer, PopText, Shimmer, TiltCard, Unlock, XpBar, usePointerParallax } from "./arcade-motion";
import { contactHref, getArcadeCopy, pickSkills, splitHeadline, type ArcadeCopy } from "./arcade-portfolio-config";
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

const CONTACT_ICONS: Record<string, LucideIcon> = {
    github: Github,
    linkedin: Linkedin,
    email: Mail,
    whatsapp: MessageCircle,
    website: Globe,
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

function Boot({ reduceMotion, className = "", delay = 0, children }: Reduce & { className?: string; delay?: number; children: ReactNode }) {
    if (reduceMotion) return <div className={className}>{children}</div>;
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.7, delay, ease: ARCADE_EASE }}
        >
            {children}
        </motion.div>
    );
}

function TitleSquares({ tone, popDelay, reduceMotion = null }: { tone: "dark" | "light"; popDelay?: number; reduceMotion?: boolean | null }) {
    const border = tone === "dark" ? "border-[#0B0D17]" : "border-[#9AA0C3]";
    return (
        <span className="flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((item) => (
                <motion.span
                    key={item}
                    className={`size-2.5 border-2 ${border}`}
                    initial={popDelay === undefined || reduceMotion ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 600, damping: 14, delay: (popDelay ?? 0) + item * 0.1 }}
                />
            ))}
        </span>
    );
}

function Window({ tone, title, className = "", bodyClassName = "", popDelay, reduceMotion, children }: { tone: "holo" | "violet" | "plain"; title?: string; className?: string; bodyClassName?: string; popDelay?: number; reduceMotion?: boolean | null; children: ReactNode }) {
    if (tone === "holo") {
        return (
            <div className={`relative p-[3px] ${className}`} style={{ backgroundImage: HOLO }}>
                <div className="flex h-7 items-center justify-between px-2"><TitleSquares tone="dark" popDelay={popDelay} reduceMotion={reduceMotion} />{title && <span className="truncate pl-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0B0D17]">{title}</span>}</div>
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
    return <h2 className="text-4xl font-extrabold tracking-[-0.03em] text-[#5EEAD4] sm:text-5xl"><PopText text={text} reduceMotion={reduceMotion} /></h2>;
}

function ContactIcons({ contacts, size = "md", reduceMotion = null, delay = 0, onMount = false }: { contacts: Array<[string, string]>; size?: "md" | "lg"; reduceMotion?: boolean | null; delay?: number; onMount?: boolean }) {
    const links = contacts.map(([kind, value]) => [kind, contactHref(kind, value)] as const).filter((entry): entry is readonly [string, string] => Boolean(entry[1]));
    if (!links.length) return null;
    return (
        <div className="flex flex-wrap gap-2">
            {links.map(([kind, href], index) => {
                const Icon = CONTACT_ICONS[kind] ?? Globe;
                return (
                    <motion.a
                        key={kind}
                        href={href}
                        target={kind === "email" ? undefined : "_blank"}
                        rel="noreferrer"
                        aria-label={kind}
                        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                        {...(onMount ? { animate: { opacity: 1, y: 0 } } : { whileInView: { opacity: 1, y: 0 }, viewport: { once: true } })}
                        transition={{ duration: 0.45, delay: delay + index * 0.08, ease: ARCADE_EASE }}
                        whileHover={reduceMotion ? undefined : { y: -3 }}
                        className={`inline-flex items-center gap-2 border-2 border-[#2A2F55] bg-[#0B0D17] text-[#F5F3EE] transition-colors duration-200 hover:border-[#5EEAD4] hover:text-[#5EEAD4] hover:shadow-[3px_3px_0_#5B3FD9] motion-reduce:transition-none ${size === "lg" ? "min-h-12 px-4 text-sm font-semibold capitalize" : "size-11 justify-center"} ${FOCUS}`}
                    >
                        <Icon className="size-4" aria-hidden="true" />
                        {size === "lg" && <span>{kind}</span>}
                    </motion.a>
                );
            })}
        </div>
    );
}

function HalftonePhoto({ portfolio, apiBase, reduceMotion, className = "" }: Pick<ArcadePortfolioProps, "portfolio" | "apiBase"> & Reduce & { className?: string }) {
    const name = portfolio.content.name || "Portfolio";
    return (
        <motion.div
            className={`relative overflow-hidden border-[3px] border-[#5B3FD9] bg-[#141833] shadow-[6px_6px_0_#5B3FD9] ${className}`}
            initial={reduceMotion ? false : { opacity: 0, scale: 0.6, rotate: -18 }}
            animate={reduceMotion ? undefined : { opacity: 1, scale: 1, rotate: -4, y: [0, -6, 0] }}
            transition={reduceMotion ? undefined : { opacity: { delay: 1.1, duration: 0.4 }, scale: { delay: 1.1, type: "spring", stiffness: 260, damping: 14 }, rotate: { delay: 1.1, type: "spring", stiffness: 260, damping: 14 }, y: { delay: 2, duration: 5, repeat: Infinity, ease: "easeInOut" } }}
            style={reduceMotion ? { rotate: -4 } : undefined}
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
    const { sx, sy, onPointerMove } = usePointerParallax(reduceMotion);
    return (
        <section id="top" onPointerMove={onPointerMove} className="relative flex min-h-[100svh] flex-col overflow-hidden px-5 pb-10 pt-6 sm:px-8" style={DOTS}>
            <Ornaments sx={sx} sy={sy} />
            <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between">
                <a href="#top" className={`bg-clip-text text-2xl font-extrabold tracking-[-0.04em] text-transparent ${FOCUS}`} style={{ backgroundImage: HOLO }}>{initials(name)}</a>
                {portfolio.github_verified && <span className="inline-flex items-center gap-1.5 border-2 border-[#5EEAD4]/60 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#5EEAD4]"><BadgeCheck className="size-3.5" aria-hidden="true" />{copy.githubVerified}</span>}
            </header>

            <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center py-10">
                <div className="relative">
                    <CrtBoot reduceMotion={reduceMotion}>
                        <Window tone="holo" popDelay={0.9} reduceMotion={reduceMotion} bodyClassName="relative overflow-hidden px-5 py-10 sm:px-12 sm:py-14">
                            <div className="relative flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:gap-10 md:text-left">
                                <HalftonePhoto portfolio={portfolio} apiBase={apiBase} reduceMotion={reduceMotion} className="size-28 shrink-0 sm:size-36 md:size-44" />
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
                                                <motion.span
                                                    key={`${segment}-${index}`}
                                                    className="inline-block"
                                                    initial={reduceMotion ? false : { opacity: 0, y: 14, rotate: -3 }}
                                                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                                                    transition={{ duration: 0.6, delay: 1.55 + index * 0.18, ease: ARCADE_EASE }}
                                                >
                                                    {index > 0 && <span className="mx-2 align-middle font-sans text-[0.55em] text-[#F0ABFC]" aria-hidden="true">×</span>}
                                                    {segment}
                                                </motion.span>
                                            ))}
                                        </p>
                                    )}
                                    <div className="mt-7 flex justify-center md:justify-start"><ContactIcons contacts={contacts} reduceMotion={reduceMotion} delay={1.9} onMount /></div>
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
            </div>

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

function Timeline({ items, reduceMotion }: Reduce & { items: Array<{ key: string; title?: string; subtitle: string; period?: string; extra?: string[] }> }) {
    return (
        <ol className="relative ml-1.5 space-y-8">
            <GrowLine reduceMotion={reduceMotion} className="absolute bottom-0 left-0 top-0 w-0.5 bg-[#5B3FD9]" />
            {items.map((item, index) => (
                <li key={item.key} className="relative pl-6">
                    <motion.span
                        className="absolute -left-[5px] top-2 size-3 bg-[#5EEAD4]"
                        initial={reduceMotion ? false : { scale: 0, rotate: 45 }}
                        whileInView={{ scale: 1, rotate: 0 }}
                        viewport={{ once: true, amount: 0.8 }}
                        transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.2 + index * 0.08 }}
                        aria-hidden="true"
                    />
                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0, x: 16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.3 }}
                        transition={{ duration: 0.55, delay: 0.25 + index * 0.08, ease: ARCADE_EASE }}
                    >
                        {item.period && <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#F0ABFC]">{item.period}</p>}
                        {item.title && <h3 className="mt-1 text-lg font-bold text-[#F5F3EE] [overflow-wrap:anywhere]">{item.title}</h3>}
                        {item.subtitle && <p className="mt-0.5 text-sm text-[#9AA0C3]">{item.subtitle}</p>}
                        {item.extra && item.extra.length > 0 && (
                            <ul className="mt-3 space-y-1.5 text-[15px] leading-7 text-[#F5F3EE]/85">
                                {item.extra.map((line, lineIndex) => <li key={`${item.key}-${lineIndex}`} className="flex gap-2"><span className="text-[#A78BFA]" aria-hidden="true">▸</span><span>{line}</span></li>)}
                            </ul>
                        )}
                    </motion.div>
                </li>
            ))}
        </ol>
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
                    <div className="grid gap-x-10 gap-y-14 md:grid-cols-2">
                        {projects.map((project, index) => (
                            <Boot key={`${project.repo_name}-${index}`} reduceMotion={reduceMotion} delay={(index % 2) * 0.1}>
                                <ProjectCard project={project} index={index} copy={copy} reduceMotion={reduceMotion} />
                            </Boot>
                        ))}
                    </div>
                </Section>
            )}

            {sectionOn("skills") && (skills.verified.length > 0 || skills.others.length > 0) && (
                <Section id="skills" title={copy.skills} reduceMotion={reduceMotion}>
                    {skills.verified.length > 0 && (
                        <div>
                            <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-[#5EEAD4]"><BadgeCheck className="size-4" aria-hidden="true" />{copy.verified}</p>
                            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {skills.verified.map((item, index) => (
                                    <Unlock key={item.skill} index={index} reduceMotion={reduceMotion} className="border-2 border-[#2A2F55] bg-[#11142A] p-4 transition-colors duration-200 hover:border-[#5EEAD4]/60 motion-reduce:transition-none">
                                        <div className="flex items-center justify-between gap-2">
                                            <Trophy className="size-4 text-[#FDE68A]" aria-hidden="true" />
                                            {item.level && <span className="truncate font-mono text-[11px] uppercase tracking-[0.12em] text-[#F0ABFC]">{item.level}</span>}
                                        </div>
                                        <p className="mt-3 text-lg font-bold text-[#F5F3EE] [overflow-wrap:anywhere]">{item.skill}</p>
                                        {item.evidence && <p className="mt-1 font-mono text-xs text-[#9AA0C3]"><CountUp value={item.evidence.own_commits} reduceMotion={reduceMotion} /> {copy.commits} · <CountUp value={item.evidence.repos} reduceMotion={reduceMotion} /> {copy.repos}</p>}
                                    </Unlock>
                                ))}
                            </div>
                        </div>
                    )}
                    {skills.others.length > 0 && (
                        <div className={skills.verified.length > 0 ? "mt-10" : ""}>
                            {skills.verified.length > 0 && <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#9AA0C3]">{copy.otherSkills}</p>}
                            <div className="mt-4 flex flex-wrap gap-2">
                                {skills.others.map((skill, index) => (
                                    <motion.span
                                        key={skill}
                                        className="border-2 border-[#2A2F55] px-3 py-1.5 text-sm font-semibold text-[#F5F3EE]"
                                        initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ type: "spring", stiffness: 420, damping: 16, delay: index * 0.03 }}
                                    >
                                        {skill}
                                    </motion.span>
                                ))}
                            </div>
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
                            <ul className="grid gap-4 sm:grid-cols-2">
                                {certifications.map((item, index) => <li key={`${item}-${index}`} className="flex gap-3 text-[15px] leading-7 text-[#F5F3EE]/90"><Award className="mt-1 size-4 shrink-0 text-[#FDE68A]" aria-hidden="true" /><span className="[overflow-wrap:anywhere]">{item}</span></li>)}
                            </ul>
                        </Window>
                    </Boot>
                </Section>
            )}

            <DrawWave reduceMotion={reduceMotion} />
            <footer className="mx-auto max-w-6xl px-5 pb-10 pt-16 sm:px-8">
                {contacts.length > 0 && (
                    <div className="mb-14">
                        <SectionHeading text={copy.contact} reduceMotion={reduceMotion} />
                        <div className="mt-6"><ContactIcons contacts={contacts} size="lg" reduceMotion={reduceMotion} /></div>
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
