import { getPublicThemePlan } from "./public-portfolio-theme";
import type { PublicPortfolio, PublicPortfolioContent } from "./types";

type SectionKey = keyof PublicPortfolioContent["sections"];
type LayoutProps = {
    portfolio: PublicPortfolio;
    apiBase: string;
    contacts: Array<[string, string]>;
    sectionEnabled: (key: SectionKey) => boolean;
};

function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "GH";
}

function contactHref(key: string, value: string) {
    if (key === "email") return `mailto:${value}`;
    if (key === "whatsapp") return `https://wa.me/${value.replace(/\D/g, "")}`;
    return value;
}

function Photo({ portfolio, apiBase, imageClass, fallbackClass }: Pick<LayoutProps, "portfolio" | "apiBase"> & { imageClass: string; fallbackClass: string }) {
    const name = portfolio.content.name || "Portfolio";
    if (portfolio.has_photo) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${apiBase}/portfolios/${portfolio.public_id}/photo`} alt={`Foto ${name}`} className={imageClass} />
        );
    }
    return <div className={fallbackClass}>{initials(name)}</div>;
}

function Contacts({ contacts, wrapClass, linkClass }: Pick<LayoutProps, "contacts"> & { wrapClass: string; linkClass: string }) {
    if (!contacts.length) return null;
    return <div className={wrapClass}>{contacts.map(([key, value]) => <a key={key} href={contactHref(key, value)} target={key === "email" ? undefined : "_blank"} rel="noreferrer" className={linkClass}>{key} <span aria-hidden="true">↗</span></a>)}</div>;
}

function SkillCloud({ portfolio, verifiedClass, skillClass, labelClass }: Pick<LayoutProps, "portfolio"> & { verifiedClass: string; skillClass: string; labelClass: string }) {
    const skills = portfolio.content.skills ?? [];
    return (
        <div>
            {portfolio.verified_skills.length > 0 && <div><p className={labelClass}>Verified from GitHub</p><div className="mt-3 flex flex-wrap gap-2">{portfolio.verified_skills.map((item) => <span key={item.skill} title={item.evidence ? `${item.evidence.own_commits ?? 0} commits · ${item.evidence.repos ?? 0} repo` : undefined} className={verifiedClass}>✓ {item.skill}{item.level ? ` · ${item.level}` : ""}</span>)}</div></div>}
            {skills.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{skills.map((skill) => <span key={skill} className={skillClass}>{skill}</span>)}</div>}
        </div>
    );
}

function Footer({ portfolio, className, brandClass }: Pick<LayoutProps, "portfolio"> & { className: string; brandClass: string }) {
    return <footer className={className}><span>© {new Date().getFullYear()} {portfolio.content.name || "Portfolio"}</span><span>Created with <strong className={brandClass}>GitHire</strong></span></footer>;
}

function EditorialLayout({ portfolio, apiBase, contacts, sectionEnabled }: LayoutProps) {
    const content = portfolio.content;
    const projects = content.projects ?? [];
    const experience = content.experience ?? [];
    const education = content.education ?? [];
    const certifications = content.certifications ?? [];
    const showSkills = sectionEnabled("skills") && (content.skills.length > 0 || portfolio.verified_skills.length > 0);

    return (
        <main lang={content.language} className="min-h-screen bg-[#F8F3EA] text-[#1E1B18]">
            <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-10">
                <header className="flex items-center justify-between border-b border-[#1E1B18]/25 pb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[#6B6259]"><span>Portfolio / field notes</span><span>{content.name || "GitHire candidate"}</span></header>
                <section className="grid gap-8 border-b border-[#1E1B18]/25 py-12 md:grid-cols-[minmax(0,1fr)_160px] md:py-20">
                    <div className="max-w-4xl"><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#B45309]">Hello, I&apos;m {content.name || "a candidate"}</p><h1 className="mt-5 font-heading text-5xl font-semibold leading-[0.92] tracking-[-0.055em] sm:text-7xl">{content.headline || "A portfolio of considered work."}</h1>{content.bio && <p className="mt-8 max-w-2xl text-base leading-8 text-[#655E55] sm:text-lg">{content.bio}</p>}<Contacts contacts={contacts} wrapClass="mt-7 flex flex-wrap gap-x-5 gap-y-2" linkClass="text-sm font-semibold capitalize text-[#7C3AED] underline-offset-4 hover:underline" /></div>
                    <Photo portfolio={portfolio} apiBase={apiBase} imageClass="aspect-[4/5] w-28 border border-[#1E1B18]/20 object-cover md:w-40" fallbackClass="flex aspect-[4/5] w-28 items-center justify-center border border-[#1E1B18]/20 bg-[#E8DDCC] font-heading text-4xl font-semibold text-[#7C3AED] md:w-40" />
                </section>

                {sectionEnabled("projects") && projects.length > 0 && <section className="border-b border-[#1E1B18]/25 py-12"><div className="flex items-end justify-between gap-4"><div><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#B45309]">Selected work</p><h2 className="mt-2 font-heading text-3xl font-semibold tracking-[-0.04em]">What I&apos;ve made</h2></div><span className="font-mono text-xs text-[#6B6259]">{projects.length} projects</span></div><div className="mt-8 divide-y divide-[#1E1B18]/20 border-y border-[#1E1B18]/20">{projects.map((project, index) => <a key={project.repo_name} href={project.url} target="_blank" rel="noreferrer" className="group grid gap-4 py-7 sm:grid-cols-[64px_minmax(0,1fr)_180px] sm:items-start"><span className="font-mono text-xs text-[#B45309]">0{index + 1}</span><div><h3 className="font-heading text-2xl font-semibold tracking-[-0.03em] group-hover:text-[#7C3AED]">{project.repo_name}</h3><p className="mt-3 max-w-2xl text-sm leading-6 text-[#655E55]">{project.description}</p></div><div className="font-mono text-[11px] leading-5 text-[#6B6259]"><p>{project.tech_stack.join(" · ")}</p><p className="mt-2 text-[#7C3AED]">★ {project.stars} · {project.own_commits} commits ↗</p></div></a>)}</div></section>}

                <div className="grid gap-12 py-12 lg:grid-cols-[minmax(0,1.6fr)_minmax(220px,0.7fr)]">
                    <div className="space-y-12">
                        {sectionEnabled("experience") && experience.length > 0 && <section><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#B45309]">Chronology</p><h2 className="mt-2 font-heading text-3xl font-semibold tracking-[-0.04em]">Experience</h2><div className="mt-6 divide-y divide-[#1E1B18]/15">{experience.map((item, index) => <article key={`${item.company}-${index}`} className="grid gap-2 py-5 first:pt-0 sm:grid-cols-[120px_minmax(0,1fr)]"><p className="font-mono text-xs text-[#6B6259]">{item.period || "—"}</p><div><h3 className="font-semibold">{item.role}</h3><p className="mt-1 text-sm text-[#655E55]">{[item.company, item.location].filter(Boolean).join(" · ")}</p>{item.bullets?.length ? <ul className="mt-3 list-disc space-y-1 pl-4 text-sm leading-6 text-[#655E55]">{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}</div></article>)}</div></section>}
                        {sectionEnabled("education") && education.length > 0 && <section><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#B45309]">Foundation</p><h2 className="mt-2 font-heading text-3xl font-semibold tracking-[-0.04em]">Education</h2><div className="mt-6 space-y-5">{education.map((item, index) => <article key={`${item.institution}-${index}`}><h3 className="font-semibold">{item.institution}</h3><p className="mt-1 text-sm text-[#655E55]">{[item.degree, item.major, item.period].filter(Boolean).join(" · ")}</p></article>)}</div></section>}
                    </div>
                    <aside className="space-y-10 border-t border-[#1E1B18]/25 pt-8 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">{showSkills && <section><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#B45309]">Tools of the work</p><div className="mt-4"><SkillCloud portfolio={portfolio} labelClass="font-mono text-[10px] uppercase tracking-wider text-[#6B6259]" verifiedClass="border border-[#7C3AED]/35 px-2.5 py-1 text-xs font-semibold text-[#7C3AED]" skillClass="border border-[#1E1B18]/20 px-2.5 py-1 text-xs text-[#655E55]" /></div></section>}{sectionEnabled("certifications") && certifications.length > 0 && <section><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#B45309]">Credentials</p><ul className="mt-4 space-y-3 text-sm text-[#655E55]">{certifications.map((item) => <li key={item}>{item}</li>)}</ul></section>}</aside>
                </div>
                <Footer portfolio={portfolio} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#1E1B18]/25 py-6 font-mono text-[10px] uppercase tracking-wider text-[#6B6259]" brandClass="text-[#7C3AED]" />
            </div>
        </main>
    );
}

function DeveloperLayout({ portfolio, apiBase, contacts, sectionEnabled }: LayoutProps) {
    const content = portfolio.content;
    const projects = content.projects ?? [];
    const experience = content.experience ?? [];
    const education = content.education ?? [];
    const certifications = content.certifications ?? [];
    const showSkills = sectionEnabled("skills") && (content.skills.length > 0 || portfolio.verified_skills.length > 0);

    return (
        <main lang={content.language} className="min-h-screen bg-[#0B1020] font-mono text-[#CBD5E1]">
            <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-10">
                <header className="flex items-center justify-between border-b border-[#CBD5E1]/15 pb-4 text-[10px] uppercase tracking-[0.16em] text-[#94A3B8]"><span><span className="text-[#34D399]">●</span> githire / portfolio</span><span>public build</span></header>
                <section className="grid gap-8 border-b border-[#CBD5E1]/15 py-10 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:py-16"><Photo portfolio={portfolio} apiBase={apiBase} imageClass="size-20 border border-[#A78BFA]/45 object-cover" fallbackClass="flex size-20 items-center justify-center border border-[#A78BFA]/45 bg-[#121A2B] text-2xl font-bold text-[#A78BFA]" /><div><p className="text-xs text-[#34D399]"><span className="text-[#A78BFA]">$</span> whoami</p><h1 className="mt-4 max-w-5xl text-4xl font-bold leading-[0.95] tracking-[-0.05em] text-white sm:text-6xl">{content.headline || content.name || "Developer portfolio"}</h1>{content.bio && <p className="mt-6 max-w-3xl font-sans text-base leading-7 text-[#94A3B8]">{content.bio}</p>}<Contacts contacts={contacts} wrapClass="mt-7 flex flex-wrap gap-x-5 gap-y-2" linkClass="text-xs font-semibold uppercase tracking-wide text-[#A78BFA] hover:text-[#34D399]" /></div></section>

                {sectionEnabled("projects") && projects.length > 0 && <section className="border-b border-[#CBD5E1]/15 py-10"><div className="flex items-end justify-between"><div><p className="text-[11px] uppercase tracking-[0.18em] text-[#34D399]">./selected-work</p><h2 className="mt-2 text-2xl font-bold text-white">Proof of work</h2></div><span className="text-xs text-[#64748B]">{projects.length} repositories</span></div><div className="mt-6 grid gap-3 lg:grid-cols-3">{projects.map((project) => <a key={project.repo_name} href={project.url} target="_blank" rel="noreferrer" className="group border border-[#CBD5E1]/15 bg-[#121A2B] p-5 transition-colors duration-200 hover:border-[#A78BFA]/70 motion-reduce:transition-none"><p className="text-[10px] text-[#34D399]">repo / {project.repo_name}</p><h3 className="mt-5 text-lg font-bold text-white group-hover:text-[#A78BFA]">{project.repo_name}</h3><p className="mt-3 min-h-16 font-sans text-sm leading-6 text-[#94A3B8]">{project.description}</p><div className="mt-6 flex items-end justify-between gap-3 border-t border-[#CBD5E1]/10 pt-3 text-[10px] text-[#94A3B8]"><span className="max-w-[65%] truncate">{project.tech_stack.join(" / ")}</span><span className="shrink-0 text-[#34D399]">★ {project.stars} · {project.own_commits}</span></div></a>)}</div></section>}
                {showSkills && <section className="border-b border-[#CBD5E1]/15 py-10"><p className="text-[11px] uppercase tracking-[0.18em] text-[#34D399]">./toolchain</p><div className="mt-5"><SkillCloud portfolio={portfolio} labelClass="text-[10px] uppercase tracking-wider text-[#64748B]" verifiedClass="border border-[#34D399]/35 bg-[#34D399]/5 px-2.5 py-1 text-xs font-semibold text-[#34D399]" skillClass="border border-[#CBD5E1]/20 px-2.5 py-1 text-xs text-[#CBD5E1]" /></div></section>}
                <div className="grid gap-10 py-10 lg:grid-cols-2">
                    {sectionEnabled("experience") && experience.length > 0 && <section><p className="text-[11px] uppercase tracking-[0.18em] text-[#34D399]">./career-log</p><h2 className="mt-2 text-2xl font-bold text-white">Experience</h2><div className="mt-5 divide-y divide-[#CBD5E1]/15 border-y border-[#CBD5E1]/15">{experience.map((item, index) => <article key={`${item.company}-${index}`} className="py-5"><p className="text-[10px] text-[#64748B]">{item.period || "—"}</p><h3 className="mt-2 text-sm font-bold text-white">{item.role}</h3><p className="mt-1 font-sans text-sm text-[#94A3B8]">{[item.company, item.location].filter(Boolean).join(" · ")}</p>{item.bullets?.length ? <ul className="mt-3 list-disc space-y-1 pl-4 font-sans text-sm leading-6 text-[#94A3B8]">{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}</article>)}</div></section>}
                    <div className="space-y-10">{sectionEnabled("education") && education.length > 0 && <section><p className="text-[11px] uppercase tracking-[0.18em] text-[#34D399]">./education</p><div className="mt-5 space-y-5">{education.map((item, index) => <article key={`${item.institution}-${index}`}><h3 className="text-sm font-bold text-white">{item.institution}</h3><p className="mt-1 font-sans text-sm text-[#94A3B8]">{[item.degree, item.major, item.period].filter(Boolean).join(" · ")}</p></article>)}</div></section>}{sectionEnabled("certifications") && certifications.length > 0 && <section><p className="text-[11px] uppercase tracking-[0.18em] text-[#34D399]">./credentials</p><ul className="mt-5 space-y-2 font-sans text-sm text-[#94A3B8]">{certifications.map((item) => <li key={item}>— {item}</li>)}</ul></section>}</div>
                </div>
                <Footer portfolio={portfolio} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#CBD5E1]/15 py-6 text-[10px] uppercase tracking-wider text-[#64748B]" brandClass="text-[#A78BFA]" />
            </div>
        </main>
    );
}

function ProfessionalLayout({ portfolio, apiBase, contacts, sectionEnabled }: LayoutProps) {
    const content = portfolio.content;
    const projects = content.projects ?? [];
    const experience = content.experience ?? [];
    const education = content.education ?? [];
    const certifications = content.certifications ?? [];
    const showSkills = sectionEnabled("skills") && (content.skills.length > 0 || portfolio.verified_skills.length > 0);

    return (
        <main lang={content.language} className="min-h-screen bg-[#F8FAFC] text-[#132238]">
            <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 sm:py-10">
                <header className="flex items-center justify-between border-b border-[#D8E0EA] pb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[#64748B]"><span>Professional profile</span><span>GitHire</span></header>
                <div className="grid gap-10 py-10 lg:grid-cols-[250px_minmax(0,1fr)] lg:py-14">
                    <aside className="border-b border-[#D8E0EA] pb-8 lg:border-b-0 lg:border-r lg:pr-8"><Photo portfolio={portfolio} apiBase={apiBase} imageClass="size-20 rounded-full border border-[#D8E0EA] object-cover" fallbackClass="flex size-20 items-center justify-center rounded-full bg-[#2563EB] text-2xl font-bold text-white" /><h2 className="mt-5 text-xl font-bold tracking-tight">{content.name || "Portfolio"}</h2><p className="mt-1 text-sm leading-6 text-[#64748B]">{content.headline || "Professional profile"}</p><Contacts contacts={contacts} wrapClass="mt-5 grid gap-2" linkClass="text-xs font-semibold capitalize text-[#2563EB] hover:underline" />{sectionEnabled("education") && education.length > 0 && <section className="mt-8 border-t border-[#D8E0EA] pt-6"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#64748B]">Education</p><div className="mt-4 space-y-4">{education.map((item, index) => <article key={`${item.institution}-${index}`}><h3 className="text-sm font-bold">{item.institution}</h3><p className="mt-1 text-xs leading-5 text-[#64748B]">{[item.degree, item.major, item.period].filter(Boolean).join(" · ")}</p></article>)}</div></section>}</aside>
                    <div><section className="border-b border-[#D8E0EA] pb-9"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#2563EB]">Candidate summary</p><h1 className="mt-3 max-w-3xl text-4xl font-bold leading-[1.02] tracking-[-0.045em] sm:text-5xl">{content.headline || content.name || "Professional profile"}</h1>{content.bio && <p className="mt-6 max-w-3xl text-base leading-7 text-[#64748B]">{content.bio}</p>}</section>{sectionEnabled("experience") && experience.length > 0 && <section className="border-b border-[#D8E0EA] py-9"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Experience</h2><span className="font-mono text-[10px] uppercase tracking-wide text-[#64748B]">Chronology</span></div><div className="mt-5 divide-y divide-[#D8E0EA]">{experience.map((item, index) => <article key={`${item.company}-${index}`} className="grid gap-3 py-5 first:pt-0 sm:grid-cols-[130px_minmax(0,1fr)]"><p className="font-mono text-xs text-[#64748B]">{item.period || "—"}</p><div><h3 className="font-bold">{item.role}</h3><p className="mt-1 text-sm text-[#64748B]">{[item.company, item.location].filter(Boolean).join(" · ")}</p>{item.bullets?.length ? <ul className="mt-3 list-disc space-y-1 pl-4 text-sm leading-6 text-[#64748B]">{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}</div></article>)}</div></section>}</div>
                </div>
                {sectionEnabled("projects") && projects.length > 0 && <section className="border-t border-[#D8E0EA] py-10"><div className="flex items-end justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#2563EB]">Selected work</p><h2 className="mt-2 text-2xl font-bold">Projects</h2></div><span className="font-mono text-xs text-[#64748B]">{projects.length} repositories</span></div><div className="mt-6 grid gap-4 md:grid-cols-2">{projects.map((project) => <a key={project.repo_name} href={project.url} target="_blank" rel="noreferrer" className="border border-[#D8E0EA] bg-white p-5 transition-colors duration-200 hover:border-[#2563EB]/50 motion-reduce:transition-none"><div className="flex items-start justify-between gap-3"><h3 className="font-bold">{project.repo_name}</h3><span className="font-mono text-[10px] text-[#2563EB]">↗</span></div><p className="mt-3 text-sm leading-6 text-[#64748B]">{project.description}</p><div className="mt-5 flex flex-wrap gap-x-3 gap-y-1 border-t border-[#D8E0EA] pt-3 font-mono text-[10px] text-[#64748B]"><span>{project.tech_stack.join(" · ")}</span><span>★ {project.stars}</span><span>{project.own_commits} commits</span></div></a>)}</div></section>}
                {showSkills && <section className="border-t border-[#D8E0EA] py-8"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#64748B]">Capabilities</p><div className="mt-4"><SkillCloud portfolio={portfolio} labelClass="font-mono text-[10px] uppercase tracking-wider text-[#64748B]" verifiedClass="border border-emerald-600/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700" skillClass="border border-[#D8E0EA] bg-white px-2.5 py-1 text-xs text-[#475569]" /></div></section>}
                {sectionEnabled("certifications") && certifications.length > 0 && <section className="border-t border-[#D8E0EA] py-8"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#64748B]">Certifications</p><ul className="mt-4 grid gap-2 text-sm text-[#475569] sm:grid-cols-2">{certifications.map((item) => <li key={item}>• {item}</li>)}</ul></section>}
                <Footer portfolio={portfolio} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#D8E0EA] py-6 font-mono text-[10px] uppercase tracking-wider text-[#64748B]" brandClass="text-[#2563EB]" />
            </div>
        </main>
    );
}

export function PublicPortfolioView({ portfolio, apiBase }: Pick<LayoutProps, "portfolio" | "apiBase">) {
    const contacts = Object.entries(portfolio.content.contacts ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === "string" && Boolean(entry[1]));
    const sectionEnabled = (key: SectionKey) => portfolio.content.sections?.[key] !== false;
    const props: LayoutProps = { portfolio, apiBase, contacts, sectionEnabled };
    const theme = getPublicThemePlan(portfolio.content.theme).key;

    if (theme === "editorial") return <EditorialLayout {...props} />;
    if (theme === "developer") return <DeveloperLayout {...props} />;
    return <ProfessionalLayout {...props} />;
}
