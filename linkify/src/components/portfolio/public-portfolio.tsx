import type { PublicPortfolio } from "./types";

const themeStyles = {
    editorial: {
        shell: "bg-[#f4efe7] text-[#191713]",
        muted: "text-[#655f56]",
        line: "border-[#191713]/20",
        accent: "text-[#8247e5]",
        max: "max-w-6xl",
    },
    developer: {
        shell: "bg-[#09090b] text-zinc-100",
        muted: "text-zinc-400",
        line: "border-zinc-800",
        accent: "text-violet-400",
        max: "max-w-7xl",
    },
    professional: {
        shell: "bg-white text-slate-950",
        muted: "text-slate-500",
        line: "border-slate-200",
        accent: "text-violet-700",
        max: "max-w-5xl",
    },
} as const;

function initials(name: string) {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "GH";
}

function contactHref(key: string, value: string) {
    if (key === "email") return `mailto:${value}`;
    if (key === "whatsapp") return `https://wa.me/${value.replace(/\D/g, "")}`;
    return value;
}

export function PublicPortfolioView({ portfolio, apiBase }: { portfolio: PublicPortfolio; apiBase: string }) {
    const content = portfolio.content;
    const theme = themeStyles[content.theme] ?? themeStyles.professional;
    const projects = content.projects ?? [];
    const skills = content.skills ?? [];
    const experience = content.experience ?? [];
    const education = content.education ?? [];
    const certifications = content.certifications ?? [];
    const contacts = Object.entries(content.contacts ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === "string" && Boolean(entry[1]));
    const sectionEnabled = (key: keyof typeof content.sections) => content.sections?.[key] !== false;

    return (
        <main lang={content.language} className={`min-h-screen ${theme.shell}`}>
            <div className={`mx-auto px-5 py-8 sm:px-8 sm:py-12 ${theme.max}`}>
                <header className={`flex items-center justify-between border-b pb-5 ${theme.line}`}>
                    <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em]">{content.name || "Portfolio"}</span>
                    <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${theme.muted}`}>Developer portfolio</span>
                </header>

                <section className={`grid gap-8 border-b py-12 md:grid-cols-[1fr_3fr] md:py-20 ${theme.line}`}>
                    <div>
                        {portfolio.has_photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`${apiBase}/portfolios/${portfolio.public_id}/photo`} alt={`Foto ${content.name}`} className="aspect-square w-32 rounded-full object-cover md:w-40" />
                        ) : (
                            <div className="flex aspect-square w-32 items-center justify-center rounded-full bg-violet-600 font-mono text-3xl font-bold text-white md:w-40">{initials(content.name)}</div>
                        )}
                    </div>
                    <div>
                        <p className={`font-mono text-xs uppercase tracking-[0.15em] ${theme.accent}`}>Hello, I&apos;m {content.name}</p>
                        <h1 className={`mt-4 font-bold leading-[0.98] tracking-[-0.045em] ${content.theme === "editorial" ? "text-5xl sm:text-7xl" : "text-4xl sm:text-6xl"}`}>{content.headline}</h1>
                        {content.bio && <p className={`mt-7 max-w-3xl text-base leading-8 sm:text-lg ${theme.muted}`}>{content.bio}</p>}
                        {contacts.length > 0 && (
                            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2">
                                {contacts.map(([key, value]) => (
                                    <a key={key} href={contactHref(key, value)} target={key === "email" ? undefined : "_blank"} rel="noreferrer" className={`text-sm font-semibold capitalize underline-offset-4 hover:underline ${theme.accent}`}>{key} ↗</a>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {sectionEnabled("projects") && projects.length > 0 && (
                    <section className={`border-b py-12 ${theme.line}`}>
                        <div className="flex items-end justify-between gap-4">
                            <h2 className="text-2xl font-bold tracking-tight">Selected work</h2>
                            <span className={`font-mono text-xs ${theme.muted}`}>{projects.length} projects</span>
                        </div>
                        <div className={`mt-6 grid gap-px overflow-hidden border ${theme.line} ${content.theme === "developer" ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
                            {projects.map((project, index) => (
                                <a key={project.repo_name} href={project.url} target="_blank" rel="noreferrer" className={`group min-h-56 border-b p-6 transition hover:bg-violet-500/5 ${theme.line}`}>
                                    <div className="flex items-center justify-between gap-4">
                                        <span className={`font-mono text-xs ${theme.muted}`}>0{index + 1}</span>
                                        <span className={`font-mono text-[11px] ${theme.muted}`}>★ {project.stars} · {project.own_commits} commits</span>
                                    </div>
                                    <h3 className="mt-8 text-xl font-bold group-hover:text-violet-500">{project.repo_name}</h3>
                                    <p className={`mt-3 text-sm leading-6 ${theme.muted}`}>{project.description}</p>
                                    <p className={`mt-5 font-mono text-[11px] ${theme.accent}`}>{project.tech_stack.join(" · ")}</p>
                                </a>
                            ))}
                        </div>
                    </section>
                )}

                {sectionEnabled("skills") && (skills.length > 0 || portfolio.verified_skills.length > 0) && (
                    <section className={`grid gap-8 border-b py-12 md:grid-cols-[1fr_3fr] ${theme.line}`}>
                        <h2 className="text-2xl font-bold tracking-tight">Skills</h2>
                        <div>
                            {portfolio.verified_skills.length > 0 && (
                                <div>
                                    <p className={`font-mono text-[11px] uppercase tracking-wider ${theme.muted}`}>Verified from GitHub</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {portfolio.verified_skills.map((item) => <span key={item.skill} title={item.evidence ? `${item.evidence.own_commits ?? 0} commits · ${item.evidence.repos ?? 0} repo` : undefined} className="rounded-full border border-emerald-500/40 px-3 py-1 text-xs font-semibold text-emerald-600">✓ {item.skill}{item.level ? ` · ${item.level}` : ""}</span>)}
                                    </div>
                                </div>
                            )}
                            {skills.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{skills.map((skill) => <span key={skill} className={`rounded-full border px-3 py-1 text-xs ${theme.line}`}>{skill}</span>)}</div>}
                        </div>
                    </section>
                )}

                {sectionEnabled("experience") && experience.length > 0 && (
                    <section className={`grid gap-8 border-b py-12 md:grid-cols-[1fr_3fr] ${theme.line}`}>
                        <h2 className="text-2xl font-bold tracking-tight">Experience</h2>
                        <div className="divide-y divide-current/15">
                            {experience.map((item, index) => (
                                <article key={`${item.company}-${index}`} className="grid gap-2 py-5 first:pt-0 sm:grid-cols-[1fr_2fr]">
                                    <p className={`font-mono text-xs ${theme.muted}`}>{item.period || "—"}</p>
                                    <div><h3 className="font-bold">{item.role}</h3><p className={`text-sm ${theme.muted}`}>{item.company}{item.location ? ` · ${item.location}` : ""}</p>{item.bullets?.length ? <ul className={`mt-3 list-disc space-y-1 pl-4 text-sm ${theme.muted}`}>{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}</div>
                                </article>
                            ))}
                        </div>
                    </section>
                )}

                {sectionEnabled("education") && education.length > 0 && (
                    <section className={`grid gap-8 border-b py-12 md:grid-cols-[1fr_3fr] ${theme.line}`}>
                        <h2 className="text-2xl font-bold tracking-tight">Education</h2>
                        <div className="space-y-6">{education.map((item, index) => <article key={`${item.institution}-${index}`}><h3 className="font-bold">{item.institution}</h3><p className={`mt-1 text-sm ${theme.muted}`}>{[item.degree, item.major, item.period].filter(Boolean).join(" · ")}</p></article>)}</div>
                    </section>
                )}

                {sectionEnabled("certifications") && certifications.length > 0 && (
                    <section className={`grid gap-8 border-b py-12 md:grid-cols-[1fr_3fr] ${theme.line}`}><h2 className="text-2xl font-bold tracking-tight">Certifications</h2><ul className="space-y-2">{certifications.map((item) => <li key={item} className={`text-sm ${theme.muted}`}>{item}</li>)}</ul></section>
                )}

                <footer className={`flex flex-wrap items-center justify-between gap-3 py-7 font-mono text-[10px] uppercase tracking-wider ${theme.muted}`}>
                    <span>© {new Date().getFullYear()} {content.name}</span>
                    <span>Created with <strong className={theme.accent}>GitHire</strong></span>
                </footer>
            </div>
        </main>
    );
}
