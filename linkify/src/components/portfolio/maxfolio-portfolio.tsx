"use client";

import type { CSSProperties, ReactNode } from "react";
import { ArrowDown, ArrowUpRight, Check, Code2, Github, Mail } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import {
    MAXFOLIO_PROJECT_TITLE_WRAP,
    getMaxfolioLetterDelay,
    getMaxfolioMarqueeItems,
    getMaxfolioProjectImage,
    getMaxfolioProjectMotion,
    getMaxfolioProjects,
    splitMaxfolioWords,
} from "./maxfolio-portfolio-config";
import type { PortfolioProject, PublicPortfolio, PublicPortfolioContent } from "./types";

type MaxfolioPortfolioProps = {
    portfolio: PublicPortfolio;
    apiBase: string;
    contacts: Array<[string, string]>;
};

type SectionKey = keyof PublicPortfolioContent["sections"];

const EASE = [0.16, 1, 0.3, 1] as const;
const PORTRAIT_FALLBACK = "https://picsum.photos/seed/githire-maxfolio-portrait/1400/1500";

function contactHref(key: string, value: string) {
    if (key === "email") return `mailto:${value}`;
    if (key === "whatsapp") return `https://wa.me/${value.replace(/\D/g, "")}`;
    return value;
}

function contactLabel(key: string) {
    if (key === "linkedin") return "LinkedIn";
    if (key === "github") return "GitHub";
    if (key === "email") return "Email";
    if (key === "whatsapp") return "WhatsApp";
    return "Website";
}

function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
    const reduceMotion = useReducedMotion();
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.85, delay: reduceMotion ? 0 : delay, ease: EASE }}
        >
            {children}
        </motion.div>
    );
}

function SectionPill({ children }: { children: ReactNode }) {
    return <span className="inline-flex rounded-md border border-[#2E2E38] px-2.5 py-1 font-mono text-[10px] tracking-[0.04em] text-[#6C6C7A]">{children}</span>;
}

function ProfileImage({ portfolio, apiBase, portrait = false }: Pick<MaxfolioPortfolioProps, "portfolio" | "apiBase"> & { portrait?: boolean }) {
    const name = portfolio.content.name || "GitHire candidate";
    const src = portfolio.has_photo
        ? `${apiBase}/portfolios/${portfolio.public_id}/photo`
        : PORTRAIT_FALLBACK;

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={portfolio.has_photo ? `Foto ${name}` : ""}
            className={portrait ? "size-full object-cover grayscale-[0.28]" : "size-full rounded-full object-cover grayscale-[0.2]"}
        />
    );
}

function SplitHeadline({ children }: { children: string }) {
    const reduceMotion = useReducedMotion();
    const words = splitMaxfolioWords(children);
    let characterIndex = 0;

    return (
        <h1 className="max-w-[1200px] font-heading text-[clamp(3.5rem,9.15vw,8.25rem)] font-medium leading-[0.94] tracking-[-0.035em] text-[#F5F5F0] [text-wrap:balance]">
            {words.map((word, wordIndex) => (
                <span key={`${word}-${wordIndex}`} className="mr-[0.2em] inline-block whitespace-nowrap last:mr-0">
                    {Array.from(word).map((letter, letterIndex) => {
                        const index = characterIndex++;
                        return (
                            <motion.span
                                key={`${letter}-${letterIndex}`}
                                className="inline-block will-change-transform"
                                initial={{ opacity: 0, y: reduceMotion ? 0 : "0.72em", rotateX: reduceMotion ? 0 : 28 }}
                                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                                transition={{ duration: reduceMotion ? 0.15 : 0.8, delay: reduceMotion ? 0 : 0.08 + getMaxfolioLetterDelay(index), ease: EASE }}
                            >
                                {letter}
                            </motion.span>
                        );
                    })}
                </span>
            ))}
        </h1>
    );
}

function ContactLinks({ contacts, compact = false }: Pick<MaxfolioPortfolioProps, "contacts"> & { compact?: boolean }) {
    if (!contacts.length) return null;

    return (
        <div className={compact ? "flex flex-col items-end gap-2" : "flex flex-wrap gap-x-5 gap-y-3"}>
            {contacts.map(([key, value]) => (
                <motion.a
                    key={key}
                    href={contactHref(key, value)}
                    target={key === "email" ? undefined : "_blank"}
                    rel="noreferrer"
                    className={compact ? "text-[10px] capitalize text-[#6C6C7A] outline-none transition-colors hover:text-[#F5F5F0] focus-visible:text-[#F5F5F0]" : "group inline-flex items-center gap-1.5 text-xs font-medium text-[#8D8D9A] outline-none transition-colors hover:text-[#F5F5F0] focus-visible:text-[#F5F5F0]"}
                    whileHover={{ x: compact ? -3 : 3 }}
                    transition={{ duration: 0.2 }}
                >
                    {contactLabel(key)}
                    {!compact && <ArrowUpRight className="size-3 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />}
                </motion.a>
            ))}
        </div>
    );
}

function ProjectMarquee({ project }: { project: PortfolioProject }) {
    const items = getMaxfolioMarqueeItems(project);
    const loop = [...items, ...items, ...items];

    return (
        <motion.div
            className="absolute right-0 top-0 z-20 max-w-[78%] overflow-hidden rounded-bl-[20px] bg-[#141415] opacity-0 group-focus-visible:opacity-100"
            variants={{ rest: { opacity: 0, y: -5 }, hover: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.45, ease: EASE }}
        >
            <div
                className="flex w-max animate-marquee items-center gap-5 whitespace-nowrap px-5 py-3 [animation-play-state:paused] group-hover:[animation-play-state:running] group-focus-visible:[animation-play-state:running] motion-reduce:animate-none"
                style={{ "--duration": "20s" } as CSSProperties}
            >
                {loop.map((item, index) => (
                    <span key={`${item}-${index}`} className="flex items-center gap-5 font-mono text-[10px] text-[#6C6C7A]">
                        {item}<span className="size-1 rounded-full bg-[#FF4D2E]" aria-hidden="true" />
                    </span>
                ))}
            </div>
        </motion.div>
    );
}

function ProjectCard({ project, index }: { project: PortfolioProject; index: number }) {
    const reduceMotion = useReducedMotion();
    const scale = getMaxfolioProjectMotion(reduceMotion);

    return (
        <motion.article
            initial={{ opacity: 0, y: reduceMotion ? 0 : 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.14 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.9, delay: reduceMotion ? 0 : (index % 2) * 0.08, ease: EASE }}
        >
            <motion.a
                href={project.url}
                target="_blank"
                rel="noreferrer"
                className="group relative flex overflow-hidden rounded-[20px] border border-[#212126] bg-[#141415] outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D2E] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0A0A0B]"
                initial="rest"
                animate="rest"
                whileHover="hover"
                whileFocus="hover"
            >
                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="relative aspect-[1.04/1] overflow-hidden bg-[#212126]">
                        <motion.img
                            src={getMaxfolioProjectImage(index)}
                            alt=""
                            loading="lazy"
                            className="size-full object-cover saturate-[0.8] contrast-[1.06]"
                            variants={{ rest: { scale: scale.restScale }, hover: { scale: scale.hoverScale } }}
                            transition={{ duration: reduceMotion ? 0.15 : 0.7, ease: EASE }}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/[0.04]" />
                        <ProjectMarquee project={project} />
                    </div>
                    <div className="flex min-h-16 items-center gap-4 px-6 py-4">
                        <h2 className="min-w-0 flex-1 font-heading text-xl font-normal leading-7 text-[#F5F5F0] sm:text-2xl" style={MAXFOLIO_PROJECT_TITLE_WRAP}>{project.repo_name}</h2>
                        <motion.span className="shrink-0 text-[#6C6C7A]" variants={{ rest: { rotate: 0, x: 0, y: 0 }, hover: { rotate: 45, x: 2, y: -2 } }} transition={{ duration: 0.35, ease: EASE }}>
                            <ArrowUpRight className="size-5" aria-hidden="true" />
                        </motion.span>
                    </div>
                    <span className="sr-only">{project.description}. {project.tech_stack.join(", ")}. {project.stars} stars dan {project.own_commits} commits.</span>
                </div>
            </motion.a>
        </motion.article>
    );
}

function IdentityPanel({ portfolio, apiBase, skills }: Pick<MaxfolioPortfolioProps, "portfolio" | "apiBase"> & { skills: string[] }) {
    const reduceMotion = useReducedMotion();
    const { scrollYProgress } = useScroll();
    const imageScale = useTransform(scrollYProgress, [0.28, 0.72], reduceMotion ? [1, 1] : [1.08, 1]);
    const ticker = skills.length ? skills : ["Backend", "AI", "GitHub", "Open to work"];
    const tickerLoop = [...ticker, ...ticker, ...ticker];

    return (
        <div className="min-w-0 lg:sticky lg:top-6">
            <Reveal>
                <div className="overflow-hidden rounded-[20px] border border-[#212126] bg-[#141415]">
                    <div className="aspect-[4/5] overflow-hidden lg:aspect-[1.08/1]">
                        <motion.div className="size-full" style={{ scale: imageScale }}>
                            <ProfileImage portfolio={portfolio} apiBase={apiBase} portrait />
                        </motion.div>
                    </div>
                    <div className="overflow-hidden border-t border-[#212126] py-4">
                        <div className="flex w-max animate-marquee items-center gap-8 [--duration:28s] motion-reduce:animate-none">
                            {tickerLoop.map((skill, index) => (
                                <span key={`${skill}-${index}`} className="flex items-center gap-8 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.08em] text-[#8D8D9A]">
                                    {skill}<span className="size-1 rounded-full bg-[#FF4D2E]" aria-hidden="true" />
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </Reveal>
        </div>
    );
}

function AboutPanel({ portfolio }: Pick<MaxfolioPortfolioProps, "portfolio">) {
    const content = portfolio.content;
    return (
        <Reveal>
            <section className="flex min-h-[520px] flex-col items-center justify-between rounded-[20px] border border-[#212126] bg-[#141415] px-7 py-12 text-center sm:px-10">
                <SectionPill>About</SectionPill>
                <div className="my-12 max-w-md">
                    <h2 className="font-heading text-xl font-normal leading-7 text-[#F5F5F0]">Hi, I am {content.name || "a GitHire candidate"}<br />{content.headline || "A developer building useful products"}</h2>
                    <p className="mt-7 text-sm leading-7 text-[#8D8D9A]">{content.bio || "I turn ideas, systems, and evidence of work into digital products that feel useful and human."}</p>
                </div>
                <div className="flex flex-col items-center gap-4 font-mono text-[10px] leading-5 text-[#6C6C7A]">
                    <span className="h-12 w-px bg-[#2E2E38]" />
                    <p>({content.projects?.length || 0} selected repositories)<br />({portfolio.verified_skills.length} GitHub-verified skills)<br />(Open to meaningful work)</p>
                </div>
            </section>
        </Reveal>
    );
}

function ExperiencePanel({ portfolio }: Pick<MaxfolioPortfolioProps, "portfolio">) {
    const experience = portfolio.content.experience ?? [];
    if (!experience.length) return null;

    return (
        <Reveal delay={0.05}>
            <section className="rounded-[20px] border border-[#212126] bg-[#141415] px-7 py-12 text-center sm:px-10">
                <SectionPill>Experience</SectionPill>
                <div className="mt-12 space-y-10">
                    {experience.map((item, index) => (
                        <motion.article
                            key={`${item.company}-${index}`}
                            initial={{ opacity: 0, y: 18 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.65, delay: index * 0.06, ease: EASE }}
                        >
                            <p className="font-mono text-[10px] text-[#6C6C7A]">{item.period || "Present"}</p>
                            <h3 className="mt-2 font-heading text-base font-normal text-[#F5F5F0]">{item.role || "Contributor"}</h3>
                            <p className="mt-1 text-xs text-[#8D8D9A]">{[item.company, item.location].filter(Boolean).join(" · ")}</p>
                            {item.bullets?.length ? <p className="mx-auto mt-3 max-w-sm text-xs leading-5 text-[#6C6C7A]">{item.bullets.slice(0, 2).join(" ")}</p> : null}
                        </motion.article>
                    ))}
                </div>
            </section>
        </Reveal>
    );
}

function GitHubProofPanel({ portfolio }: Pick<MaxfolioPortfolioProps, "portfolio">) {
    const proofs = portfolio.verified_skills.length
        ? portfolio.verified_skills.slice(0, 4).map((item) => ({
            title: item.skill,
            detail: item.evidence ? `${item.evidence.own_commits ?? 0} commits across ${item.evidence.repos ?? 0} repositories` : item.level || "Verified from GitHub",
            verified: true,
        }))
        : (portfolio.content.skills ?? []).slice(0, 4).map((skill) => ({ title: skill, detail: "Portfolio capability", verified: false }));

    if (!proofs.length) return null;

    return (
        <Reveal delay={0.1}>
            <section className="rounded-[20px] border border-[#212126] bg-[#141415] px-7 py-12 text-center sm:px-10">
                <SectionPill>GitHub proof</SectionPill>
                <div className="mt-12 space-y-12">
                    {proofs.map((proof, index) => (
                        <motion.div key={proof.title} whileHover={{ y: -4 }} transition={{ duration: 0.3, ease: EASE }}>
                            <div className="mx-auto flex size-10 items-center justify-center rounded-full border border-[#2E2E38] text-[#FF4D2E]">
                                {proof.verified ? <Check className="size-4" aria-hidden="true" /> : <Code2 className="size-4" aria-hidden="true" />}
                            </div>
                            <h3 className="mt-4 font-heading text-base font-normal text-[#F5F5F0]">{proof.title}</h3>
                            <p className="mt-2 font-mono text-[10px] leading-5 text-[#6C6C7A]">{proof.detail}</p>
                        </motion.div>
                    ))}
                </div>
            </section>
        </Reveal>
    );
}

function BackgroundPanel({ portfolio, showEducation, showCertifications }: Pick<MaxfolioPortfolioProps, "portfolio"> & { showEducation: boolean; showCertifications: boolean }) {
    const education = portfolio.content.education ?? [];
    const certifications = portfolio.content.certifications ?? [];
    if ((!showEducation || !education.length) && (!showCertifications || !certifications.length)) return null;

    return (
        <Reveal delay={0.12}>
            <section className="rounded-[20px] border border-[#212126] bg-[#141415] px-7 py-12 text-center sm:px-10">
                <SectionPill>Background</SectionPill>
                {showEducation && education.length > 0 && <div className="mt-10 space-y-8">{education.map((item, index) => <article key={`${item.institution}-${index}`}><h3 className="font-heading text-base text-[#F5F5F0]">{item.institution}</h3><p className="mt-2 text-xs leading-5 text-[#8D8D9A]">{[item.degree, item.major, item.period].filter(Boolean).join(" · ")}</p></article>)}</div>}
                {showCertifications && certifications.length > 0 && <div className="mt-10 border-t border-[#212126] pt-8"><ul className="space-y-3 font-mono text-[10px] leading-5 text-[#6C6C7A]">{certifications.map((item) => <li key={item}>{item}</li>)}</ul></div>}
            </section>
        </Reveal>
    );
}

export function MaxfolioPortfolio({ portfolio, apiBase, contacts }: MaxfolioPortfolioProps) {
    const content = portfolio.content;
    const projects = getMaxfolioProjects(content.projects ?? []);
    const sectionEnabled = (key: SectionKey) => content.sections?.[key] !== false;
    const allSkills = Array.from(new Set([...portfolio.verified_skills.map((item) => item.skill), ...(content.skills ?? [])])).slice(0, 12);
    const primaryContact = contacts[0];
    const language = content.language === "en" ? "en" : "id";

    return (
        <main lang={language} className="min-h-screen overflow-clip bg-[#0A0A0B] text-[#F5F5F0]" style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}>
            <div className="w-full p-4 sm:p-6">
                <section id="top" className="relative flex min-h-[500px] flex-col justify-end overflow-hidden rounded-xl pb-6 pt-40 sm:pt-52">
                    <header className="absolute inset-x-0 top-0 flex items-start justify-between gap-6">
                        <motion.div className="flex items-center gap-3" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: EASE }}>
                            <div className="size-12 overflow-hidden rounded-full border border-[#212126] bg-[#141415]"><ProfileImage portfolio={portfolio} apiBase={apiBase} /></div>
                            <div className="min-w-0 font-mono text-[10px] leading-4"><p className="truncate text-[#F5F5F0]">{content.name || "GitHire candidate"}</p><p className="truncate text-[#6C6C7A]">{contacts.find(([key]) => key === "email")?.[1] || "Public portfolio"}</p></div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.15, ease: EASE }}><ContactLinks contacts={contacts.slice(0, 4)} compact /></motion.div>
                    </header>

                    <SplitHeadline>{content.headline || content.name || "Digital Developer"}</SplitHeadline>
                    <div className="mt-8 flex items-end justify-between gap-8">
                        <motion.p className="max-w-4xl text-base leading-7 text-[#8D8D9A] sm:text-xl sm:leading-8 lg:text-2xl lg:leading-9" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5, ease: EASE }}>
                            {content.bio || "I build useful digital products where thoughtful engineering, AI, and human needs meet."}
                        </motion.p>
                        <motion.a href="#work" className="hidden shrink-0 items-center gap-3 font-mono text-[10px] text-[#6C6C7A] outline-none sm:flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.8 }}>
                            Scroll to explore
                            <motion.span className="flex size-11 items-center justify-center rounded-full border border-[#212126] bg-[#141415]" animate={{ y: [0, 4, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}><ArrowDown className="size-4" aria-hidden="true" /></motion.span>
                        </motion.a>
                    </div>
                </section>

                {sectionEnabled("projects") && projects.length > 0 && <section id="work" aria-label="Selected work" className="grid gap-4 md:grid-cols-2">{projects.map((project, index) => <ProjectCard key={`${project.repo_name}-${index}`} project={project} index={index} />)}</section>}

                <section className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(330px,1fr)]">
                    <IdentityPanel portfolio={portfolio} apiBase={apiBase} skills={allSkills} />
                    <div className="space-y-4">
                        <AboutPanel portfolio={portfolio} />
                        {sectionEnabled("experience") && <ExperiencePanel portfolio={portfolio} />}
                        {sectionEnabled("skills") && <GitHubProofPanel portfolio={portfolio} />}
                        <BackgroundPanel portfolio={portfolio} showEducation={sectionEnabled("education")} showCertifications={sectionEnabled("certifications")} />
                    </div>
                </section>

                <Reveal className="mt-4">
                    <section className="relative overflow-hidden rounded-[20px] border border-[#212126] bg-[#141415] px-6 py-20 text-center sm:px-12 sm:py-28">
                        <div className="pointer-events-none absolute left-1/2 top-full h-48 w-80 -translate-x-1/2 rounded-full bg-[#FF4D2E]/20 blur-3xl" />
                        <SectionPill>Contact</SectionPill>
                        <h2 className="mx-auto mt-10 max-w-4xl font-heading text-[clamp(2rem,4vw,4rem)] font-normal leading-[1.08] tracking-[-0.035em] [text-wrap:balance]">
                            {language === "en" ? "I am not just here to write code; I am here to build what matters." : "Saya tidak sekadar menulis kode; saya membangun sesuatu yang berarti."}
                        </h2>
                        <p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-[#8D8D9A]">{language === "en" ? "Open for roles, collaborations, and conversations about useful technology." : "Terbuka untuk peluang kerja, kolaborasi, dan percakapan tentang teknologi yang berguna."}</p>
                        {primaryContact && <motion.a href={contactHref(primaryContact[0], primaryContact[1])} target={primaryContact[0] === "email" ? undefined : "_blank"} rel="noreferrer" className="mx-auto mt-10 inline-flex min-w-44 items-center justify-center gap-2 rounded-full border border-[#2E2E38] bg-[#0F0E10] px-7 py-4 text-sm text-[#F5F5F0] shadow-[0_0_35px_rgba(255,77,46,0.16)] outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D2E]" whileHover={{ scale: 1.035, boxShadow: "0 0 48px rgba(255,77,46,0.28)" }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.3, ease: EASE }}>{language === "en" ? "Let’s talk" : "Mari terhubung"}{primaryContact[0] === "email" ? <Mail className="size-4" aria-hidden="true" /> : <Github className="size-4" aria-hidden="true" />}</motion.a>}
                    </section>
                </Reveal>

                <footer className="flex flex-wrap items-center justify-between gap-3 px-1 py-5 font-mono text-[9px] text-[#6C6C7A]"><span>© {new Date().getFullYear()} {content.name || "Portfolio"}</span><span>Powered by GitHire</span><span>From code to career</span></footer>
            </div>
        </main>
    );
}
