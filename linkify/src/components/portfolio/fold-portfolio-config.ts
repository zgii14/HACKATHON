import type { PortfolioLanguage, PortfolioProject, PortfolioSections, PublicPortfolio, PublicPortfolioContent } from "./types";

// File ini sengaja hanya memakai `import type`: node:test memuatnya langsung tanpa bundler.

export type FoldCopy = {
    unfold: string;
    githubVerified: string;
    seeWork: string;
    sayHello: string;
    inNumbers: string;
    statProjects: string;
    statCommits: string;
    statVerified: string;
    selectedWork: string;
    openRepo: string;
    commits: string;
    stars: string;
    skills: string;
    verified: string;
    otherSkills: string;
    repos: string;
    experience: string;
    education: string;
    certifications: string;
    incoming: string;
    slide: string;
    madeWith: string;
    nav: Record<FoldNav, string>;
    backdrops: Record<FoldBackdrop, string>;
    bezels: Record<FoldBezel, string>;
    backdropLabel: string;
    bezelLabel: string;
};

export type FoldNav = "home" | "work" | "skills" | "about" | "contact";
export type FoldBackdrop = "basic" | "glow" | "orbit";
export type FoldBezel = "silver" | "black" | "rose" | "sage";

const COPY: Record<PortfolioLanguage, FoldCopy> = {
    id: {
        unfold: "Gulir untuk membuka",
        githubVerified: "GitHub terverifikasi",
        seeWork: "Lihat proyek",
        sayHello: "Sapa saya",
        inNumbers: "Dalam angka",
        statProjects: "Proyek publik",
        statCommits: "Commit sendiri",
        statVerified: "Skill terverifikasi",
        selectedWork: "Proyek terpilih",
        openRepo: "Buka repo",
        commits: "commit",
        stars: "bintang",
        skills: "Skill",
        verified: "Terverifikasi dari GitHub",
        otherSkills: "Skill lainnya",
        repos: "repo",
        experience: "Pengalaman",
        education: "Pendidikan",
        certifications: "Sertifikasi",
        incoming: "Panggilan masuk · soal proyekmu berikutnya",
        slide: "geser untuk bicara",
        madeWith: "Dibuat dengan",
        nav: { home: "Beranda", work: "Proyek", skills: "Skill", about: "Tentang", contact: "Kontak" },
        backdrops: { basic: "Polos", glow: "Glow", orbit: "Orbit" },
        bezels: { silver: "Perak", black: "Hitam", rose: "Rose", sage: "Sage" },
        backdropLabel: "Latar",
        bezelLabel: "Warna bingkai",
    },
    en: {
        unfold: "Scroll to unfold",
        githubVerified: "GitHub verified",
        seeWork: "See the work",
        sayHello: "Say hello",
        inNumbers: "In numbers",
        statProjects: "Public projects",
        statCommits: "Own commits",
        statVerified: "Verified skills",
        selectedWork: "Selected work",
        openRepo: "Open repo",
        commits: "commits",
        stars: "stars",
        skills: "Skills",
        verified: "Verified from GitHub",
        otherSkills: "Other skills",
        repos: "repos",
        experience: "Experience",
        education: "Education",
        certifications: "Certifications",
        incoming: "Incoming call · about your next project",
        slide: "slide to talk",
        madeWith: "Created with",
        nav: { home: "Home", work: "Work", skills: "Skills", about: "About", contact: "Contact" },
        backdrops: { basic: "Basic", glow: "Glow", orbit: "Orbit" },
        bezels: { silver: "Silver", black: "Black", rose: "Rose", sage: "Sage" },
        backdropLabel: "Backdrop",
        bezelLabel: "Frame color",
    },
};

export function getFoldCopy(language: PortfolioLanguage): FoldCopy {
    return COPY[language] ?? COPY.id;
}

export function isSectionOn(content: Pick<PublicPortfolioContent, "sections">, key: keyof PortfolioSections): boolean {
    return content.sections?.[key] !== false;
}

export const FOLD_BLOCKS = ["#2f5bd3", "#e8a23a", "#d83a2e", "#8fa58a", "#6b4fd8", "#e9c94a"];

export const FOLD_BEZELS: Record<FoldBezel, string> = {
    silver: "#d9d6d0",
    black: "#1b1b1b",
    rose: "#e2a093",
    sage: "#a9b5a0",
};

export const FOLD_BACKDROPS: FoldBackdrop[] = ["basic", "glow", "orbit"];

/** FNV-1a 32-bit (sama dengan Arcade), agar warna tiap repo stabil. */
function hashString(value: string): number {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
}

/** Tinta hitam untuk blok terang, putih untuk blok gelap (luminans relatif WCAG). */
export function readableInk(hex: string): "#111111" | "#ffffff" {
    const value = hex.replace("#", "");
    const channels = [0, 2, 4].map((offset) => {
        const channel = parseInt(value.slice(offset, offset + 2), 16) / 255;
        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    // Titik silang kontras: di atas ~0.18, teks hitam lebih terbaca daripada putih.
    return luminance > 0.18 ? "#111111" : "#ffffff";
}

export function pickBlockColor(repoName: string): { bg: string; ink: "#111111" | "#ffffff" } {
    const bg = FOLD_BLOCKS[hashString(repoName || "githire") % FOLD_BLOCKS.length];
    return { bg, ink: readableInk(bg) };
}

export type FoldStat = { value: number; label: string };

export function buildFoldStats(portfolio: PublicPortfolio, copy: FoldCopy): FoldStat[] {
    const { content } = portfolio;
    const stats: FoldStat[] = [];
    if (isSectionOn(content, "projects")) {
        const projects = content.projects ?? [];
        stats.push({ value: projects.length, label: copy.statProjects });
        stats.push({ value: projects.reduce((sum, project) => sum + (project.own_commits || 0), 0), label: copy.statCommits });
    }
    if (isSectionOn(content, "skills")) {
        stats.push({ value: (portfolio.verified_skills ?? []).filter((item) => item?.skill).length, label: copy.statVerified });
    }
    return stats.filter((stat) => stat.value > 0);
}

export function pickNotifications(projects: PortfolioProject[], max = 2): PortfolioProject[] {
    return [...(projects ?? [])].sort((a, b) => (b.own_commits || 0) - (a.own_commits || 0)).slice(0, max);
}

export function notificationMeta(project: PortfolioProject, copy: FoldCopy): string {
    const parts: string[] = [];
    const tech = project.tech_stack?.find((item) => item.trim());
    if (tech) parts.push(tech.trim());
    if (project.own_commits > 0) parts.push(`${project.own_commits} ${copy.commits}`);
    if (project.stars > 0) parts.push(`${project.stars} ${copy.stars}`);
    return parts.length ? parts.join(" · ") : "GitHub";
}

export function contactHref(kind: string, value: string): string | null {
    const v = value.trim();
    if (!v) return null;
    if (kind === "email") return `mailto:${v}`;
    if (kind === "whatsapp") return `https://wa.me/${v.replace(/\D/g, "")}`;
    if (kind === "github" || kind === "linkedin" || kind === "website") {
        return /^https?:\/\//i.test(v) ? v : `https://${v}`;
    }
    return null;
}

const CONTACT_PRIORITY = ["email", "whatsapp", "linkedin", "website", "github"];

export function primaryContact(contacts: Array<[string, string]>): { kind: string; value: string; href: string } | null {
    for (const kind of CONTACT_PRIORITY) {
        const entry = contacts.find(([key]) => key === kind);
        const href = entry ? contactHref(kind, entry[1]) : null;
        if (entry && href) return { kind, value: entry[1], href };
    }
    return null;
}

export type FoldScreen =
    | { id: "hero" | "stats" | "work" | "skills" | "experience" | "education" | "certifications" | "call"; nav?: FoldNav }
    | { id: "project"; index: number; nav?: FoldNav };

export function buildScreens(portfolio: PublicPortfolio): FoldScreen[] {
    const { content } = portfolio;
    const screens: FoldScreen[] = [{ id: "hero", nav: "home" }];
    if (buildFoldStats(portfolio, COPY.id).length) screens.push({ id: "stats" });
    const projects = content.projects ?? [];
    if (isSectionOn(content, "projects") && projects.length) {
        screens.push({ id: "work", nav: "work" });
        projects.forEach((_, index) => screens.push({ id: "project", index }));
    }
    const hasSkills = (content.skills ?? []).length > 0 || (portfolio.verified_skills ?? []).length > 0;
    if (isSectionOn(content, "skills") && hasSkills) screens.push({ id: "skills", nav: "skills" });
    let aboutTagged = false;
    for (const key of ["experience", "education", "certifications"] as const) {
        if (!isSectionOn(content, key) || !(content[key] ?? []).length) continue;
        screens.push(aboutTagged ? { id: key } : { id: key, nav: "about" });
        aboutTagged = true;
    }
    screens.push({ id: "call", nav: "contact" });
    return screens;
}

export function formatClock(date: Date): string {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function initials(name: string): string {
    const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "GH";
    return words
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();
}

export function firstSentences(text: string, max = 2): string {
    const trimmed = (text ?? "").trim();
    if (!trimmed) return "";
    const sentences = trimmed.match(/[^.!?]+[.!?]+/g);
    if (!sentences) return trimmed;
    return sentences.slice(0, max).map((sentence) => sentence.trim()).join(" ");
}

export type FoldPrefs = { backdrop: FoldBackdrop; bezel: FoldBezel };

export const FOLD_PREFS_KEY = "githire:fold-prefs";

export function parseFoldPrefs(raw: string | null): FoldPrefs {
    const fallback: FoldPrefs = { backdrop: "basic", bezel: "silver" };
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(raw) as Partial<Record<keyof FoldPrefs, unknown>>;
        return {
            backdrop: FOLD_BACKDROPS.includes(parsed.backdrop as FoldBackdrop) ? (parsed.backdrop as FoldBackdrop) : fallback.backdrop,
            bezel: typeof parsed.bezel === "string" && parsed.bezel in FOLD_BEZELS ? (parsed.bezel as FoldBezel) : fallback.bezel,
        };
    } catch {
        return fallback;
    }
}

export type FoldTrack = {
    /** Jumlah langkah scroll; satu langkah = satu tinggi viewport. */
    steps: number;
    unfold: [number, number];
    fold: [number, number];
    /** Titik kunci strip layar: langkah → indeks layar (diam di awal langkah, bergeser di 45% akhir). */
    stripInput: number[];
    stripOutput: number[];
    restStep: (index: number) => number;
};

/** Jadwal scroll desktop untuk `screenCount` layar strip (tanpa layar panggilan di sisi belakang). */
export function buildTrack(screenCount: number): FoldTrack {
    const count = Math.max(1, screenCount);
    const steps = count + 2;
    const stripInput = [0, 1];
    const stripOutput = [0, 0];
    for (let index = 0; index < count - 1; index += 1) {
        stripInput.push(1 + index + 0.55, 2 + index);
        stripOutput.push(index, index + 1);
    }
    stripInput.push(steps);
    stripOutput.push(count - 1);
    return {
        steps,
        unfold: [0, 1],
        fold: [count + 1, steps],
        stripInput,
        stripOutput,
        restStep: (index) => (index >= count ? steps : 1 + index + 0.25),
    };
}

/** Ukuran nama raksasa (vw) agar satu baris condensed tidak melebihi lebar layar. */
export function giantNameSize(name: string): number {
    const length = Math.max(1, (name ?? "").trim().length);
    // Huruf kapital Sofia Sans Extra Condensed 900 rata-rata ~0.5em; sisakan 6% tepi.
    return Math.min(22, Math.floor((94 / (length * 0.5)) * 10) / 10);
}

type VerifiedSkill = PublicPortfolio["verified_skills"][number];

export function splitSkills(skills: string[], verified: VerifiedSkill[], maxVerified = 6, maxOthers = 14) {
    const verifiedList = (verified ?? []).filter((item) => item?.skill?.trim()).slice(0, maxVerified);
    const seen = new Set(verifiedList.map((item) => item.skill.trim().toLowerCase()));
    const others: string[] = [];
    for (const skill of skills ?? []) {
        const key = skill.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        others.push(skill.trim());
    }
    return { verified: verifiedList, others: others.slice(0, maxOthers), hiddenOthers: Math.max(0, others.length - maxOthers) };
}
