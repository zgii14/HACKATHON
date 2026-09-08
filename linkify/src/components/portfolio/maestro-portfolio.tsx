"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { ArrowDown, ArrowUpRight, Check, Github, Mail, MapPin, Sparkles } from "lucide-react";
import { useRef } from "react";
import {
    MAESTRO_PROJECT_TITLE_WRAP,
    getMaestroCardTransform,
    getMaestroMetaItems,
    getMaestroProjectPalette,
    getMaestroProjects,
    splitMaestroWords,
} from "./maestro-portfolio-config";
import type { PortfolioProject, PublicPortfolio } from "./types";

type MaestroPortfolioProps = {
    portfolio: PublicPortfolio;
    apiBase: string;
    contacts: Array<[string, string]>;
};

type Copy = {
    work: string;
    about: string;
    proof: string;
    background: string;
    contact: string;
    selectedWork: string;
    projectStory: string;
    projectStoryBody: string;
    aboutTitle: string;
    aboutEyebrow: string;
    galleryTitle: string;
    proofTitle: string;
    experience: string;
    education: string;
    certifications: string;
    contactTitle: string;
    contactBody: string;
    visitProject: string;
};

const EASE = [0.16, 1, 0.3, 1] as const;

function getCopy(language: PublicPortfolio["content"]["language"]): Copy {
    if (language === "en") {
        return {
            work: "Work",
            about: "About",
            proof: "Proof",
            background: "Background",
            contact: "Contact",
            selectedWork: "Selected work",
            projectStory: "How the work took shape",
            projectStoryBody: "A guided walk through the systems, decisions, and evidence behind selected repositories.",
            aboutTitle: "Built with care. Proven through practice.",
            aboutEyebrow: "The person behind the work",
            galleryTitle: "A closer look at the work",
            proofTitle: "Proof that lives in the code",
            experience: "Experience",
            education: "Education",
            certifications: "Certifications",
            contactTitle: "Let’s build something worth remembering.",
            contactBody: "Open to thoughtful conversations, ambitious products, and teams that value evidence of work.",
            visitProject: "Visit repository",
        };
    }
    return {
        work: "Karya",
        about: "Tentang",
        proof: "Bukti",
        background: "Perjalanan",
        contact: "Kontak",
        selectedWork: "Karya terpilih",
        projectStory: "Bagaimana karya ini dibentuk",
        projectStoryBody: "Perjalanan melalui sistem, keputusan, dan bukti nyata di balik repository pilihan.",
        aboutTitle: "Dibangun dengan teliti. Dibuktikan lewat karya.",
        aboutEyebrow: "Sosok di balik karya",
        galleryTitle: "Melihat karya lebih dekat",
        proofTitle: "Bukti yang hidup di dalam kode",
        experience: "Pengalaman",
        education: "Pendidikan",
        certifications: "Sertifikasi",
        contactTitle: "Mari membangun sesuatu yang layak dikenang.",
        contactBody: "Terbuka untuk percakapan bermakna, produk ambisius, dan tim yang menghargai bukti kerja.",
        visitProject: "Buka repository",
    };
}

function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "GH";
}

function contactHref(key: string, value: string) {
    if (key === "email") return `mailto:${value}`;
    if (key === "whatsapp") return `https://wa.me/${value.replace(/\D/g, "")}`;
    return value;
}

function MaestroPhoto({ portfolio, apiBase, className }: Pick<MaestroPortfolioProps, "portfolio" | "apiBase"> & { className: string }) {
    const name = portfolio.content.name || "GitHire candidate";
    if (portfolio.has_photo) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={`${apiBase}/portfolios/${portfolio.public_id}/photo`}
                alt={`Foto ${name}`}
                className={className}
            />
        );
    }
    return <div className={`${className} flex items-center justify-center bg-[#829791] font-serif text-5xl italic text-[#F2F4D9]`}>{initials(name)}</div>;
}

function SplitDisplay({ children, reduceMotion, className = "" }: { children: string; reduceMotion: boolean | null; className?: string }) {
    return (
        <span className={`flex flex-wrap justify-center gap-x-[0.2em] ${className}`} aria-label={children}>
            {splitMaestroWords(children).map((word, wordIndex) => (
                <span key={`${word}-${wordIndex}`} className="inline-flex overflow-hidden pb-[0.08em]" aria-hidden="true">
                    <motion.span
                        initial={{ y: reduceMotion ? 0 : "115%", opacity: reduceMotion ? 1 : 0, filter: reduceMotion ? "none" : "blur(8px)" }}
                        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                        transition={{ duration: reduceMotion ? 0.12 : 0.9, delay: reduceMotion ? 0 : 0.12 + wordIndex * 0.075, ease: EASE }}
                        className="inline-block"
                    >
                        {word}
                    </motion.span>
                </span>
            ))}
        </span>
    );
}

function ProjectVisual({ project, index, className = "" }: { project: PortfolioProject; index: number; className?: string }) {
    const palette = getMaestroProjectPalette(index);
    return (
        <div className={`relative isolate overflow-hidden ${className}`} style={{ backgroundColor: palette.surface, color: palette.foreground }}>
            <div className="absolute -left-[12%] top-[18%] size-[55%] rounded-full border border-current/20" />
            <div className="absolute -right-[6%] -top-[14%] size-[64%] rounded-full opacity-70" style={{ backgroundColor: palette.accent }} />
            <div className="absolute inset-x-[12%] bottom-[12%] top-[22%] rotate-[-5deg] rounded-[18px] border border-current/20 bg-black/10 shadow-[0_28px_55px_rgba(21,27,19,0.22)] backdrop-blur-[2px]" />
            <div className="absolute inset-x-[20%] bottom-[8%] top-[30%] rotate-[7deg] rounded-[18px] border border-white/25 bg-white/10" />
            <div className="absolute inset-x-[8%] bottom-[8%] z-10 flex items-end justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.12em]">
                <span className="max-w-[72%]" style={MAESTRO_PROJECT_TITLE_WRAP}>{project.repo_name}</span>
                <span>{String(index + 1).padStart(3, "0")}</span>
            </div>
        </div>
    );
}

function MaestroNav({ name, contacts, copy }: { name: string; contacts: Array<[string, string]>; copy: Copy }) {
    const primaryContact = contacts[0];
    return (
        <header className="absolute inset-x-0 top-0 z-50 px-5 py-5 text-[#151B13] sm:px-8 lg:px-12">
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }} className="mx-auto flex max-w-[1280px] items-center justify-between gap-5">
                <a href="#top" className="flex min-w-0 items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-[#151B13]"><Sparkles className="size-4" aria-hidden="true" /><span className="truncate font-serif text-lg">{name || "GitHire Portfolio"}</span></a>
                <nav className="hidden items-center gap-7 text-sm lg:flex" aria-label="Portfolio">
                    <a className="transition-opacity hover:opacity-55" href="#work">{copy.work}</a>
                    <a className="transition-opacity hover:opacity-55" href="#about">{copy.about}</a>
                    <a className="transition-opacity hover:opacity-55" href="#proof">{copy.proof}</a>
                    <a className="transition-opacity hover:opacity-55" href="#background">{copy.background}</a>
                </nav>
                {primaryContact ? <a href={contactHref(...primaryContact)} target={primaryContact[0] === "email" ? undefined : "_blank"} rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-[#151B13] px-5 text-sm font-medium text-[#F2F4D9] outline-none transition-transform duration-300 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#151B13] focus-visible:ring-offset-2">{copy.contact}</a> : <a href="#contact" className="inline-flex min-h-11 items-center rounded-full bg-[#151B13] px-5 text-sm font-medium text-[#F2F4D9]">{copy.contact}</a>}
            </motion.div>
        </header>
    );
}

function ProjectStrip({ projects, reduceMotion }: { projects: PortfolioProject[]; reduceMotion: boolean | null }) {
    if (!projects.length) return null;
    return (
        <div className="mx-auto mt-8 flex max-w-4xl snap-x gap-3 overflow-x-auto px-5 pb-2 sm:mt-12 sm:justify-center sm:overflow-visible sm:px-8">
            {projects.slice(0, 4).map((project, index) => (
                <motion.a
                    key={project.repo_name}
                    href={project.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`group block aspect-[4/5] w-32 shrink-0 snap-center overflow-hidden rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[#F2F4D9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2F362B] sm:w-40 ${index % 2 ? "sm:translate-y-4" : ""}`}
                    initial={{ opacity: 0, y: reduceMotion ? 0 : 34, rotate: reduceMotion ? 0 : index % 2 ? 2 : -2 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    transition={{ duration: reduceMotion ? 0.12 : 0.8, delay: reduceMotion ? 0 : 0.55 + index * 0.09, ease: EASE }}
                    whileHover={reduceMotion ? undefined : { y: -8, rotate: index % 2 ? -1 : 1 }}
                >
                    <ProjectVisual project={project} index={index} className="size-full transition-transform duration-700 group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none" />
                </motion.a>
            ))}
        </div>
    );
}

function Hero({ portfolio, apiBase, contacts, projects, copy, reduceMotion }: MaestroPortfolioProps & { projects: PortfolioProject[]; copy: Copy; reduceMotion: boolean | null }) {
    const heroRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
    const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", reduceMotion ? "0%" : "18%"]);
    const backgroundScale = useTransform(scrollYProgress, [0, 1], [1.04, reduceMotion ? 1.04 : 1.12]);
    const contentOpacity = useTransform(scrollYProgress, [0, 0.72], [1, reduceMotion ? 1 : 0]);
    const content = portfolio.content;
    const title = content.headline || content.name || "Developer building thoughtful digital products";
    return (
        <section ref={heroRef} id="top" className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#DFE5D7] text-[#151B13]">
            <motion.div aria-hidden="true" style={{ y: backgroundY, scale: backgroundScale }} className="absolute inset-0 origin-bottom bg-[radial-gradient(circle_at_18%_22%,#F2F4D9_0,transparent_35%),radial-gradient(circle_at_78%_18%,#B1C6C0_0,transparent_34%),linear-gradient(180deg,#D4DDC8_0%,#B1C6C0_58%,#687C77_100%)] motion-reduce:transform-none" />
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[36%] bg-[radial-gradient(80%_100%_at_50%_100%,#2F362B_0%,#485347_45%,transparent_46%),linear-gradient(180deg,transparent,#2F362B_95%)] opacity-95" />
            <MaestroNav name={content.name} contacts={contacts} copy={copy} />
            <motion.div style={{ opacity: contentOpacity }} className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-16 pt-28 text-center sm:px-8">
                <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.25, ease: EASE }} className="text-[11px] font-medium uppercase tracking-[0.18em]">{copy.selectedWork} · {projects.length || "01"}</motion.p>
                <h1 className="mt-5 max-w-6xl font-serif text-[clamp(3.7rem,8.7vw,8.5rem)] italic leading-[0.82] tracking-[-0.055em]">
                    <SplitDisplay reduceMotion={reduceMotion}>{title}</SplitDisplay>
                </h1>
                {content.bio ? <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: reduceMotion ? 0 : 0.58, ease: EASE }} className="mt-7 max-w-2xl text-sm leading-6 text-[#2F362B] sm:text-base sm:leading-7">{content.bio}</motion.p> : null}
                <motion.a initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduceMotion ? 0 : 0.9 }} href="#work" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#151B13] px-5 text-sm font-medium text-[#F2F4D9] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#151B13] focus-visible:ring-offset-2">{copy.work}<ArrowDown className="size-4" aria-hidden="true" /></motion.a>
            </motion.div>
            <div className="relative z-20 bg-[#2F362B] pb-8 pt-2 sm:pb-14"><ProjectStrip projects={projects} reduceMotion={reduceMotion} /></div>
        </section>
    );
}

function ChapterPanel({ project, index, count, progress, copy }: { project: PortfolioProject; index: number; count: number; progress: MotionValue<number>; copy: Copy }) {
    const center = (index + 0.5) / count;
    const half = 0.5 / count;
    const opacity = useTransform(progress, [Math.max(0, center - half * 1.45), Math.max(0.001, center - half * 0.45), Math.min(0.999, center + half * 0.45), Math.min(1, center + half * 1.45)], [0, 1, 1, 0]);
    const y = useTransform(progress, [Math.max(0, center - half), center, Math.min(1, center + half)], [46, 0, -46]);
    const scale = useTransform(progress, [Math.max(0, center - half), center, Math.min(1, center + half)], [0.94, 1, 0.96]);
    const palette = getMaestroProjectPalette(index);
    return (
        <motion.article style={{ opacity, y, scale, zIndex: count - index }} className="pointer-events-none absolute inset-0 grid items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(420px,1.15fr)]">
            <div className="pointer-events-auto max-w-xl">
                <p className="text-xs uppercase tracking-[0.18em] text-[#687C77]">{String(index + 1).padStart(3, "0")} / {String(count).padStart(3, "0")}</p>
                <h3 className="mt-5 font-serif text-[clamp(3rem,5vw,6rem)] italic leading-[0.86] tracking-[-0.05em]" style={MAESTRO_PROJECT_TITLE_WRAP}>{project.repo_name}</h3>
                <p className="mt-7 max-w-lg text-sm leading-7 text-[#485347] sm:text-base">{project.description}</p>
                <div className="mt-7 flex flex-wrap gap-2">{getMaestroMetaItems(project).map((item) => <span key={item} className="rounded-full border border-[#151B13]/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.12em]">{item}</span>)}</div>
                <a href={project.url} target="_blank" rel="noreferrer" className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#151B13] px-5 text-sm font-medium text-[#F2F4D9] outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#151B13] focus-visible:ring-offset-2">{copy.visitProject}<ArrowUpRight className="size-4" aria-hidden="true" /></a>
            </div>
            <ProjectVisual project={project} index={index} className="aspect-[4/3] w-full rounded-[28px] shadow-[0_30px_80px_rgba(21,27,19,0.2)]" />
            <span aria-hidden="true" className="absolute bottom-0 right-0 size-24 rounded-full blur-3xl" style={{ backgroundColor: palette.accent }} />
        </motion.article>
    );
}

function ProjectChapters({ projects, copy, reduceMotion }: { projects: PortfolioProject[]; copy: Copy; reduceMotion: boolean | null }) {
    const sectionRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
    if (!projects.length) return null;
    if (reduceMotion) {
        return (
            <section id="work" className="bg-[#DFE5D7] px-5 py-20 text-[#151B13] sm:px-8">
                <div className="mx-auto max-w-[1180px]"><p className="text-xs uppercase tracking-[0.18em] text-[#687C77]">{copy.selectedWork}</p><h2 className="mt-4 max-w-4xl font-serif text-5xl italic leading-[0.92] sm:text-7xl">{copy.projectStory}</h2><p className="mt-5 max-w-2xl leading-7 text-[#485347]">{copy.projectStoryBody}</p><div className="mt-12 grid gap-12">{projects.map((project, index) => <article key={project.repo_name} className="grid gap-6 border-t border-[#151B13]/20 pt-8 md:grid-cols-2"><div><p className="text-xs text-[#687C77]">{String(index + 1).padStart(3, "0")}</p><h3 className="mt-3 font-serif text-4xl italic" style={MAESTRO_PROJECT_TITLE_WRAP}>{project.repo_name}</h3><p className="mt-4 leading-7 text-[#485347]">{project.description}</p><a className="mt-5 inline-flex min-h-11 items-center gap-2 font-medium underline underline-offset-4" href={project.url} target="_blank" rel="noreferrer">{copy.visitProject}<ArrowUpRight className="size-4" /></a></div><ProjectVisual project={project} index={index} className="aspect-[4/3] rounded-[24px]" /></article>)}</div></div>
            </section>
        );
    }
    return (
        <section ref={sectionRef} id="work" className="relative bg-[#DFE5D7] text-[#151B13]" style={{ height: `${Math.max(2, projects.length) * 95}vh` }}>
            <div className="sticky top-0 hidden min-h-screen overflow-hidden px-8 py-20 lg:block">
                <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-[1180px] flex-col">
                    <div><p className="text-xs uppercase tracking-[0.18em] text-[#687C77]">{copy.selectedWork}</p><h2 className="mt-3 font-serif text-4xl italic tracking-[-0.04em]">{copy.projectStory}</h2></div>
                    <div className="relative mt-6 flex-1">{projects.map((project, index) => <ChapterPanel key={project.repo_name} project={project} index={index} count={projects.length} progress={scrollYProgress} copy={copy} />)}</div>
                </div>
            </div>
            <div className="px-5 py-20 lg:hidden"><div className="mx-auto max-w-3xl"><p className="text-xs uppercase tracking-[0.18em] text-[#687C77]">{copy.selectedWork}</p><h2 className="mt-4 font-serif text-5xl italic leading-[0.9]">{copy.projectStory}</h2><div className="mt-10 space-y-14">{projects.map((project, index) => <motion.article key={project.repo_name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-10%" }} transition={{ duration: 0.7, ease: EASE }}><ProjectVisual project={project} index={index} className="aspect-[4/3] rounded-[22px]" /><p className="mt-5 text-xs text-[#687C77]">{String(index + 1).padStart(3, "0")}</p><h3 className="mt-2 font-serif text-4xl italic" style={MAESTRO_PROJECT_TITLE_WRAP}>{project.repo_name}</h3><p className="mt-4 leading-7 text-[#485347]">{project.description}</p><a className="mt-5 inline-flex min-h-11 items-center gap-2 font-medium underline underline-offset-4" href={project.url} target="_blank" rel="noreferrer">{copy.visitProject}<ArrowUpRight className="size-4" /></a></motion.article>)}</div></div></div>
        </section>
    );
}

function AboutSection({ portfolio, apiBase, copy, reduceMotion }: Pick<MaestroPortfolioProps, "portfolio" | "apiBase"> & { copy: Copy; reduceMotion: boolean | null }) {
    const content = portfolio.content;
    const primaryExperience = content.experience?.[0];
    return (
        <section id="about" className="bg-[#F2F4D9] px-5 py-24 text-[#151B13] sm:px-8 lg:py-36">
            <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)] lg:items-center">
                <motion.div initial={{ opacity: 0, y: reduceMotion ? 0 : 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: reduceMotion ? 0.12 : 0.9, ease: EASE }} className="relative mx-auto w-full max-w-md lg:mx-0"><div aria-hidden="true" className="absolute -inset-4 -rotate-3 rounded-[32px] border border-[#151B13]/20" /><MaestroPhoto portfolio={portfolio} apiBase={apiBase} className="relative aspect-[4/5] w-full rounded-[28px] object-cover grayscale-[12%]" /></motion.div>
                <motion.div initial={{ opacity: 0, y: reduceMotion ? 0 : 34 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: reduceMotion ? 0.12 : 0.9, delay: reduceMotion ? 0 : 0.08, ease: EASE }}><p className="text-xs uppercase tracking-[0.18em] text-[#687C77]">{copy.aboutEyebrow}</p><h2 className="mt-5 max-w-3xl font-serif text-[clamp(3.3rem,6vw,7rem)] italic leading-[0.86] tracking-[-0.05em]">{copy.aboutTitle}</h2>{content.bio ? <p className="mt-8 max-w-2xl text-base leading-8 text-[#485347] sm:text-lg">{content.bio}</p> : null}{primaryExperience ? <div className="mt-9 border-t border-[#151B13]/20 pt-6"><p className="text-xs uppercase tracking-[0.15em] text-[#687C77]">{copy.experience}</p><p className="mt-2 text-lg">{primaryExperience.role} · {primaryExperience.company}</p></div> : null}</motion.div>
            </div>
        </section>
    );
}

function ProjectGallery({ projects, copy, reduceMotion }: { projects: PortfolioProject[]; copy: Copy; reduceMotion: boolean | null }) {
    if (!projects.length) return null;
    return (
        <section className="overflow-hidden bg-[#2F362B] py-24 text-[#F2F4D9] lg:py-32">
            <div className="mx-auto max-w-[1280px] px-5 sm:px-8"><p className="text-xs uppercase tracking-[0.18em] text-[#B1C6C0]">Gallery</p><h2 className="mt-4 max-w-5xl font-serif text-[clamp(3.4rem,7vw,7.5rem)] italic leading-[0.84] tracking-[-0.05em]">{copy.galleryTitle}</h2></div>
            <div className="mt-12 flex snap-x gap-5 overflow-x-auto px-[max(1.25rem,calc((100vw-1280px)/2))] pb-5 sm:gap-7">
                {projects.map((project, index) => <motion.a key={project.repo_name} href={project.url} target="_blank" rel="noreferrer" initial={{ opacity: 0, x: reduceMotion ? 0 : 48 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-10%" }} transition={{ duration: reduceMotion ? 0.12 : 0.75, delay: reduceMotion ? 0 : index * 0.05, ease: EASE }} className="group w-[82vw] max-w-[520px] shrink-0 snap-center outline-none focus-visible:ring-2 focus-visible:ring-[#F2F4D9] focus-visible:ring-offset-4 focus-visible:ring-offset-[#2F362B]"><ProjectVisual project={project} index={index} className="aspect-[4/3] rounded-[24px] transition-transform duration-700 group-hover:scale-[0.985] motion-reduce:transform-none motion-reduce:transition-none" /><div className="mt-5 flex items-start justify-between gap-5"><div><p className="text-xs text-[#B1C6C0]">{String(index + 1).padStart(3, "0")}</p><h3 className="mt-2 font-serif text-3xl italic" style={MAESTRO_PROJECT_TITLE_WRAP}>{project.repo_name}</h3></div><ArrowUpRight className="mt-2 size-5 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1 motion-reduce:transform-none" /></div></motion.a>)}
            </div>
        </section>
    );
}

function StackProjectCard({ project, index, count, progress, reduceMotion }: { project: PortfolioProject; index: number; count: number; progress: MotionValue<number>; reduceMotion: boolean | null }) {
    const resting = getMaestroCardTransform(index, Math.floor((count - 1) / 2), reduceMotion);
    const spread = (index - (count - 1) / 2) * 88;
    const x = useTransform(progress, [0, 0.45, 1], [reduceMotion ? 0 : 0, resting.x, reduceMotion ? 0 : spread]);
    const y = useTransform(progress, [0, 0.5, 1], [reduceMotion ? 0 : 72 + index * 8, resting.y, reduceMotion ? 0 : (index % 2 ? 32 : -24)]);
    const rotate = useTransform(progress, [0, 0.5, 1], [reduceMotion ? 0 : 0, resting.rotate, reduceMotion ? 0 : spread / 15]);
    const scale = useTransform(progress, [0, 0.5, 1], [reduceMotion ? 1 : 0.72, resting.scale, reduceMotion ? 1 : 0.92]);
    return (
        <motion.a href={project.url} target="_blank" rel="noreferrer" style={{ x, y, rotate, scale, zIndex: count - Math.abs(index - Math.floor(count / 2)) }} className="absolute left-1/2 top-1/2 aspect-[4/5] w-[210px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[20px] border border-[#F2F4D9]/20 bg-[#151B13] shadow-[0_30px_80px_rgba(0,0,0,0.42)] outline-none focus-visible:ring-2 focus-visible:ring-[#F2F4D9] motion-reduce:relative motion-reduce:left-auto motion-reduce:top-auto motion-reduce:translate-x-0 motion-reduce:translate-y-0"><ProjectVisual project={project} index={index} className="h-[62%] w-full rounded-none" /><div className="p-4"><p className="font-serif text-xl italic" style={MAESTRO_PROJECT_TITLE_WRAP}>{project.repo_name}</p><p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-[#B1C6C0]">{getMaestroMetaItems(project).slice(-2).join(" · ")}</p></div></motion.a>
    );
}

function ProofStack({ portfolio, projects, copy, reduceMotion }: Pick<MaestroPortfolioProps, "portfolio"> & { projects: PortfolioProject[]; copy: Copy; reduceMotion: boolean | null }) {
    const sectionRef = useRef<HTMLElement>(null);
    const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
    const showSkills = portfolio.content.sections?.skills !== false && ((portfolio.content.skills?.length ?? 0) > 0 || portfolio.verified_skills.length > 0);
    if (!showSkills && !projects.length) return null;
    return (
        <section ref={sectionRef} id="proof" className="relative bg-[#151B13] text-[#F2F4D9] lg:min-h-[260vh]">
            <div className="px-5 py-24 sm:px-8 lg:sticky lg:top-0 lg:flex lg:min-h-screen lg:items-center lg:overflow-hidden lg:py-20">
                <div className="mx-auto grid w-full max-w-[1180px] gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.9fr)] lg:items-center">
                    <div><p className="text-xs uppercase tracking-[0.18em] text-[#829791]">GitHub · Evidence</p><h2 className="mt-5 max-w-3xl font-serif text-[clamp(3.5rem,7vw,8rem)] italic leading-[0.82] tracking-[-0.055em]">{copy.proofTitle}</h2>{showSkills ? <div className="mt-10"><p className="text-[11px] uppercase tracking-[0.16em] text-[#829791]">Verified from GitHub</p><div className="mt-4 flex flex-wrap gap-2">{portfolio.verified_skills.map((item) => <span key={item.skill} title={item.evidence ? `${item.evidence.own_commits ?? 0} commits · ${item.evidence.repos ?? 0} repo` : undefined} className="inline-flex items-center gap-1.5 rounded-full border border-[#B1C6C0]/35 bg-[#B1C6C0]/10 px-3 py-2 text-xs"><Check className="size-3" aria-hidden="true" />{item.skill}{item.level ? ` · ${item.level}` : ""}</span>)}</div><div className="mt-4 flex flex-wrap gap-2">{portfolio.content.skills.filter((skill) => !portfolio.verified_skills.some((verified) => verified.skill.toLowerCase() === skill.toLowerCase())).map((skill) => <span key={skill} className="rounded-full border border-[#F2F4D9]/15 px-3 py-2 text-xs text-[#D4DDC8]">{skill}</span>)}</div></div> : null}</div>
                    {projects.length ? <div className={`relative ${reduceMotion ? "grid grid-cols-2 gap-3" : "h-[520px]"}`}>{projects.slice(0, 5).map((project, index) => <StackProjectCard key={project.repo_name} project={project} index={index} count={Math.min(projects.length, 5)} progress={scrollYProgress} reduceMotion={reduceMotion} />)}</div> : null}
                </div>
            </div>
        </section>
    );
}

function BackgroundSection({ portfolio, copy, reduceMotion }: Pick<MaestroPortfolioProps, "portfolio"> & { copy: Copy; reduceMotion: boolean | null }) {
    const { content } = portfolio;
    const experience = content.sections?.experience !== false ? content.experience ?? [] : [];
    const education = content.sections?.education !== false ? content.education ?? [] : [];
    const certifications = content.sections?.certifications !== false ? content.certifications ?? [] : [];
    if (!experience.length && !education.length && !certifications.length) return null;
    return (
        <section id="background" className="bg-[#DFE5D7] px-5 py-24 text-[#151B13] sm:px-8 lg:py-36">
            <div className="mx-auto max-w-[1180px]"><p className="text-xs uppercase tracking-[0.18em] text-[#687C77]">{copy.background}</p><div className="mt-6 grid gap-16 lg:grid-cols-[0.9fr_1.1fr]">
                <h2 className="max-w-2xl font-serif text-[clamp(3.5rem,7vw,7.5rem)] italic leading-[0.84] tracking-[-0.05em]">{content.name || "Developer"}</h2>
                <div className="space-y-14">
                    {experience.length ? <div><h3 className="border-b border-[#151B13]/20 pb-4 text-xs uppercase tracking-[0.18em] text-[#687C77]">{copy.experience}</h3><div>{experience.map((item, index) => <motion.article key={`${item.company}-${index}`} initial={{ opacity: 0, y: reduceMotion ? 0 : 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: reduceMotion ? 0.12 : 0.7, ease: EASE }} className="grid gap-3 border-b border-[#151B13]/15 py-6 sm:grid-cols-[120px_minmax(0,1fr)]"><p className="text-xs text-[#687C77]">{item.period || "—"}</p><div><h4 className="font-serif text-2xl italic">{item.role}</h4><p className="mt-1 text-sm text-[#485347]">{[item.company, item.location].filter(Boolean).join(" · ")}</p>{item.bullets?.length ? <ul className="mt-3 space-y-2 text-sm leading-6 text-[#485347]">{item.bullets.map((bullet) => <li key={bullet}>— {bullet}</li>)}</ul> : null}</div></motion.article>)}</div></div> : null}
                    {education.length ? <div><h3 className="border-b border-[#151B13]/20 pb-4 text-xs uppercase tracking-[0.18em] text-[#687C77]">{copy.education}</h3>{education.map((item, index) => <article key={`${item.institution}-${index}`} className="border-b border-[#151B13]/15 py-5"><h4 className="font-serif text-2xl italic">{item.institution}</h4><p className="mt-1 text-sm text-[#485347]">{[item.degree, item.major, item.period].filter(Boolean).join(" · ")}</p></article>)}</div> : null}
                    {certifications.length ? <div><h3 className="border-b border-[#151B13]/20 pb-4 text-xs uppercase tracking-[0.18em] text-[#687C77]">{copy.certifications}</h3><ul className="divide-y divide-[#151B13]/15">{certifications.map((item) => <li className="py-4 font-serif text-xl italic" key={item}>{item}</li>)}</ul></div> : null}
                </div>
            </div></div>
        </section>
    );
}

function ContactSection({ portfolio, contacts, copy, reduceMotion }: Pick<MaestroPortfolioProps, "portfolio" | "contacts"> & { copy: Copy; reduceMotion: boolean | null }) {
    return (
        <section id="contact" className="bg-[#F2F4D9] px-5 py-24 text-[#151B13] sm:px-8 lg:py-36">
            <motion.div initial={{ opacity: 0, y: reduceMotion ? 0 : 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: reduceMotion ? 0.12 : 0.9, ease: EASE }} className="mx-auto max-w-[1180px] text-center"><Sparkles className="mx-auto size-6" aria-hidden="true" /><h2 className="mx-auto mt-7 max-w-5xl font-serif text-[clamp(3.6rem,8vw,8.5rem)] italic leading-[0.82] tracking-[-0.055em]">{copy.contactTitle}</h2><p className="mx-auto mt-8 max-w-xl leading-7 text-[#485347]">{copy.contactBody}</p>{contacts.length ? <div className="mt-10 flex flex-wrap justify-center gap-3">{contacts.map(([key, value]) => <a key={key} href={contactHref(key, value)} target={key === "email" ? undefined : "_blank"} rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#151B13] px-5 text-sm font-medium capitalize outline-none transition-colors hover:bg-[#151B13] hover:text-[#F2F4D9] focus-visible:ring-2 focus-visible:ring-[#151B13] focus-visible:ring-offset-2">{key === "email" ? <Mail className="size-4" aria-hidden="true" /> : key === "github" ? <Github className="size-4" aria-hidden="true" /> : <ArrowUpRight className="size-4" aria-hidden="true" />}{key}</a>)}</div> : null}</motion.div>
            <footer className="mx-auto mt-24 flex max-w-[1180px] flex-wrap items-center justify-between gap-4 border-t border-[#151B13]/20 pt-6 text-[10px] uppercase tracking-[0.14em] text-[#687C77]"><span>© {new Date().getFullYear()} {portfolio.content.name || "Portfolio"}</span><span>Created with <strong className="text-[#151B13]">GitHire</strong></span><a className="inline-flex items-center gap-1 hover:text-[#151B13]" href="#top">Top <ArrowDown className="size-3 rotate-180" aria-hidden="true" /></a></footer>
        </section>
    );
}

export function MaestroPortfolio({ portfolio, apiBase, contacts }: MaestroPortfolioProps) {
    const reduceMotion = useReducedMotion();
    const content = portfolio.content;
    const copy = getCopy(content.language);
    const projects = content.sections?.projects === false ? [] : getMaestroProjects(content.projects ?? []);
    return (
        <main lang={content.language} className="min-h-screen overflow-clip bg-[#F2F4D9] font-sans text-[#151B13] selection:bg-[#151B13] selection:text-[#F2F4D9]">
            <Hero portfolio={portfolio} apiBase={apiBase} contacts={contacts} projects={projects} copy={copy} reduceMotion={reduceMotion} />
            <ProjectChapters projects={projects} copy={copy} reduceMotion={reduceMotion} />
            <AboutSection portfolio={portfolio} apiBase={apiBase} copy={copy} reduceMotion={reduceMotion} />
            <ProjectGallery projects={projects} copy={copy} reduceMotion={reduceMotion} />
            <ProofStack portfolio={portfolio} projects={projects} copy={copy} reduceMotion={reduceMotion} />
            <BackgroundSection portfolio={portfolio} copy={copy} reduceMotion={reduceMotion} />
            <ContactSection portfolio={portfolio} contacts={contacts} copy={copy} reduceMotion={reduceMotion} />
        </main>
    );
}
