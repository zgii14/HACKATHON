import type { PortfolioEducation, PortfolioExperience, PortfolioProject } from "./types";

export type GitHubPortfolioRepository = {
    name: string;
    html_url: string;
    stars?: number;
    own_commits?: number;
    languages?: Record<string, number>;
    description?: string;
};

export const MAX_PORTFOLIO_PROJECTS = 6;

export function getProjectSlots(projects: PortfolioProject[]): number {
    return Math.max(0, MAX_PORTFOLIO_PROJECTS - projects.length);
}

export function getEligibleRepositories(
    repositories: GitHubPortfolioRepository[],
    projects: PortfolioProject[],
): GitHubPortfolioRepository[] {
    const attachedNames = new Set(projects.map((project) => project.repo_name));
    return repositories.filter((repository) => !attachedNames.has(repository.name));
}

export function toPortfolioProject(repository: GitHubPortfolioRepository): PortfolioProject {
    const techStack = Object.keys(repository.languages ?? {});
    return {
        repo_name: repository.name,
        url: repository.html_url,
        tech_stack: techStack,
        stars: repository.stars ?? 0,
        own_commits: repository.own_commits ?? 0,
        description: techStack.length > 0
            ? `Proyek GitHub yang dibangun dengan ${techStack.join(" dan ")}.`
            : "Proyek GitHub yang dapat dieksplorasi melalui repository ini.",
    };
}

export function appendRepositoriesToProjects(
    existing: PortfolioProject[],
    repositories: GitHubPortfolioRepository[],
): PortfolioProject[] {
    const result = [...existing];
    const names = new Set(existing.map((project) => project.repo_name));
    for (const repository of repositories) {
        if (result.length >= MAX_PORTFOLIO_PROJECTS || names.has(repository.name)) continue;
        result.push(toPortfolioProject(repository));
        names.add(repository.name);
    }
    return result;
}

export function createEmptyExperience(): PortfolioExperience {
    return { role: "", company: "", period: "" };
}

export function createEmptyEducation(): PortfolioEducation {
    return { institution: "", degree: "", major: "", period: "" };
}

export function getPhotoUploadCopy(hasPhoto: boolean) {
    return hasPhoto
        ? {
            label: "Ganti foto",
            help: "Foto tersimpan di draft. Pilih file baru untuk mengganti.",
        }
        : {
            label: "Foto opsional",
            help: "JPG, PNG, atau WEBP · maksimal 2 MB.",
        };
}
