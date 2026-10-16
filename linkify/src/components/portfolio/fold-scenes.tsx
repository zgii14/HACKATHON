"use client";

import { AnimatePresence, animate, motion, useInView, useMotionValue, useTransform, type Variants } from "framer-motion";
import { ArrowUpRight, BadgeCheck, Github, Globe, Linkedin, Mail, MessageCircle, Phone, PhoneOff, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/utils/functions/cn";
import {
    buildFoldStats,
    callContacts,
    formatCallTime,
    firstSentences,
    formatClock,
    initials,
    notificationMeta,
    pickBlockColor,
    pickNotifications,
    primaryContact,
    splitSkills,
    type CallContact,
    type FoldCopy,
    type FoldNav,
} from "./fold-portfolio-config";
import type { PortfolioProject, PublicPortfolio } from "./types";

export const DISPLAY = "[font-family:var(--font-fold-display)] font-black uppercase";
export const MONO = "[font-family:var(--font-geist-mono)] text-[11px] font-medium uppercase tracking-[0.08em]";
export const FOLD_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const groupVariants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const itemVariants: Variants = {
    hidden: { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: FOLD_EASE } },
};

/** Satu akar variants per layar; anak cukup `<Item>`. `immediate` = animasi saat mount (layar pertama). */
export function Stagger({ children, className, immediate = false }: { children: ReactNode; className?: string; immediate?: boolean }) {
    return (
        <motion.div className={className} variants={groupVariants} initial="hidden" {...(immediate ? { animate: "show" } : { whileInView: "show", viewport: { once: true, amount: 0.25 } })}>
            {children}
        </motion.div>
    );
}

export function Item({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
    const Component = as === "li" ? motion.li : motion.div;
    return (
        <Component className={className} variants={itemVariants}>
            {children}
        </Component>
    );
}

export type SceneProps = {
    portfolio: PublicPortfolio;
    apiBase: string;
    copy: FoldCopy;
    contacts: Array<[string, string]>;
    /** true = layar HP potret (mobile): isi dipadatkan agar muat satu layar. */
    compact?: boolean;
    onNavigate?: (nav: FoldNav) => void;
};

function Shell({ compact, className, children }: { compact?: boolean; className?: string; children: ReactNode }) {
    // Padding bawah = ruang dock di layar device.
    return <div className={cn("relative h-full w-full overflow-hidden [container-type:inline-size]", compact ? "px-5 pb-[64px] pt-12" : "px-[5cqw] pb-[76px] pt-[4cqw]", className)}>{children}</div>;
}

export function photoUrl(portfolio: PublicPortfolio, apiBase: string) {
    return `${apiBase}/portfolios/${portfolio.public_id}/photo`;
}

export function Photo({ portfolio, apiBase, className, fallbackClassName }: { portfolio: PublicPortfolio; apiBase: string; className?: string; fallbackClassName?: string }) {
    if (portfolio.has_photo) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={photoUrl(portfolio, apiBase)} alt={portfolio.content.name || "Portfolio"} className={cn("object-cover", className)} />;
    }
    return (
        <div className={cn("flex items-center justify-center bg-[#e4e0d8] text-[#111111]", DISPLAY, className, fallbackClassName)} aria-hidden="true">
            {initials(portfolio.content.name)}
        </div>
    );
}

const CONTACT_ICONS: Record<string, LucideIcon> = {
    github: Github,
    linkedin: Linkedin,
    email: Mail,
    whatsapp: MessageCircle,
    website: Globe,
};

export function contactLabel(kind: string) {
    return (
        {
            github: "GitHub",
            linkedin: "LinkedIn",
            email: "Email",
            whatsapp: "WhatsApp",
            website: "Website",
        }[kind] ?? kind
    );
}

export function ContactIcon({ kind, className }: { kind: string; className?: string }) {
    const Icon = CONTACT_ICONS[kind] ?? Globe;
    return <Icon className={className} aria-hidden="true" />;
}

export function Clock({ className }: { className?: string }) {
    // Jam pengunjung baru diisi setelah mount; SSR menampilkan placeholder agar hidrasi sama.
    const [time, setTime] = useState("--:--");
    useEffect(() => {
        const tick = () => setTime(formatClock(new Date()));
        tick();
        const id = window.setInterval(tick, 15_000);
        return () => window.clearInterval(id);
    }, []);
    return (
        <time className={className} suppressHydrationWarning>
            {time}
        </time>
    );
}

function CountUp({ value, className }: { value: number; className?: string }) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.6 });
    const motionValue = useMotionValue(0);
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        if (!inView) return;
        const controls = animate(motionValue, value, {
            duration: 1.4,
            ease: FOLD_EASE,
            onUpdate: (latest) => setDisplay(Math.round(latest)),
        });
        return () => controls.stop();
    }, [inView, motionValue, value]);
    return (
        <span ref={ref} className={className}>
            {display}
        </span>
    );
}

/** Tile proyek generatif: warna dari hash repo, inisial condensed, pola garis. */
export function ProjectTile({ project, className, showTech = true }: { project: PortfolioProject; className?: string; showTech?: boolean }) {
    const color = pickBlockColor(project.repo_name);
    return (
        <div className={cn("relative flex flex-col justify-between overflow-hidden p-2", className)} style={{ backgroundColor: color.bg, color: color.ink }} aria-hidden="true">
            <span
                className="absolute inset-0 opacity-[0.14]"
                style={{
                    backgroundImage: `repeating-linear-gradient(135deg, ${color.ink} 0 1px, transparent 1px 9px)`,
                }}
            />
            <span className={cn("relative text-[1.6em] leading-none", DISPLAY)}>{initials(project.repo_name.replace(/[-_.]+/g, " "))}</span>
            {showTech && project.tech_stack?.[0] && <span className={cn("relative truncate !text-[9px]", MONO)}>{project.tech_stack[0]}</span>}
        </div>
    );
}

function VerifiedBadge({ copy, className }: { copy: FoldCopy; className?: string }) {
    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-[#111111]", className)}>
            <BadgeCheck className="size-3.5 text-[#2f5bd3]" aria-hidden="true" />
            {copy.githubVerified}
        </span>
    );
}

/* ----------------------------------------------------------------------------------------- */

export function LockScreen({ portfolio, apiBase, copy, contacts }: SceneProps) {
    const { content } = portfolio;
    const notifications = content.sections?.projects === false ? [] : pickNotifications(content.projects ?? []);
    const github = contacts.find(([kind]) => kind === "github");
    const primary = primaryContact(contacts.filter(([kind]) => kind !== "github"));

    return (
        <div className={cn("relative h-full w-full overflow-hidden bg-[#ece9e3] text-[#111111] [container-type:inline-size]")}>
            {portfolio.has_photo ? (
                <Photo portfolio={portfolio} apiBase={apiBase} className="absolute inset-0 size-full" />
            ) : (
                <div
                    className={cn("absolute inset-0 flex items-end justify-center bg-gradient-to-b from-[#f4f1ec] to-[#cfc9be] text-[70cqw] leading-[0.75] text-[#111111]/[0.07]", DISPLAY)}
                    aria-hidden="true"
                >
                    {initials(content.name)}
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-white/10 to-black/25" />

            <Stagger immediate className="relative flex h-full flex-col px-[6cqw] pb-[6cqw] pt-[9cqw]">
                <Item className="text-center">
                    <Clock className={cn("block text-[clamp(64px,30cqw,168px)] leading-[0.82] tracking-[-0.01em]", DISPLAY)} />
                    {content.headline && <p className="mx-auto mt-3 max-w-[80%] text-[14px] font-medium leading-snug">{content.headline}</p>}
                    {portfolio.github_verified && <VerifiedBadge copy={copy} className="mt-3" />}
                </Item>

                <div className="mt-auto grid gap-2">
                    {notifications.map((project) => (
                        <Item key={project.repo_name}>
                            <a href={project.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl bg-white/85 p-2.5 transition-colors hover:bg-white">
                                <ProjectTile project={project} showTech={false} className="size-10 shrink-0 rounded-[10px] !p-1.5 text-[13px]" />
                                <span className="min-w-0">
                                    <span className="block truncate text-[14px] font-semibold">{project.repo_name}</span>
                                    <span className={cn("block truncate !text-[10px] text-[#111111]/65", MONO)}>{notificationMeta(project, copy)}</span>
                                </span>
                            </a>
                        </Item>
                    ))}
                    <Item className="mt-2 flex items-center justify-between gap-3">
                        {github ? (
                            <a
                                href={github[1].startsWith("http") ? github[1] : `https://${github[1]}`}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="GitHub"
                                className="grid size-11 place-items-center rounded-full bg-white/90 transition-transform hover:scale-105"
                            >
                                <Github className="size-5" aria-hidden="true" />
                            </a>
                        ) : (
                            <span className="size-11" />
                        )}
                        <span className="rounded-full bg-white/90 px-4 py-2 text-[13px] font-medium">{copy.unfold}</span>
                        {primary ? (
                            <a
                                href={primary.href}
                                target={primary.kind === "email" ? undefined : "_blank"}
                                rel="noreferrer"
                                aria-label={contactLabel(primary.kind)}
                                className="grid size-11 place-items-center rounded-full bg-[#111111] text-white transition-transform hover:scale-105"
                            >
                                <ContactIcon kind={primary.kind} className="size-5" />
                            </a>
                        ) : (
                            <span className="size-11" />
                        )}
                    </Item>
                </div>
            </Stagger>
        </div>
    );
}

export function HeroScreen({ portfolio, apiBase, copy, contacts, compact, onNavigate }: SceneProps) {
    const { content } = portfolio;
    const bio = firstSentences(content.bio, 2);
    const primary = primaryContact(contacts);
    const hasWork = content.sections?.projects !== false && (content.projects ?? []).length > 0;

    return (
        <div className={cn("grid h-full w-full bg-[#fafafa] text-[#111111]", compact ? "grid-rows-[minmax(0,0.85fr)_auto]" : "grid-cols-[1.15fr_1fr]")}>
            <Shell compact={compact} className={cn("flex flex-col justify-center", compact && "order-2 !h-auto !pt-6")}>
                <Stagger className="max-w-[560px]">
                    <Item>
                        <p className={cn("text-[#111111]/60", MONO)}>{content.headline || "Portfolio"}</p>
                    </Item>
                    <Item>
                        <h1 className={cn("mt-4 break-words text-[clamp(48px,10.5cqw,132px)] leading-[0.84]", DISPLAY)}>{content.name || "Portfolio"}</h1>
                    </Item>
                    {bio && (
                        <Item>
                            <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-[#111111]/70">{bio}</p>
                        </Item>
                    )}
                    <Item className="mt-7 flex flex-wrap gap-2">
                        {hasWork && (
                            <a
                                href="#fold-work"
                                onClick={(event) => {
                                    if (!onNavigate) return;
                                    event.preventDefault();
                                    onNavigate("work");
                                }}
                                className="inline-flex items-center gap-1.5 rounded-full bg-[#111111] px-5 py-2.5 text-[14px] font-medium text-white transition-transform hover:-translate-y-0.5"
                            >
                                {copy.seeWork} <ArrowUpRight className="size-4" aria-hidden="true" />
                            </a>
                        )}
                        {primary && (
                            <a
                                href={primary.href}
                                target={primary.kind === "email" ? undefined : "_blank"}
                                rel="noreferrer"
                                className="inline-flex items-center rounded-full bg-[#111111]/[0.07] px-5 py-2.5 text-[14px] font-medium transition-colors hover:bg-[#111111]/[0.12]"
                            >
                                {copy.sayHello}
                            </a>
                        )}
                    </Item>
                </Stagger>
            </Shell>
            <div className={cn("relative min-h-0 overflow-hidden", compact && "order-1")}>
                <Photo portfolio={portfolio} apiBase={apiBase} className="absolute inset-0 size-full" fallbackClassName="text-[30cqw] text-[#111111]/15 [container-type:inline-size]" />
            </div>
        </div>
    );
}

export function StatsScreen({ portfolio, copy, compact }: SceneProps) {
    const stats = buildFoldStats(portfolio, copy);
    return (
        <Shell compact={compact} className="flex flex-col justify-center bg-[#0c0c0c] text-white">
            <Stagger>
                <Item>
                    <p className={cn("text-white/55", MONO)}>{copy.inNumbers}</p>
                </Item>
                <div className="mt-[4cqw] grid gap-8 sm:grid-cols-3 sm:gap-6">
                    {stats.map((stat) => (
                        <Item key={stat.label}>
                            <CountUp value={stat.value} className={cn("block text-[clamp(84px,15cqw,200px)] leading-[0.8]", DISPLAY)} />
                            <p className={cn("mt-3 text-white/60", MONO)}>{stat.label}</p>
                        </Item>
                    ))}
                </div>
            </Stagger>
        </Shell>
    );
}

export function WorkIntroScreen({ portfolio, copy, compact }: SceneProps) {
    const count = (portfolio.content.projects ?? []).length;
    return (
        <Shell compact={compact} className="flex flex-col justify-end bg-[#0c0c0c] text-white">
            <Stagger>
                <Item>
                    <p className={cn("text-white/55", MONO)}>
                        {String(count).padStart(2, "0")} {copy.repos}
                    </p>
                </Item>
                <Item>
                    <h2 className={cn("mt-3 text-[clamp(72px,14cqw,200px)] leading-[0.82]", DISPLAY)}>{copy.selectedWork}</h2>
                </Item>
            </Stagger>
        </Shell>
    );
}

export function ProjectScreen({ project, index, copy, compact }: { project: PortfolioProject; index: number; copy: FoldCopy; compact?: boolean }) {
    const color = pickBlockColor(project.repo_name);
    const meta = [project.own_commits > 0 && `${project.own_commits} ${copy.commits}`, project.stars > 0 && `${project.stars} ${copy.stars}`].filter(Boolean).join(" · ");
    return (
        <div
            className={cn("relative h-full w-full overflow-hidden [container-type:inline-size]", compact ? "px-5 pb-[64px] pt-12" : "px-[5cqw] pb-[76px] pt-[4cqw]")}
            style={{ backgroundColor: color.bg, color: color.ink }}
        >
            <span
                className="pointer-events-none absolute -right-[8cqw] -top-[10cqw] size-[46cqw] rounded-full opacity-[0.16]"
                style={{
                    backgroundImage: `repeating-radial-gradient(circle, ${color.ink} 0 1.5px, transparent 1.5px 14px)`,
                }}
                aria-hidden="true"
            />
            <Stagger className={cn("relative grid h-full", compact ? "content-end gap-3" : "grid-cols-[0.9fr_1.1fr] items-end gap-6")}>
                <Item>
                    <span className={cn("block text-[clamp(110px,30cqw,380px)] leading-[0.76]", DISPLAY)} aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                    </span>
                </Item>
                <div className="min-w-0 pb-2">
                    {project.tech_stack?.length > 0 && (
                        <Item>
                            <p className={cn("opacity-70", MONO)}>{project.tech_stack.slice(0, 4).join(" · ")}</p>
                        </Item>
                    )}
                    <Item>
                        <h3 className={cn("mt-3 break-words text-[clamp(44px,7cqw,96px)] leading-[0.86]", DISPLAY)}>{project.repo_name}</h3>
                    </Item>
                    {project.description && (
                        <Item>
                            <p className="mt-4 line-clamp-3 max-w-[44ch] text-[15px] font-medium leading-relaxed opacity-85">{project.description}</p>
                        </Item>
                    )}
                    <Item className="mt-6 flex flex-wrap items-center gap-4">
                        <a
                            href={project.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[14px] font-medium transition-transform hover:-translate-y-0.5"
                            style={{ backgroundColor: color.ink, color: color.bg }}
                        >
                            {copy.openRepo} <ArrowUpRight className="size-4" aria-hidden="true" />
                        </a>
                        {meta && <span className={cn("opacity-75", MONO)}>{meta}</span>}
                    </Item>
                </div>
            </Stagger>
        </div>
    );
}

export function SkillsScreen({ portfolio, copy, compact }: SceneProps) {
    const { verified, others, hiddenOthers } = splitSkills(portfolio.content.skills ?? [], portfolio.verified_skills ?? [], compact ? 4 : 6, compact ? 6 : 14);
    return (
        <Shell compact={compact} className="bg-[#fafafa] text-[#111111]">
            <Stagger className={cn("grid h-full content-center", compact ? "gap-5" : "grid-cols-2 gap-[5cqw]")}>
                <div>
                    <Item>
                        <h2 className={cn("text-[clamp(64px,10cqw,140px)] leading-[0.82]", DISPLAY)}>{copy.skills}</h2>
                    </Item>
                    {verified.length > 0 && (
                        <Item>
                            <p className={cn("mt-4 inline-flex items-center gap-1.5 text-[#2f5bd3]", MONO)}>
                                <BadgeCheck className="size-3.5" aria-hidden="true" /> {copy.verified}
                            </p>
                        </Item>
                    )}
                    {others.length > 0 && (
                        <Item className="mt-6">
                            <p className={cn("text-[#111111]/50", MONO)}>{copy.otherSkills}</p>
                            <ul className="mt-3 flex flex-wrap gap-1.5">
                                {others.map((skill) => (
                                    <li key={skill} className="rounded-full border border-[#111111]/15 px-3 py-1 text-[13px]">
                                        {skill}
                                    </li>
                                ))}
                                {hiddenOthers > 0 && <li className="rounded-full px-2 py-1 text-[13px] text-[#111111]/50">+{hiddenOthers}</li>}
                            </ul>
                        </Item>
                    )}
                </div>
                {verified.length > 0 && (
                    <ol className="divide-y divide-[#111111]/10 border-y border-[#111111]/10 self-center">
                        {verified.map((item, index) => {
                            const evidence = [
                                item.level,
                                item.evidence?.own_commits ? `${item.evidence.own_commits} ${copy.commits}` : null,
                                item.evidence?.repos ? `${item.evidence.repos} ${copy.repos}` : null,
                            ]
                                .filter(Boolean)
                                .join(" · ");
                            return (
                                <Item as="li" key={item.skill} className={cn("flex items-baseline py-3", compact ? "flex-wrap gap-x-3 gap-y-0.5 py-2" : "gap-4")}>
                                    <span className={cn("w-6 text-[#111111]/40", MONO)}>{String(index + 1).padStart(2, "0")}</span>
                                    <span className="min-w-0 flex-1 truncate text-[17px] font-medium">{item.skill}</span>
                                    {evidence && <span className={cn("shrink-0 text-[#111111]/55 !text-[10px]", MONO, compact && "basis-full pl-9")}>{evidence}</span>}
                                </Item>
                            );
                        })}
                    </ol>
                )}
            </Stagger>
        </Shell>
    );
}

export function ListScreen({ portfolio, copy, compact, kind }: SceneProps & { kind: "experience" | "education" | "certifications" }) {
    const { content } = portfolio;
    const title = copy[kind];
    const certifications = content.certifications ?? [];
    const certLimit = compact ? 7 : 10;
    return (
        <Shell compact={compact} className={cn("text-[#111111]", kind === "education" ? "bg-[#fafafa]" : "bg-[#f1eee8]")}>
            <Stagger className="flex h-full flex-col justify-center">
                <Item>
                    <h2 className={cn("text-[clamp(56px,9cqw,128px)] leading-[0.82]", DISPLAY)}>{title}</h2>
                </Item>
                {kind === "experience" && (
                    <div className="mt-[3cqw] divide-y divide-[#111111]/10 border-y border-[#111111]/10">
                        {(content.experience ?? []).slice(0, 3).map((item, index) => (
                            <Item key={`${item.company}-${index}`} className="grid gap-1 py-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6">
                                <p className={cn("pt-1 text-[#111111]/50", MONO)}>{item.period || "·"}</p>
                                <div className="min-w-0">
                                    <h3 className="text-[17px] font-semibold leading-snug">{item.role}</h3>
                                    <p className="text-[14px] text-[#111111]/60">{[item.company, item.location].filter(Boolean).join(" · ")}</p>
                                    {!compact && item.bullets?.[0] && <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-[#111111]/70">{item.bullets[0]}</p>}
                                </div>
                            </Item>
                        ))}
                    </div>
                )}
                {kind === "education" && (
                    <div className="mt-[3cqw] divide-y divide-[#111111]/10 border-y border-[#111111]/10">
                        {(content.education ?? []).slice(0, 3).map((item, index) => (
                            <Item key={`${item.institution}-${index}`} className="grid gap-1 py-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-6">
                                <p className={cn("pt-1 text-[#111111]/50", MONO)}>{item.period || "·"}</p>
                                <div className="min-w-0">
                                    <h3 className="text-[17px] font-semibold leading-snug">{item.institution}</h3>
                                    <p className="text-[14px] text-[#111111]/60">{[item.degree, item.major, item.gpa && `GPA ${item.gpa}`].filter(Boolean).join(" · ")}</p>
                                </div>
                            </Item>
                        ))}
                    </div>
                )}
                {kind === "certifications" && (
                    <ul className="mt-[3cqw] grid gap-x-8 border-t border-[#111111]/10 sm:grid-cols-2">
                        {certifications.slice(0, certLimit).map((item) => (
                            <Item as="li" key={item} className="truncate border-b border-[#111111]/10 py-2.5 text-[14px]">
                                {item}
                            </Item>
                        ))}
                        {certifications.length > certLimit && (
                            <Item as="li" className={cn("py-2.5 text-[#111111]/50", MONO)}>
                                +{certifications.length - certLimit}
                            </Item>
                        )}
                    </ul>
                )}
            </Stagger>
        </Shell>
    );
}

export function CallScreen({ portfolio, apiBase, copy, contacts }: SceneProps) {
    const list = callContacts(contacts);
    const [answered, setAnswered] = useState(false);
    const name = portfolio.content.name || "Portfolio";

    return (
        <div
            className={cn(
                "flex h-full w-full flex-col items-center overflow-hidden bg-[#0c0c0c] px-[7cqw] pb-[7cqw] text-center text-white [container-type:inline-size]",
                answered ? "pt-[8cqw]" : "pt-[12cqw]",
            )}
        >
            <p className={cn("break-words text-[clamp(40px,13cqw,76px)] leading-[0.86]", DISPLAY)}>{name}</p>
            <AnimatePresence mode="wait" initial={false}>
                {answered ? (
                    <motion.p key="connected" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 text-[14px] text-[#34c759]">
                        {copy.connected} · <CallTimer />
                    </motion.p>
                ) : (
                    list.length > 0 && (
                        <motion.p key="incoming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 text-[14px] text-white/65">
                            {copy.incoming}
                        </motion.p>
                    )
                )}
            </AnimatePresence>
            <div className={cn("relative shrink-0", answered ? "mt-3" : "mt-[6cqw]")}>
                {!answered && list.length > 0 && (
                    <motion.span
                        className="absolute inset-0 rounded-full border border-white/30"
                        animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                        aria-hidden="true"
                    />
                )}
                <Photo
                    portfolio={portfolio}
                    apiBase={apiBase}
                    className={cn("rounded-full transition-[width,height] duration-500", answered ? "size-16" : "size-28")}
                    fallbackClassName="text-[32px]"
                />
            </div>
            {list.length > 0 &&
                (answered ? (
                    <ConnectedPanel list={list} copy={copy} onEnd={() => setAnswered(false)} />
                ) : (
                    <SlideToAnswer label={copy.slide} ariaLabel={`${copy.slide}: ${contactLabel(list[0].kind)}`} onAnswer={() => setAnswered(true)} />
                ))}
        </div>
    );
}

function CallTimer() {
    const [seconds, setSeconds] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
        return () => window.clearInterval(id);
    }, []);
    return <span className="tabular-nums">{formatCallTime(seconds)}</span>;
}

const KNOB = 48;
const TRACK_PAD = 8;

/**
 * Geser untuk mengangkat. Posisi knob dipegang motion value sendiri dengan batas angka dari ResizeObserver;
 * batas berbentuk ref membuat framer menskalakan ulang posisi saat resize, dan salinan layar yang sedang
 * display:none (lebar 0) menaruh knob di tengah.
 */
function SlideToAnswer({ label, ariaLabel, onAnswer }: { label: string; ariaLabel: string; onAnswer: () => void }) {
    const trackRef = useRef<HTMLDivElement>(null);
    const dragged = useRef(false);
    const x = useMotionValue(0);
    const [max, setMax] = useState(0);
    const labelOpacity = useTransform(x, (value) => (max ? 1 - Math.min(1, value / (max * 0.6)) : 1));
    const fillWidth = useTransform(x, (value) => value + KNOB);

    useEffect(() => {
        const node = trackRef.current;
        if (!node) return;
        const measure = () => {
            setMax(Math.max(0, node.clientWidth - KNOB - TRACK_PAD * 2));
            x.set(0);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        return () => observer.disconnect();
    }, [x]);

    const finish = () => {
        animate(x, max, { duration: 0.25, ease: FOLD_EASE }).then(onAnswer);
    };

    return (
        <div ref={trackRef} className="relative mt-auto h-16 w-full max-w-[360px] rounded-full bg-white/10 p-2">
            <motion.span className="absolute inset-y-2 left-2 rounded-full bg-[#34c759]/25" style={{ width: fillWidth }} aria-hidden="true" />
            <motion.span style={{ opacity: labelOpacity }} className="pointer-events-none absolute inset-0 flex items-center justify-center pl-12 text-[15px] font-medium text-white/80">
                <motion.span animate={{ opacity: [0.45, 1, 0.45] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
                    {label}
                </motion.span>
            </motion.span>
            <motion.button
                type="button"
                aria-label={ariaLabel}
                drag="x"
                dragConstraints={{ left: 0, right: max }}
                dragElastic={0}
                dragMomentum={false}
                style={{ x }}
                onDragStart={() => {
                    dragged.current = true;
                }}
                onDragEnd={() => {
                    if (x.get() > max * 0.7) finish();
                    else animate(x, 0, { type: "spring", stiffness: 500, damping: 35 });
                }}
                onClick={() => {
                    // Klik/Enter tanpa geser juga mengangkat; klik sisa dari geseran diabaikan.
                    if (dragged.current) {
                        dragged.current = false;
                        return;
                    }
                    finish();
                }}
                whileTap={{ scale: 0.94 }}
                className="relative z-10 grid size-12 cursor-grab touch-none place-items-center rounded-full bg-[#34c759] text-white active:cursor-grabbing"
            >
                <Phone className="size-5" aria-hidden="true" />
            </motion.button>
        </div>
    );
}

function ConnectedPanel({ list, copy, onEnd }: { list: CallContact[]; copy: FoldCopy; onEnd: () => void }) {
    return (
        <div className="mt-4 flex min-h-0 w-full max-w-[360px] flex-1 flex-col items-center">
            <p className={cn("mb-2.5 shrink-0 text-white/50", MONO)}>{copy.reachVia}</p>
            <Stagger immediate className="grid min-h-0 w-full grid-cols-[minmax(0,1fr)] gap-1.5 overflow-y-auto">
                {list.map((item) => (
                    <Item key={item.kind}>
                        <a
                            href={item.href}
                            target={item.kind === "email" ? undefined : "_blank"}
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-2xl bg-white/[0.08] px-3 py-2.5 text-left transition-colors hover:bg-white/[0.14]"
                        >
                            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10">
                                <ContactIcon kind={item.kind} className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-[13px] font-semibold">{contactLabel(item.kind)}</span>
                                <span className="block truncate text-[12px] text-white/60">{item.display}</span>
                            </span>
                            <ArrowUpRight className="size-4 shrink-0 text-white/50" aria-hidden="true" />
                        </a>
                    </Item>
                ))}
            </Stagger>
            <button
                type="button"
                onClick={onEnd}
                aria-label={copy.endCall}
                className="mt-3 grid size-12 shrink-0 place-items-center rounded-full bg-[#ff3b30] text-white transition-transform hover:scale-105"
            >
                <PhoneOff className="size-5" aria-hidden="true" />
            </button>
        </div>
    );
}
