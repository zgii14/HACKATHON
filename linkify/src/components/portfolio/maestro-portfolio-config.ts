import type { PortfolioProject } from "./types";

export const MAESTRO_PROJECT_TITLE_WRAP = {
    overflowWrap: "anywhere",
    wordBreak: "normal",
} as const;

const MAESTRO_PALETTES = [
    { surface: "#B1C6C0", foreground: "#151B13", accent: "#F2F4D9" },
    { surface: "#D4DDC8", foreground: "#151B13", accent: "#829791" },
    { surface: "#829791", foreground: "#F2F4D9", accent: "#2F362B" },
    { surface: "#485347", foreground: "#F2F4D9", accent: "#B1C6C0" },
    { surface: "#C2B499", foreground: "#151B13", accent: "#F2F4D9" },
    { surface: "#2F362B", foreground: "#F2F4D9", accent: "#829791" },
] as const;

export function getMaestroProjects(projects: PortfolioProject[]) {
    return projects.slice(0, 6);
}

export function getMaestroChapterProgress(progress: number, count: number) {
    if (count <= 1) return 0;
    const clamped = Math.min(1, Math.max(0, progress));
    return Math.round(clamped * (count - 1));
}

export function getMaestroCardTransform(index: number, activeIndex: number, reduceMotion: boolean | null) {
    if (reduceMotion) {
        return { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 };
    }

    const distance = index - activeIndex;
    if (distance === 0) {
        return { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 };
    }

    const magnitude = Math.abs(distance);
    return {
        x: distance < 0 ? -72 - magnitude * 18 : 72 + magnitude * 18,
        y: magnitude * 26,
        rotate: distance < 0 ? -5 - magnitude * 2 : 5 + magnitude * 2,
        scale: Math.max(0.76, 1 - magnitude * 0.08),
        opacity: Math.max(0.28, 1 - magnitude * 0.2),
    };
}

export function getMaestroProjectPalette(index: number) {
    return MAESTRO_PALETTES[index % MAESTRO_PALETTES.length];
}

export function getMaestroMetaItems(project: PortfolioProject) {
    return [
        ...project.tech_stack.slice(0, 2),
        `${project.stars} stars`,
        `${project.own_commits} commits`,
    ];
}

export function splitMaestroWords(text: string) {
    return text.trim().split(/\s+/).filter(Boolean);
}
