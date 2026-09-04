import type { PortfolioProject } from "./types";

export const MAXFOLIO_PROJECT_TITLE_WRAP = {
    overflowWrap: "anywhere",
    wordBreak: "normal",
} as const;

const MAXFOLIO_PROJECT_IMAGES = Array.from(
    { length: 6 },
    (_, index) => `https://picsum.photos/seed/githire-maxfolio-${index + 1}/1400/1320`,
);

export function getMaxfolioProjects(projects: PortfolioProject[]) {
    return projects.slice(0, 6);
}

export function getMaxfolioProjectImage(index: number) {
    return MAXFOLIO_PROJECT_IMAGES[index % MAXFOLIO_PROJECT_IMAGES.length];
}

export function getMaxfolioMarqueeItems(project: PortfolioProject) {
    return [
        ...project.tech_stack,
        `${project.stars} stars`,
        `${project.own_commits} commits`,
    ];
}

export function splitMaxfolioWords(text: string) {
    return text.trim().split(/\s+/).filter(Boolean);
}

export function getMaxfolioLetterDelay(index: number) {
    return index * 0.025;
}

export function getMaxfolioProjectMotion(reduceMotion: boolean | null) {
    return reduceMotion
        ? { restScale: 1, hoverScale: 1 }
        : { restScale: 1.07, hoverScale: 1 };
}
