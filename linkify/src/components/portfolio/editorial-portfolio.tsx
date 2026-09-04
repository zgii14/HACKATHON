"use client";

/* eslint-disable @next/next/no-img-element */

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowDown, ArrowUpRight, Check, Github, Mail } from "lucide-react";
import { useRef } from "react";
import { EDITORIAL_BIO_FONT_SIZE, EDITORIAL_PROJECT_TITLE_WRAP, getEditorialLetterMotion, getEditorialMotionRotation, getEditorialProjectImage, getEditorialProjects, getEditorialStackPosition, splitEditorialBio, splitEditorialWords } from "./editorial-portfolio-config";
import type { PortfolioProject, PublicPortfolio, PublicPortfolioContent } from "./types";

type SectionKey = keyof PublicPortfolioContent["sections"];

type EditorialPortfolioProps = {
    portfolio: PublicPortfolio;
    apiBase: string;
    contacts: Array<[string, string]>;
};

const MOTION = {
    ease: [0.16, 1, 0.3, 1] as const,
    duration: { micro: 0.16, normal: 0.42, macro: 0.7 },
    spring: { type: "spring" as const, stiffness: 290, damping: 24, mass: 0.72 },
};

const PANEL_STYLES = [
    { surface: "#30B4CD", ink: "#111315", note: "#F3D5A1" },
    { surface: "#111315", ink: "#FFFFFF", note: "#A1DFC5" },
    { surface: "#EAB12F", ink: "#111315", note: "#FFFFFF" },
    { surface: "#E01E5A", ink: "#FFFFFF", note: "#F3D5A1" },
    { surface: "#A1DFC5", ink: "#111315", note: "#EAB12F" },
    { surface: "#4F322F", ink: "#FFFFFF", note: "#30B4CD" },
] as const;

function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "GH";
}

function contactHref(key: string, value: string) {
    if (key === "email") return `mailto:${value}`;
    if (key === "whatsapp") return `https://wa.me/${value.replace(/\D/g, "")}`;
    return value;
}

function contactLabel(key: string) {
    if (key === "linkedin") return "LinkedIn";
    if (key === "github") return "GitHub";
    if (key === "whatsapp") return "WhatsApp";
    return key.charAt(0).toUpperCase() + key.slice(1);
}

function SplitTitle({ children, className }: { children: string; className?: string }) {
    const reduceMotion = useReducedMotion();
    const words = splitEditorialWords(children);

    return (
        <motion.h2
            aria-label={children}
            className={className}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.45 }}
        >
            {words.map((word, wordIndex) => {
                const characterOffset = words.slice(0, wordIndex).reduce((total, item) => total + item.length + 1, 0);
                return (
                    <span aria-hidden="true" className="inline-block whitespace-nowrap" key={`${word}-${wordIndex}`}>
                        {Array.from(word).map((character, characterIndex) => (
                            <motion.span
                                className="inline-block"
                                key={`${character}-${characterIndex}`}
                                variants={{
                                    hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, x: 40, scale: 0.9 },
                                    visible: {
                                        opacity: 1,
                                        x: 0,
                                        scale: 1,
                                        transition: {
                                            duration: reduceMotion ? 0.16 : MOTION.duration.macro,
                                            delay: reduceMotion ? 0 : (characterOffset + characterIndex) * 0.032,
                                            ease: MOTION.ease,
                                        },
                                    },
                                }}
                            >
                                {character}
                            </motion.span>
                        ))}
                        {wordIndex < words.length - 1 && <span>&nbsp;</span>}
                    </span>
                );
            })}
        </motion.h2>
    );
}

function SelectionFrame() {
    const reduceMotion = useReducedMotion();
    const handles = ["-left-1.5 -top-1.5", "left-1/2 -top-1.5", "-right-1.5 -top-1.5", "-left-1.5 top-1/2", "-right-1.5 top-1/2", "-bottom-1.5 -left-1.5", "-bottom-1.5 left-1/2", "-bottom-1.5 -right-1.5"];

    return (
        <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-4 -inset-y-3 border border-[#30B4CD] sm:-inset-x-7 sm:-inset-y-5"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduceMotion ? 0.16 : MOTION.duration.normal, delay: reduceMotion ? 0 : 0.42, ease: MOTION.ease }}
        >
            <motion.span
                aria-hidden="true"
                className="absolute inset-0 origin-left bg-[#30B4CD]/10"
                initial={{ opacity: 0, scaleX: reduceMotion ? 1 : 0 }}
                animate={reduceMotion ? { opacity: 0 } : { opacity: [0, 0.75, 0], scaleX: [0, 1, 1] }}
                transition={{ duration: 1.15, delay: 0.72, times: [0, 0.72, 1], ease: MOTION.ease }}
            />
            {handles.map((position, index) => (
                <motion.span
                    className={`absolute size-3 border border-[#30B4CD] bg-white ${position}`}
                    key={position}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={reduceMotion ? { duration: 0.16 } : { ...MOTION.spring, delay: 0.52 + index * 0.025 }}
                />
            ))}
        </motion.div>
    );
}

function EditorialPhoto({ portfolio, apiBase }: Pick<EditorialPortfolioProps, "portfolio" | "apiBase">) {
    const reduceMotion = useReducedMotion();
    const name = portfolio.content.name || "GitHire candidate";
    const source = portfolio.has_photo
        ? `${apiBase}/portfolios/${portfolio.public_id}/photo`
        : "https://picsum.photos/seed/githire-editorial-portrait/720/880";

    return (
        <motion.figure
            className="absolute right-1 top-[68%] z-20 hidden w-40 rotate-[7deg] border border-[#111315] bg-white p-2 shadow-[8px_9px_0_rgba(17,19,21,0.16)] md:block lg:right-6 lg:w-48"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24, rotate: 14 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, rotate: 7 }}
            transition={{ duration: reduceMotion ? 0.16 : MOTION.duration.macro, delay: reduceMotion ? 0 : 0.68, ease: MOTION.ease }}
            whileHover={reduceMotion ? undefined : { y: -6, rotate: 4, transition: MOTION.spring }}
        >
            <div className="relative aspect-[4/5] overflow-hidden bg-[#BBC9C6]">
                <img src={source} alt={portfolio.has_photo ? `Foto ${name}` : ""} className="size-full object-cover grayscale-[0.08]" />
                {!portfolio.has_photo && <span className="absolute bottom-2 left-2 bg-white px-2 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-[#111315]">visual placeholder</span>}
            </div>
            <figcaption className="flex items-center justify-between pt-2 font-mono text-[9px] uppercase tracking-[0.1em]">
                <span>{portfolio.has_photo ? name : initials(name)}</span>
                <span>2026</span>
            </figcaption>
        </motion.figure>
    );
}

function ProjectCard({ project, index, stacked = false }: { project: PortfolioProject; index: number; stacked?: boolean }) {
    const cardRef = useRef<HTMLElement>(null);
    const reduceMotion = useReducedMotion();
    const { scrollYProgress } = useScroll({ target: cardRef, offset: ["start end", "end start"] });
    const posterY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [-14, 14]);
    const style = PANEL_STYLES[index % PANEL_STYLES.length];

    return (
        <motion.article
            ref={cardRef}
            className="group relative overflow-hidden rounded-[26px] border border-[#111315]"
            style={{ backgroundColor: style.surface, color: style.ink }}
            initial={stacked ? false : reduceMotion ? { opacity: 0 } : { opacity: 0, x: index % 2 === 0 ? -28 : 28, y: 18 }}
            whileInView={stacked ? undefined : { opacity: 1, x: 0, y: 0 }}
            whileHover={reduceMotion ? undefined : { y: -5, rotate: index % 2 === 0 ? -0.25 : 0.25 }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: reduceMotion ? 0.16 : MOTION.duration.macro, ease: MOTION.ease }}
        >
            <div className="absolute left-0 top-0 h-9 w-28 rounded-br-[22px] border-b border-r border-[#111315] bg-white sm:w-40" aria-hidden="true" />
            <div className="grid min-h-[560px] gap-10 px-5 pb-6 pt-16 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:px-12 lg:py-16">
                <div className="relative z-10 flex h-full min-w-0 flex-col justify-between gap-12">
                    <div>
                        <div className="flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.14em]">
                            <span>Project / {String(index + 1).padStart(2, "0")}</span>
                            <span>{project.own_commits} commits</span>
                        </div>
                        <h3 className="mt-10 max-w-full font-heading text-[clamp(1.8rem,3.6vw,3.25rem)] font-black leading-[0.98] tracking-[-0.045em] [text-wrap:balance]" style={EDITORIAL_PROJECT_TITLE_WRAP}>{project.repo_name}</h3>
                        <p className="mt-6 max-w-xl text-sm leading-6 opacity-80 sm:text-base sm:leading-7">{project.description || "A selected project from this candidate's body of work."}</p>
                    </div>

                    <div>
                        <div className="flex flex-wrap gap-2">
                            {project.tech_stack.slice(0, 5).map((tech) => (
                                <span className="border border-current px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em]" key={tech}>{tech}</span>
                            ))}
                        </div>
                        <a
                            href={project.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-7 inline-flex items-center gap-3 border-b border-current pb-1 font-mono text-xs font-semibold uppercase tracking-[0.12em] outline-none transition-[gap] duration-200 hover:gap-5 focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-4 motion-reduce:transition-none"
                        >
                            View repository <ArrowUpRight aria-hidden="true" className="size-4" />
                        </a>
                    </div>
                </div>

                <motion.div
                    className="relative mx-auto min-w-0 w-full max-w-2xl lg:ml-auto"
                    style={{ y: posterY }}
                    whileHover={reduceMotion ? undefined : { y: -6, rotate: index % 2 === 0 ? -0.8 : 0.8 }}
                    transition={MOTION.spring}
                >
                    <div className="absolute -inset-3 border border-current opacity-70" aria-hidden="true">
                        {['-left-1.5 -top-1.5', '-right-1.5 -top-1.5', '-bottom-1.5 -left-1.5', '-bottom-1.5 -right-1.5'].map((position) => (
                            <span className={`absolute size-3 border border-current bg-white transition-transform duration-200 group-hover:scale-125 motion-reduce:transform-none motion-reduce:transition-none ${position}`} key={position} />
                        ))}
                    </div>
                    <div className="relative aspect-[4/3] overflow-hidden border border-[#111315] bg-[#BBC9C6] shadow-[8px_9px_0_rgba(17,19,21,0.24)]">
                        <img src={getEditorialProjectImage(index)} alt="" loading="lazy" className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none" />
                        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 border-t border-[#111315] bg-white/95 px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#111315]">
                            <span>Visual placeholder</span>
                            <span>{project.stars} stars</span>
                        </div>
                    </div>
                    <motion.span
                        aria-hidden="true"
                        className="absolute -right-3 -top-5 rotate-[5deg] border border-[#111315] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-[#111315] shadow-[3px_3px_0_#111315]"
                        style={{ backgroundColor: style.note }}
                        whileHover={reduceMotion ? undefined : { rotate: -2, scale: 1.04 }}
                        transition={MOTION.spring}
                    >
                        Selected work
                    </motion.span>
                </motion.div>
            </div>
        </motion.article>
    );
}

function StackedProjectCard({ project, index }: { project: PortfolioProject; index: number }) {
    const stackRef = useRef<HTMLDivElement>(null);
    const reduceMotion = useReducedMotion();
    const stack = getEditorialStackPosition(index);
    const { scrollYProgress } = useScroll({ target: stackRef, offset: ["start end", "start 24%"] });
    const y = useTransform(scrollYProgress, [0, 0.72, 1], reduceMotion ? [0, 0, 0] : [130, 24, 0]);
    const scale = useTransform(scrollYProgress, [0, 1], reduceMotion ? [1, 1] : [0.92, 1]);
    const opacity = useTransform(scrollYProgress, [0, 0.22, 1], [0, 0.35, 1]);
    const rotate = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [stack.rotation * 2.25, stack.rotation]);

    return (
        <motion.div
            ref={stackRef}
            className="relative mb-8 origin-top md:sticky md:mb-[20vh]"
            style={{ top: stack.top, zIndex: stack.zIndex, y, scale, opacity, rotate }}
        >
            <ProjectCard project={project} index={index} stacked />
        </motion.div>
    );
}

function SectionLabel({ children, tone = "yellow" }: { children: string; tone?: "yellow" | "mint" | "pink" | "cyan" }) {
    const colors = { yellow: "bg-[#EAB12F]", mint: "bg-[#A1DFC5]", pink: "bg-[#E01E5A] text-white", cyan: "bg-[#30B4CD]" };
    return <motion.span className={`inline-flex -rotate-2 border border-[#111315] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[#111315] shadow-[3px_3px_0_#111315] ${colors[tone]}`} whileHover={{ y: -4, rotate: 1, scale: 1.03 }} transition={MOTION.spring}>{children}</motion.span>;
}

export function EditorialPortfolio({ portfolio, apiBase, contacts }: EditorialPortfolioProps) {
    const content = portfolio.content;
    const reduceMotion = useReducedMotion();
    const projects = getEditorialProjects(content.projects ?? []);
    const experience = content.experience ?? [];
    const education = content.education ?? [];
    const certifications = content.certifications ?? [];
    const sectionEnabled = (key: SectionKey) => content.sections?.[key] !== false;
    const showSkills = sectionEnabled("skills") && ((content.skills?.length ?? 0) > 0 || portfolio.verified_skills.length > 0);
    const { scrollYProgress } = useScroll();
    const progressScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
    const nameWords = splitEditorialWords(content.name || "GitHire candidate");
    const biography = splitEditorialBio(content.bio || "A developer turning ideas, systems, and evidence of work into useful digital experiences.");

    return (
        <main lang={content.language} className="relative min-h-screen overflow-x-clip bg-white text-[#111315] selection:bg-[#EAB12F] selection:text-[#111315]">
            <motion.div className="fixed inset-x-0 top-0 z-[70] h-1 origin-left bg-[#30B4CD]" style={reduceMotion ? undefined : { scaleX: progressScale }} />
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.22]"
                aria-hidden="true"
                style={{ backgroundImage: "linear-gradient(#BBC9C6 1px, transparent 1px), linear-gradient(90deg, #BBC9C6 1px, transparent 1px)", backgroundSize: "32px 32px" }}
            />

            <nav className="sticky top-0 z-50 border-b border-[#111315] bg-white">
                <div className="mx-auto flex h-12 max-w-[1280px] items-center justify-between px-4 font-mono text-[10px] font-medium uppercase tracking-[0.12em] sm:px-8">
                    <a href="#top" className="outline-none hover:text-[#E01E5A] focus-visible:ring-2 focus-visible:ring-[#111315]">GitHire / Editorial</a>
                    <div className="flex items-center gap-4 sm:gap-7">
                        <a href="#work" className="hidden hover:text-[#E01E5A] sm:inline">Work</a>
                        <a href="#about" className="hidden hover:text-[#E01E5A] sm:inline">About</a>
                        {contacts[0] && <a href={contactHref(contacts[0][0], contacts[0][1])} target={contacts[0][0] === "email" ? undefined : "_blank"} rel="noreferrer" className="inline-flex items-center gap-1.5 border-l border-[#111315] pl-4 hover:text-[#E01E5A] sm:pl-7">Contact <ArrowUpRight className="size-3" /></a>}
                    </div>
                </div>
            </nav>

            <section id="top" className="relative mx-auto flex min-h-[760px] max-w-[1280px] items-center px-4 py-24 sm:px-8 lg:min-h-[860px]">
                <div className="relative z-10 mx-auto w-full max-w-5xl text-center">
                    <motion.div
                        className="mb-9 flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em]"
                        initial={{ opacity: 0, y: reduceMotion ? 0 : -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: reduceMotion ? 0.16 : MOTION.duration.normal, ease: MOTION.ease }}
                    >
                        <span className="size-2 rounded-full bg-[#31B984] shadow-[0_0_0_4px_rgba(49,185,132,0.14)]" />
                        Public candidate portfolio
                    </motion.div>

                    <div className="relative inline-block">
                        <SelectionFrame />
                        <motion.h1
                            aria-label={content.name || "GitHire candidate"}
                            className="relative z-10 max-w-full break-words font-heading text-[clamp(3.4rem,11vw,9.4rem)] font-black uppercase leading-[0.8] tracking-[-0.065em]"
                            initial="hidden"
                            animate="visible"
                            whileHover={reduceMotion ? undefined : "hover"}
                            whileTap={reduceMotion ? undefined : "tap"}
                        >
                            {nameWords.map((word, wordIndex) => {
                                const characterOffset = nameWords.slice(0, wordIndex).reduce((total, item) => total + item.length + 1, 0);
                                return (
                                    <span aria-hidden="true" className="inline-block whitespace-nowrap" key={`${word}-${wordIndex}`}>
                                        {Array.from(word).map((character, characterIndex) => {
                                            const letterIndex = characterOffset + characterIndex;
                                            const letterMotion = getEditorialLetterMotion(letterIndex);
                                            return (
                                                <motion.span
                                                    className="inline-block"
                                                    key={`${character}-${characterIndex}`}
                                                    variants={{
                                                        hidden: reduceMotion ? { opacity: 0 } : { opacity: 0, ...letterMotion.hidden },
                                                        visible: { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, transition: { duration: reduceMotion ? 0.16 : 0.78, delay: reduceMotion ? 0 : 0.08 + letterIndex * 0.035, ease: MOTION.ease } },
                                                        hover: { ...letterMotion.hover, transition: { ...MOTION.spring, delay: (letterIndex % 7) * 0.018 } },
                                                        tap: { y: 2, scale: 0.98, rotate: 0, transition: { duration: MOTION.duration.micro } },
                                                    }}
                                                >
                                                    {character}
                                                </motion.span>
                                            );
                                        })}
                                        {wordIndex < nameWords.length - 1 && <span>&nbsp;</span>}
                                    </span>
                                );
                            })}
                        </motion.h1>
                    </div>

                    <motion.p
                        className="mx-auto mt-12 max-w-3xl text-xl font-medium leading-tight tracking-[-0.035em] sm:text-3xl"
                        initial={{ opacity: 0, y: reduceMotion ? 0 : 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: reduceMotion ? 0.16 : MOTION.duration.macro, delay: reduceMotion ? 0 : 0.46, ease: MOTION.ease }}
                    >
                        {content.headline || "Building thoughtful products from code to career."}
                    </motion.p>
                </div>

                <motion.div className="absolute left-4 top-24 z-20 rotate-[-6deg] border border-[#111315] bg-[#A1DFC5] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.1em] shadow-[4px_4px_0_#111315] sm:left-10" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -26, rotate: -14 }} animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, rotate: -6 }} whileHover={reduceMotion ? undefined : { y: -5, rotate: 1, scale: 1.04 }} transition={{ duration: reduceMotion ? 0.16 : MOTION.duration.macro, delay: reduceMotion ? 0 : 0.54, ease: MOTION.ease }}>
                    <span className="flex items-center gap-2"><Check className="size-3" /> GitHub verified</span>
                </motion.div>
                <motion.div className="absolute right-5 top-28 z-20 rotate-[5deg] rounded-bl-[22px] rounded-br-[22px] rounded-tl-[22px] border border-[#111315] bg-[#EAB12F] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.1em] shadow-[4px_4px_0_#111315] sm:right-12" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 26, rotate: 12 }} animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0, rotate: 5 }} whileHover={reduceMotion ? undefined : { y: -5, rotate: -1, scale: 1.04 }} transition={{ duration: reduceMotion ? 0.16 : MOTION.duration.macro, delay: reduceMotion ? 0 : 0.6, ease: MOTION.ease }}>
                    {content.skills?.[0] || "Developer portfolio"}
                </motion.div>
                <EditorialPhoto portfolio={portfolio} apiBase={apiBase} />
                <div className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2"><motion.a href="#about" aria-label="Scroll to about" className="block rounded-full border border-[#111315] bg-white p-3 outline-none focus-visible:ring-2 focus-visible:ring-[#E01E5A]" animate={reduceMotion ? undefined : { y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}><ArrowDown className="size-4" /></motion.a></div>
            </section>

            <section id="about" className="relative border-y border-[#111315] bg-white px-4 py-24 sm:px-8 lg:py-36">
                <svg aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-24 w-full -translate-y-1/2" viewBox="0 0 1200 120" preserveAspectRatio="none"><motion.path d="M0 78 C280 15 905 15 1200 78" fill="none" stroke="#111315" strokeWidth="1" initial={{ pathLength: reduceMotion ? 1 : 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: MOTION.duration.macro, ease: MOTION.ease }} /></svg>
                <div className="relative mx-auto max-w-5xl">
                    <div className="flex justify-between"><SectionLabel tone="pink">About me!</SectionLabel><SectionLabel tone="cyan">What&apos;s up</SectionLabel></div>
                    <div className="mt-16 grid gap-10 lg:grid-cols-[110px_minmax(0,1fr)_230px] lg:items-start">
                        <motion.aside className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.12em] lg:block" initial={{ opacity: 0, x: reduceMotion ? 0 : -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: reduceMotion ? 0.16 : MOTION.duration.normal, ease: MOTION.ease }}>
                            <span className="text-[#E01E5A]">01</span>
                            <span className="lg:mt-2 lg:block">Profile note</span>
                            <motion.span aria-hidden="true" className="h-px flex-1 origin-left bg-[#111315] lg:hidden" initial={{ scaleX: reduceMotion ? 1 : 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: MOTION.duration.macro, delay: 0.15, ease: MOTION.ease }} />
                            <motion.span aria-hidden="true" className="mt-5 hidden h-28 w-px origin-top bg-[#111315] lg:block" initial={{ scaleY: reduceMotion ? 1 : 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: MOTION.duration.macro, delay: 0.15, ease: MOTION.ease }} />
                        </motion.aside>

                        <div>
                            <motion.p className="font-medium leading-[1.22] tracking-[-0.035em]" style={{ fontSize: EDITORIAL_BIO_FONT_SIZE }} initial={{ opacity: 0, y: reduceMotion ? 0 : 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: reduceMotion ? 0.16 : MOTION.duration.macro, ease: MOTION.ease }}>
                                {biography.lead}
                            </motion.p>
                            {biography.details && <motion.p className="mt-7 max-w-2xl border-l-2 border-[#E01E5A] pl-5 text-base leading-7 text-[#4F322F] sm:text-lg sm:leading-8" initial={{ opacity: 0, y: reduceMotion ? 0 : 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.35 }} transition={{ duration: reduceMotion ? 0.16 : MOTION.duration.macro, delay: reduceMotion ? 0 : 0.12, ease: MOTION.ease }}>
                                {biography.details}
                            </motion.p>}
                        </div>

                        <motion.aside className="rotate-[2deg] border border-[#111315] bg-[#EAB12F] p-5 shadow-[6px_6px_0_#111315]" initial={{ opacity: 0, x: reduceMotion ? 0 : 26, rotate: reduceMotion ? 2 : 8 }} whileInView={{ opacity: 1, x: 0, rotate: 2 }} whileHover={reduceMotion ? undefined : { y: -6, rotate: -1, scale: 1.02 }} viewport={{ once: true, amount: 0.45 }} transition={reduceMotion ? { duration: 0.16 } : MOTION.spring}>
                            <p className="font-mono text-[9px] uppercase tracking-[0.14em]">Profile snapshot</p>
                            <div className="mt-5 space-y-3 border-t border-[#111315] pt-4">
                                {(portfolio.verified_skills.length > 0 ? portfolio.verified_skills.map((item) => item.skill) : content.skills).slice(0, 3).map((skill, index) => <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-[0.08em]" key={skill}><span>{skill}</span><span>{String(index + 1).padStart(2, "0")}</span></div>)}
                            </div>
                        </motion.aside>
                    </div>

                    {showSkills && <div className="mt-14 flex flex-wrap justify-center gap-3">
                        {portfolio.verified_skills.map((item, index) => <motion.span key={item.skill} className="inline-flex items-center gap-1.5 border border-[#111315] bg-[#A1DFC5] px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] shadow-[3px_3px_0_#111315]" initial={{ opacity: 0, y: reduceMotion ? 0 : 14, rotate: 0 }} whileInView={{ opacity: 1, y: 0, rotate: getEditorialMotionRotation(reduceMotion, index % 2 === 0 ? -1 : 1) }} viewport={{ once: true }} transition={{ duration: reduceMotion ? 0.16 : MOTION.duration.normal, delay: reduceMotion ? 0 : index * 0.045, ease: MOTION.ease }}><Check className="size-3" />{item.skill}</motion.span>)}
                        {content.skills.filter((skill) => !portfolio.verified_skills.some((verified) => verified.skill.toLowerCase() === skill.toLowerCase())).map((skill, index) => <motion.span key={skill} className={`border border-[#111315] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] shadow-[3px_3px_0_#111315] ${index % 3 === 0 ? "bg-[#EAB12F]" : index % 3 === 1 ? "bg-[#30B4CD]" : "bg-white"}`} initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }} whileInView={{ opacity: 1, y: 0, rotate: getEditorialMotionRotation(reduceMotion, index % 2 === 0 ? 1 : -1) }} viewport={{ once: true }} transition={{ duration: reduceMotion ? 0.16 : MOTION.duration.normal, delay: reduceMotion ? 0 : index * 0.035, ease: MOTION.ease }}>{skill}</motion.span>)}
                    </div>}
                </div>
            </section>

            {sectionEnabled("projects") && projects.length > 0 && <section id="work" className="relative px-4 py-24 sm:px-8 lg:py-36">
                <div className="mx-auto max-w-[1280px]">
                    <div className="mb-16 text-center lg:mb-24">
                        <SectionLabel>Six highlights max</SectionLabel>
                        <SplitTitle className="mt-8 font-heading text-[clamp(3.5rem,9vw,7.5rem)] font-black uppercase leading-[0.82] tracking-[-0.06em]">Selected work</SplitTitle>
                        <p className="mx-auto mt-6 max-w-xl font-mono text-[10px] uppercase leading-5 tracking-[0.12em] text-[#4F322F]">Repository evidence meets an editorial visual story.</p>
                    </div>
                    <div className="relative pb-8 md:pb-[42vh]">{projects.map((project, index) => <StackedProjectCard project={project} index={index} key={`${project.repo_name}-${index}`} />)}</div>
                </div>
            </section>}

            <section className="border-y border-[#111315] bg-[#F3D5A1] px-4 py-24 sm:px-8 lg:py-36">
                <div className="mx-auto grid max-w-[1280px] gap-20 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
                    {sectionEnabled("experience") && experience.length > 0 && <div>
                        <SectionLabel tone="pink">Career log</SectionLabel>
                        <SplitTitle className="mt-8 font-heading text-[clamp(3rem,7vw,6rem)] font-black uppercase leading-[0.85] tracking-[-0.055em]">Experience</SplitTitle>
                        <div className="relative mt-12 border-l border-[#111315] pl-7 sm:pl-10">
                            {experience.map((item, index) => <motion.article key={`${item.company}-${index}`} className="relative border-b border-[#111315]/30 py-8 first:pt-0" initial={{ opacity: 0, x: reduceMotion ? 0 : -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: reduceMotion ? 0.16 : MOTION.duration.normal, delay: reduceMotion ? 0 : index * 0.07, ease: MOTION.ease }}>
                                <span className="absolute -left-[34px] top-2 size-3 border border-[#111315] bg-[#E01E5A] sm:-left-[46px]" aria-hidden="true" />
                                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#4F322F]">{item.period || "Timeline"}</p>
                                <h3 className="mt-3 text-2xl font-bold tracking-[-0.03em]">{item.role}</h3>
                                <p className="mt-1 text-sm text-[#4F322F]">{[item.company, item.location].filter(Boolean).join(" / ")}</p>
                                {item.bullets?.length ? <ul className="mt-5 space-y-2 text-sm leading-6 text-[#4F322F]">{item.bullets.map((bullet) => <li className="flex gap-3" key={bullet}><span aria-hidden="true">+</span><span>{bullet}</span></li>)}</ul> : null}
                            </motion.article>)}
                        </div>
                    </div>}

                    <div className="space-y-16">
                        {sectionEnabled("education") && education.length > 0 && <div><SectionLabel tone="mint">Education</SectionLabel><div className="mt-8 space-y-5">{education.map((item, index) => <motion.article className="border border-[#111315] bg-white p-5 shadow-[5px_5px_0_#111315]" key={`${item.institution}-${index}`} initial={{ opacity: 0, y: reduceMotion ? 0 : 18, rotate: 0 }} whileInView={{ opacity: 1, y: 0, rotate: getEditorialMotionRotation(reduceMotion, index % 2 === 0 ? -1 : 1) }} viewport={{ once: true }} transition={{ duration: reduceMotion ? 0.16 : MOTION.duration.normal, ease: MOTION.ease }}><h3 className="text-lg font-bold">{item.institution}</h3><p className="mt-2 text-sm leading-6 text-[#4F322F]">{[item.degree, item.major, item.period].filter(Boolean).join(" / ")}</p></motion.article>)}</div></div>}
                        {sectionEnabled("certifications") && certifications.length > 0 && <div><SectionLabel tone="cyan">Credentials</SectionLabel><ul className="mt-8 space-y-3">{certifications.map((item) => <li className="flex gap-3 border-b border-[#111315]/25 pb-3 text-sm" key={item}><span aria-hidden="true">*</span><span>{item}</span></li>)}</ul></div>}
                    </div>
                </div>
            </section>

            <footer className="relative overflow-hidden bg-[#4F322F] px-4 py-24 text-white sm:px-8 lg:py-36">
                <motion.svg aria-hidden="true" className="absolute -left-16 top-8 h-64 w-64 text-[#A1DFC5] opacity-90 sm:left-8" viewBox="0 0 200 200" initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.7, rotate: 0 }} whileInView={{ opacity: 0.9, scale: 1, rotate: reduceMotion ? 0 : 12 }} viewport={{ once: true }} transition={{ duration: reduceMotion ? 0.16 : MOTION.duration.macro, ease: MOTION.ease }}><path fill="currentColor" d="M100 28c20-38 68-19 59 20 39-7 56 41 20 60 32 26 7 70-31 54-10 40-61 36-65-5-37 18-64-24-35-52-39-18-25-67 16-64-12-41 35-63 64-31Z" /></motion.svg>
                <div className="relative z-10 mx-auto max-w-[1280px] text-center">
                    <SectionLabel tone="mint">Open the conversation</SectionLabel>
                    <SplitTitle className="mt-10 font-heading text-[clamp(3.5rem,10vw,8rem)] font-black uppercase leading-[0.8] tracking-[-0.065em]">Let&apos;s connect</SplitTitle>
                    {contacts.length > 0 && <div className="mx-auto mt-14 flex max-w-4xl flex-wrap justify-center gap-3">{contacts.map(([key, value], index) => <motion.a href={contactHref(key, value)} target={key === "email" ? undefined : "_blank"} rel="noreferrer" className={`inline-flex items-center gap-3 border border-[#111315] px-5 py-4 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-[#111315] shadow-[5px_5px_0_#111315] outline-none focus-visible:ring-2 focus-visible:ring-white ${index % 3 === 0 ? "bg-[#30B4CD]" : index % 3 === 1 ? "bg-[#EAB12F]" : "bg-[#A1DFC5]"}`} key={key} whileHover={reduceMotion ? undefined : { y: -5, rotate: index % 2 === 0 ? -1 : 1 }} whileTap={reduceMotion ? undefined : { scale: 0.97 }} transition={MOTION.spring}>{key === "email" ? <Mail className="size-4" /> : key === "github" ? <Github className="size-4" /> : null}{contactLabel(key)}<ArrowUpRight className="size-4" /></motion.a>)}</div>}
                    <div className="mt-24 flex flex-wrap items-center justify-between gap-4 border-t border-white/30 pt-5 font-mono text-[9px] uppercase tracking-[0.12em] text-white/70"><span>© {new Date().getFullYear()} {content.name || "Portfolio"}</span><span>Created with GitHire</span></div>
                </div>
            </footer>
        </main>
    );
}
