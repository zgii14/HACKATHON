import type { PortfolioLanguage, PortfolioProject, PublicPortfolio } from "./types";

type VerifiedSkill = PublicPortfolio["verified_skills"][number];

export type ArcadeCopy = {
    about: string;
    projects: string;
    skills: string;
    verified: string;
    otherSkills: string;
    experience: string;
    education: string;
    certifications: string;
    contact: string;
    githubVerified: string;
    commits: string;
    repos: string;
    stars: string;
    openRepo: string;
    scroll: string;
    madeWith: string;
};

const COPY: Record<PortfolioLanguage, ArcadeCopy> = {
    id: {
        about: "Tentang",
        projects: "Proyek",
        skills: "Skill",
        verified: "Terverifikasi dari GitHub",
        otherSkills: "Skill lainnya",
        experience: "Pengalaman",
        education: "Pendidikan",
        certifications: "Sertifikasi",
        contact: "Kontak",
        githubVerified: "GitHub terverifikasi",
        commits: "commit",
        repos: "repo",
        stars: "bintang",
        openRepo: "Buka repository",
        scroll: "Gulir ke bawah",
        madeWith: "Dibuat dengan",
    },
    en: {
        about: "About",
        projects: "Projects",
        skills: "Skills",
        verified: "Verified from GitHub",
        otherSkills: "Other skills",
        experience: "Experience",
        education: "Education",
        certifications: "Certifications",
        contact: "Contact",
        githubVerified: "GitHub verified",
        commits: "commits",
        repos: "repos",
        stars: "stars",
        openRepo: "Open repository",
        scroll: "Scroll down",
        madeWith: "Created with",
    },
};

export function getArcadeCopy(language: PortfolioLanguage): ArcadeCopy {
    return COPY[language] ?? COPY.id;
}

export function splitHeadline(headline: string): string[] {
    const trimmed = (headline ?? "").trim();
    if (!trimmed) return [];
    const parts = trimmed
        .split(/\s*[×|/·•,]\s*|\s+x\s+/i)
        .map((part) => part.trim())
        .filter(Boolean);
    return (parts.length ? parts : [trimmed]).slice(0, 3);
}

export function pickSkills(skills: string[], verified: VerifiedSkill[]) {
    const verifiedList = (verified ?? []).filter((item) => item?.skill).slice(0, 8);
    const seen = new Set(verifiedList.map((item) => item.skill.toLowerCase()));
    const others: string[] = [];
    for (const skill of skills ?? []) {
        const key = skill.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        others.push(skill.trim());
        if (others.length === 16) break;
    }
    return { verified: verifiedList, others };
}

export function formatCount(n?: number | null): string {
    if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return "0";
    if (n < 1000) return String(Math.round(n));
    return `${Number((n / 1000).toFixed(1))}k`;
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

export type ArcadeCoverPattern = "pixels" | "halftone" | "scan" | "rings";

export type ArcadeCover = {
    initials: string;
    pattern: ArcadeCoverPattern;
    palette: { from: string; to: string };
    /** 8x5 grid, nilai 0-3 = intensitas pixel. */
    cells: number[];
};

const COVER_PATTERNS: ArcadeCoverPattern[] = ["pixels", "halftone", "scan", "rings"];
const COVER_PALETTES = [
    { from: "#5EEAD4", to: "#A78BFA" },
    { from: "#A78BFA", to: "#F0ABFC" },
    { from: "#F0ABFC", to: "#FDE68A" },
    { from: "#FDE68A", to: "#5EEAD4" },
];
/** FNV-1a 32-bit: hash stabil agar cover tiap repo selalu sama. */
export function hashString(value: string): number {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash >>> 0;
}

function coverInitials(name: string) {
    const words = name
        .split(/[-_.\s]+|(?<=[a-z0-9])(?=[A-Z])/)
        .map((word) => word.replace(/[^A-Za-z0-9]/g, ""))
        .filter(Boolean);
    if (!words.length) return "GH";
    const letters = words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0].slice(0, 2);
    return letters.toUpperCase();
}

export function getProjectCover(project: PortfolioProject): ArcadeCover {
    const seed = hashString(project.repo_name || "githire");
    let state = seed || 1;
    const cells = Array.from({ length: 40 }, () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return (state >>> 0) % 4;
    });
    return {
        initials: coverInitials(project.repo_name ?? ""),
        pattern: COVER_PATTERNS[seed % COVER_PATTERNS.length],
        palette: COVER_PALETTES[(seed >>> 3) % COVER_PALETTES.length],
        cells,
    };
}
