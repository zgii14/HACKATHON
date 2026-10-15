"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Award, BadgeCheck, Github, Globe, Linkedin, Mail, MessageCircle, Star, Trophy, type LucideIcon } from "lucide-react";
import { Yellowtail } from "next/font/google";
import { useId, type ReactNode } from "react";
import { contactHref, formatCount, getArcadeCopy, pickSkills, splitHeadline, type ArcadeCopy } from "./arcade-portfolio-config";
import type { PortfolioProject, PublicPortfolio, PublicPortfolioContent } from "./types";

// Font script khusus tema Arcade; next/font men-self-host saat build, jadi hanya ikut di chunk tema ini.
const yellowtail = Yellowtail({ weight: "400", subsets: ["latin"], display: "swap" });

type ArcadePortfolioProps = {
    portfolio: PublicPortfolio;
    apiBase: string;
    contacts: Array<[string, string]>;
};

type SectionKey = keyof PublicPortfolioContent["sections"];

const EASE = [0.16, 1, 0.3, 1] as const;
const HOLO = "linear-gradient(90deg, #5EEAD4 0%, #A78BFA 38%, #F0ABFC 70%, #FDE68A 100%)";
const DOTS = { backgroundImage: "radial-gradient(#2A2F55 1.2px, transparent 1.4px)", backgroundSize: "24px 24px" };
const FOCUS = "outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0D17]";

const CONTACT_ICONS: Record<string, LucideIcon> = {
    github: Github,
    linkedin: Linkedin,
    email: Mail,
    whatsapp: MessageCircle,
    website: Globe,
};

function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "GH";
}

function Boot({ reduceMotion, className = "", delay = 0, children }: { reduceMotion: boolean | null; className?: string; delay?: number; children: ReactNode }) {
    if (reduceMotion) return <div className={className}>{children}</div>;
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.6, delay, ease: EASE }}
        >
            {children}
        </motion.div>
    );
}

function TitleSquares({ tone }: { tone: "dark" | "light" }) {
    const border = tone === "dark" ? "border-[#0B0D17]" : "border-[#9AA0C3]";
    return (
        <span className="flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((item) => <span key={item} className={`size-2.5 border-2 ${border}`} />)}
        </span>
    );
}

function Window({ tone, title, className = "", bodyClassName = "", children }: { tone: "holo" | "violet" | "plain"; title?: string; className?: string; bodyClassName?: string; children: ReactNode }) {
    if (tone === "holo") {
        return (
            <div className={`p-[3px] ${className}`} style={{ backgroundImage: HOLO }}>
                <div className="flex h-7 items-center justify-between px-2"><TitleSquares tone="dark" />{title && <span className="truncate pl-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0B0D17]">{title}</span>}</div>
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

function WavyDivider() {
    const id = useId().replace(/:/g, "");
    const path = Array.from({ length: 8 }, (_, index) => `Q ${index * 150 + 75} ${index % 2 ? 36 : 4} ${index * 150 + 150} 20`).join(" ");
    return (
        <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="block h-8 w-full" aria-hidden="true">
            <defs>
                <linearGradient id={`holo-${id}`} x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#5EEAD4" />
                    <stop offset="38%" stopColor="#A78BFA" />
                    <stop offset="70%" stopColor="#F0ABFC" />
                    <stop offset="100%" stopColor="#FDE68A" />
                </linearGradient>
            </defs>
            <path d={`M 0 20 ${path}`} fill="none" stroke={`url(#holo-${id})`} strokeWidth="3" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

function SectionHeading({ children }: { children: ReactNode }) {
    return <h2 className="text-4xl font-extrabold tracking-[-0.03em] text-[#5EEAD4] sm:text-5xl">{children}</h2>;
}

function ContactIcons({ contacts, size = "md" }: { contacts: Array<[string, string]>; size?: "md" | "lg" }) {
    const links = contacts.map(([kind, value]) => [kind, contactHref(kind, value)] as const).filter((entry): entry is readonly [string, string] => Boolean(entry[1]));
    if (!links.length) return null;
    return (
        <div className="flex flex-wrap gap-2">
            {links.map(([kind, href]) => {
                const Icon = CONTACT_ICONS[kind] ?? Globe;
                return (
                    <a
                        key={kind}
                        href={href}
                        target={kind === "email" ? undefined : "_blank"}
                        rel="noreferrer"
                        aria-label={kind}
                        className={`inline-flex items-center gap-2 border-2 border-[#2A2F55] bg-[#0B0D17] text-[#F5F3EE] transition-colors duration-200 hover:border-[#5EEAD4] hover:text-[#5EEAD4] motion-reduce:transition-none ${size === "lg" ? "min-h-12 px-4 text-sm font-semibold capitalize" : "size-11 justify-center"} ${FOCUS}`}
                    >
                        <Icon className="size-4" aria-hidden="true" />
                        {size === "lg" && <span>{kind}</span>}
                    </a>
                );
            })}
        </div>
    );
}

function HalftonePhoto({ portfolio, apiBase, className = "" }: Pick<ArcadePortfolioProps, "portfolio" | "apiBase"> & { className?: string }) {
    const name = portfolio.content.name || "Portfolio";
    return (
        <div className={`relative overflow-hidden border-[3px] border-[#5B3FD9] bg-[#141833] ${className}`}>
            {portfolio.has_photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${apiBase}/portfolios/${portfolio.public_id}/photo`} alt={`Foto ${name}`} className="size-full object-cover grayscale contrast-125" />
            ) : (
                <span className="flex size-full items-center justify-center text-4xl font-extrabold text-[#F5F3EE]">{initials(name)}</span>
            )}
            <span className="pointer-events-none absolute inset-0 mix-blend-color" style={{ backgroundImage: HOLO }} aria-hidden="true" />
            <span className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(#0B0D17 1.1px, transparent 1.5px)", backgroundSize: "5px 5px" }} aria-hidden="true" />
        </div>
    );
}

function Ornaments() {
    return (
        <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden="true">
            <span className="absolute left-[6%] top-[22%] size-24 rounded-full border-[3px] border-[#F0ABFC]/50" />
            <span className="absolute left-[9%] top-[25%] size-16 rounded-full border-2 border-dashed border-[#5EEAD4]/40" />
            <span className="absolute bottom-[20%] right-[7%] size-0 border-x-[34px] border-b-[58px] border-x-transparent border-b-[#5B3FD9]/40" />
            <span className="absolute right-[12%] top-[18%] size-28" style={{ backgroundImage: "radial-gradient(#A78BFA 1.6px, transparent 1.8px)", backgroundSize: "12px 12px" }} />
            <span className="absolute bottom-[26%] left-[14%] size-20" style={{ backgroundImage: "radial-gradient(#5EEAD4 1.4px, transparent 1.6px)", backgroundSize: "10px 10px" }} />
        </div>
    );
}

function Hero({ portfolio, apiBase, contacts, copy, reduceMotion }: ArcadePortfolioProps & { copy: ArcadeCopy; reduceMotion: boolean | null }) {
    const content = portfolio.content;
    const name = content.name || "Portfolio";
    const segments = splitHeadline(content.headline ?? "");
    return (
        <section id="top" className="relative flex min-h-[100svh] flex-col overflow-hidden px-5 pb-10 pt-6 sm:px-8" style={DOTS}>
            <Ornaments />
            <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between">
                <a href="#top" className={`bg-clip-text text-2xl font-extrabold tracking-[-0.04em] text-transparent ${FOCUS}`} style={{ backgroundImage: HOLO }}>{initials(name)}</a>
                {portfolio.github_verified && <span className="inline-flex items-center gap-1.5 border-2 border-[#5EEAD4]/60 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#5EEAD4]"><BadgeCheck className="size-3.5" aria-hidden="true" />{copy.githubVerified}</span>}
            </header>

            <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center py-10">
                <div className="relative">
                    <Boot reduceMotion={reduceMotion}>
                        <Window tone="holo" bodyClassName="px-5 py-10 sm:px-12 sm:py-14">
                            <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:gap-10 md:text-left">
                                <HalftonePhoto portfolio={portfolio} apiBase={apiBase} className="size-28 shrink-0 rotate-[-4deg] sm:size-36 md:size-44" />
                                <div className="min-w-0 flex-1">
                                    <h1
                                        className="bg-clip-text text-[clamp(2.4rem,7.5vw,5.5rem)] font-extrabold uppercase leading-[0.9] tracking-[-0.04em] text-transparent [overflow-wrap:anywhere]"
                                        style={{ backgroundImage: HOLO, filter: "drop-shadow(4px 4px 0 #5B3FD9)" }}
                                    >
                                        {name}
                                    </h1>
                                    {segments.length > 0 && (
                                        <p className={`${yellowtail.className} mt-5 text-[clamp(1.6rem,3.6vw,2.6rem)] leading-tight text-[#FDE68A]`}>
                                            {segments.map((segment, index) => (
                                                <span key={`${segment}-${index}`}>
                                                    {index > 0 && <span className="mx-2 align-middle font-sans text-[0.55em] text-[#F0ABFC]" aria-hidden="true">×</span>}
                                                    {segment}
                                                </span>
                                            ))}
                                        </p>
                                    )}
                                    <div className="mt-7 flex justify-center md:justify-start"><ContactIcons contacts={contacts} /></div>
                                </div>
                            </div>
                        </Window>
                    </Boot>
                    <span className="absolute -bottom-3 -right-3 -z-10 hidden size-full border-2 border-[#5B3FD9]/70 sm:block" aria-hidden="true" />
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

function ProjectCard({ project, index, copy }: { project: PortfolioProject; index: number; copy: ArcadeCopy }) {
    const tech = (project.tech_stack ?? []).slice(0, 5);
    return (
        <a href={project.url} target="_blank" rel="noreferrer" aria-label={`${copy.openRepo}: ${project.repo_name}`} className={`group block transition-transform duration-300 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none ${FOCUS}`}>
            <Window tone="violet" title={String(index + 1).padStart(2, "0")} bodyClassName="flex min-h-48 flex-col">
                <div className="flex-1 p-5">
                    <p className="truncate font-mono text-xs text-[#9AA0C3]"><span className="text-[#5EEAD4]">$</span> cd {project.repo_name}</p>
                    {project.description && <p className="mt-4 line-clamp-3 text-[15px] leading-7 text-[#F5F3EE]/85">{project.description}</p>}
                    {tech.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{tech.map((item) => <span key={item} className="border border-[#2A2F55] px-2 py-0.5 font-mono text-[11px] text-[#5EEAD4]">{item}</span>)}</div>}
                </div>
                <div className="flex items-center justify-between gap-3 border-t-[3px] border-[#5B3FD9] bg-[#5B3FD9]/15 px-5 py-2 font-mono text-xs text-[#9AA0C3]">
                    <span className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1"><Star className="size-3.5 text-[#FDE68A]" aria-hidden="true" />{formatCount(project.stars)} {copy.stars}</span>
                        <span>{formatCount(project.own_commits)} {copy.commits}</span>
                    </span>
                    <ArrowUpRight className="size-4 text-[#F5F3EE] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
                </div>
            </Window>
            <div className="relative mt-6 pl-5">
                <span className="absolute -top-3 left-0 h-14 w-12 border-l-[3px] border-t-[3px] border-[#5B3FD9]" aria-hidden="true" />
                <h3 className="relative text-2xl font-extrabold leading-tight tracking-[-0.02em] text-[#F5F3EE] [overflow-wrap:anywhere] sm:text-3xl">{project.repo_name}</h3>
            </div>
        </a>
    );
}

function Timeline({ items }: { items: Array<{ key: string; title?: string; subtitle: string; period?: string; extra?: string[] }> }) {
    return (
        <ol className="ml-1.5 space-y-8 border-l-2 border-[#5B3FD9]">
            {items.map((item) => (
                <li key={item.key} className="relative pl-6">
                    <span className="absolute -left-[7px] top-2 size-3 bg-[#5EEAD4]" aria-hidden="true" />
                    {item.period && <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#F0ABFC]">{item.period}</p>}
                    {item.title && <h3 className="mt-1 text-lg font-bold text-[#F5F3EE] [overflow-wrap:anywhere]">{item.title}</h3>}
                    {item.subtitle && <p className="mt-0.5 text-sm text-[#9AA0C3]">{item.subtitle}</p>}
                    {item.extra && item.extra.length > 0 && (
                        <ul className="mt-3 space-y-1.5 text-[15px] leading-7 text-[#F5F3EE]/85">
                            {item.extra.map((line, index) => <li key={`${item.key}-${index}`} className="flex gap-2"><span className="text-[#A78BFA]" aria-hidden="true">▸</span><span>{line}</span></li>)}
                        </ul>
                    )}
                </li>
            ))}
        </ol>
    );
}

function Section({ id, title, reduceMotion, children }: { id: string; title: string; reduceMotion: boolean | null; children: ReactNode }) {
    return (
        <section id={id} className="mx-auto max-w-6xl scroll-mt-6 px-5 py-16 sm:px-8 sm:py-20">
            <Boot reduceMotion={reduceMotion}><SectionHeading>{title}</SectionHeading></Boot>
            <div className="mt-10">{children}</div>
        </section>
    );
}

export function ArcadePortfolio({ portfolio, apiBase, contacts }: ArcadePortfolioProps) {
    const reduceMotion = useReducedMotion();
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
            <Hero portfolio={portfolio} apiBase={apiBase} contacts={contacts} copy={copy} reduceMotion={reduceMotion} />
            <div id="arcade-content"><WavyDivider /></div>

            {bio && (
                <section id="about" className="mx-auto max-w-4xl scroll-mt-6 px-5 py-16 sm:px-8 sm:py-20">
                    <Boot reduceMotion={reduceMotion}>
                        <Window tone="plain" title={copy.about} bodyClassName="p-6 sm:p-10">
                            <p className="whitespace-pre-line text-[17px] leading-8 text-[#F5F3EE]/90">{bio}</p>
                        </Window>
                    </Boot>
                </section>
            )}

            {sectionOn("projects") && projects.length > 0 && (
                <Section id="projects" title={copy.projects} reduceMotion={reduceMotion}>
                    <div className="grid gap-x-10 gap-y-14 md:grid-cols-2">
                        {projects.map((project, index) => (
                            <Boot key={`${project.repo_name}-${index}`} reduceMotion={reduceMotion} delay={(index % 2) * 0.08}>
                                <ProjectCard project={project} index={index} copy={copy} />
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
                                {skills.verified.map((item) => (
                                    <div key={item.skill} className="border-2 border-[#2A2F55] bg-[#11142A] p-4">
                                        <div className="flex items-center justify-between gap-2">
                                            <Trophy className="size-4 text-[#FDE68A]" aria-hidden="true" />
                                            {item.level && <span className="truncate font-mono text-[11px] uppercase tracking-[0.12em] text-[#F0ABFC]">{item.level}</span>}
                                        </div>
                                        <p className="mt-3 text-lg font-bold text-[#F5F3EE] [overflow-wrap:anywhere]">{item.skill}</p>
                                        {item.evidence && <p className="mt-1 font-mono text-xs text-[#9AA0C3]">{formatCount(item.evidence.own_commits)} {copy.commits} · {formatCount(item.evidence.repos)} {copy.repos}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {skills.others.length > 0 && (
                        <div className={skills.verified.length > 0 ? "mt-10" : ""}>
                            {skills.verified.length > 0 && <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#9AA0C3]">{copy.otherSkills}</p>}
                            <div className="mt-4 flex flex-wrap gap-2">{skills.others.map((skill) => <span key={skill} className="border-2 border-[#2A2F55] px-3 py-1.5 text-sm font-semibold text-[#F5F3EE]">{skill}</span>)}</div>
                        </div>
                    )}
                </Section>
            )}

            {sectionOn("experience") && experience.length > 0 && (
                <Section id="experience" title={copy.experience} reduceMotion={reduceMotion}>
                    <Window tone="plain" title={copy.experience} bodyClassName="p-6 sm:p-10">
                        <Timeline items={experience.map((item, index) => ({
                            key: `${item.company}-${item.role}-${index}`,
                            title: item.role || item.company,
                            subtitle: [item.role ? item.company : undefined, item.location].filter(Boolean).join(" · "),
                            period: item.period,
                            extra: (item.bullets ?? []).filter(Boolean),
                        }))} />
                    </Window>
                </Section>
            )}

            {sectionOn("education") && education.length > 0 && (
                <Section id="education" title={copy.education} reduceMotion={reduceMotion}>
                    <Window tone="plain" title={copy.education} bodyClassName="p-6 sm:p-10">
                        <Timeline items={education.map((item, index) => ({
                            key: `${item.institution}-${index}`,
                            title: item.institution,
                            subtitle: [item.degree, item.major, item.gpa ? `GPA ${item.gpa}` : undefined].filter(Boolean).join(" · "),
                            period: item.period,
                        }))} />
                    </Window>
                </Section>
            )}

            {sectionOn("certifications") && certifications.length > 0 && (
                <Section id="certifications" title={copy.certifications} reduceMotion={reduceMotion}>
                    <Window tone="plain" title={copy.certifications} bodyClassName="p-6 sm:p-8">
                        <ul className="grid gap-4 sm:grid-cols-2">
                            {certifications.map((item, index) => <li key={`${item}-${index}`} className="flex gap-3 text-[15px] leading-7 text-[#F5F3EE]/90"><Award className="mt-1 size-4 shrink-0 text-[#FDE68A]" aria-hidden="true" /><span className="[overflow-wrap:anywhere]">{item}</span></li>)}
                        </ul>
                    </Window>
                </Section>
            )}

            <WavyDivider />
            <footer className="mx-auto max-w-6xl px-5 pb-10 pt-16 sm:px-8">
                {contacts.length > 0 && (
                    <div className="mb-14">
                        <SectionHeading>{copy.contact}</SectionHeading>
                        <div className="mt-6"><ContactIcons contacts={contacts} size="lg" /></div>
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
