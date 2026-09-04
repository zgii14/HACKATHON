import type { PortfolioProject } from "./types";

export const EDITORIAL_BIO_FONT_SIZE = "clamp(1.3rem, 2.5vw, 2.25rem)";
export const EDITORIAL_PROJECT_TITLE_WRAP = {
    overflowWrap: "break-word",
    wordBreak: "normal",
} as const;

const EDITORIAL_PROJECT_IMAGES = Array.from(
    { length: 6 },
    (_, index) => `https://picsum.photos/seed/githire-editorial-${index + 1}/1400/1050`,
);

export function getEditorialProjectImage(index: number) {
    return EDITORIAL_PROJECT_IMAGES[index % EDITORIAL_PROJECT_IMAGES.length];
}

export function getEditorialProjects(projects: PortfolioProject[]) {
    return projects.slice(0, 6);
}

export function splitEditorialWords(text: string) {
    return text.trim().split(/\s+/).filter(Boolean);
}

export function splitEditorialBio(text: string) {
    const sentences = text.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [];
    return {
        lead: sentences[0] ?? text.trim(),
        details: sentences.slice(1).join(" "),
    };
}

export function getEditorialMotionRotation(reduceMotion: boolean | null, rotation: number) {
    return reduceMotion ? 0 : rotation;
}

export function getEditorialLetterMotion(index: number) {
    const direction = index % 2 === 0 ? 1 : -1;
    return {
        hidden: {
            x: direction * 24,
            y: index % 3 === 0 ? 44 : 34,
            rotate: direction * 5,
            scale: 0.84,
        },
        hover: {
            y: -5 - (index % 3) * 3,
            rotate: direction * 2.5,
            scale: 1.04,
        },
    };
}

export function getEditorialStackPosition(index: number) {
    return {
        top: 64 + index * 10,
        zIndex: 10 + index,
        rotation: index % 2 === 0 ? -1.2 : 1.2,
    };
}
