import type { PortfolioTheme } from "./types";

type PublicPortfolioSection = "projects" | "skills" | "experience" | "education" | "certifications";

export type PublicThemePlan = {
    key: PortfolioTheme;
    label: string;
    sectionOrder: PublicPortfolioSection[];
};

const themePlans: Record<PortfolioTheme, PublicThemePlan> = {
    editorial: {
        key: "editorial",
        label: "Editorial portfolio",
        sectionOrder: ["projects", "experience", "skills", "education", "certifications"],
    },
    developer: {
        key: "developer",
        label: "Developer portfolio",
        sectionOrder: ["projects", "skills", "experience", "education", "certifications"],
    },
    professional: {
        key: "professional",
        label: "Professional profile",
        sectionOrder: ["experience", "education", "projects", "skills", "certifications"],
    },
    maestro: {
        key: "maestro",
        label: "Maestro portfolio",
        sectionOrder: ["projects", "experience", "skills", "education", "certifications"],
    },
};

export function getPublicThemePlan(theme: PortfolioTheme | undefined): PublicThemePlan {
    return (theme && themePlans[theme]) || themePlans.professional;
}
