export type ThemePreviewSource = {
    name?: string;
    headline?: string;
    projects?: Array<{ repo_name?: string }>;
    experience?: Array<{ role?: string }>;
};

export type ThemePreviewData = {
    name: string;
    headline: string;
    projectName: string;
    experienceRole: string;
};

function textOrFallback(value: string | undefined, fallback: string) {
    return value?.trim() || fallback;
}

export function getThemePreviewData(content: ThemePreviewSource): ThemePreviewData {
    return {
        name: textOrFallback(content.name, "Your name"),
        headline: textOrFallback(content.headline, "Your professional headline"),
        projectName: textOrFallback(content.projects?.[0]?.repo_name, "Featured project"),
        experienceRole: textOrFallback(content.experience?.[0]?.role, "Experience"),
    };
}
