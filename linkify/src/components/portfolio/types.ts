export type PortfolioTheme = "editorial" | "developer" | "professional";
export type PortfolioLanguage = "id" | "en";

export type PortfolioProject = {
    repo_name: string;
    url: string;
    description: string;
    tech_stack: string[];
    stars: number;
    own_commits: number;
};

export type PortfolioExperience = {
    company?: string;
    role?: string;
    location?: string;
    period?: string;
    bullets?: string[];
};

export type PortfolioEducation = {
    institution?: string;
    degree?: string;
    major?: string;
    location?: string;
    period?: string;
    gpa?: string;
};

export type PortfolioContactLink = { value: string; enabled: boolean };
export type PortfolioContacts = Record<"github" | "linkedin" | "email" | "whatsapp" | "website", PortfolioContactLink>;
export type PortfolioSections = Record<"projects" | "skills" | "experience" | "education" | "certifications", boolean>;

export type PortfolioContent = {
    name: string;
    headline: string;
    bio: string;
    language: PortfolioLanguage;
    theme: PortfolioTheme;
    projects: PortfolioProject[];
    skills: string[];
    experience: PortfolioExperience[];
    education: PortfolioEducation[];
    certifications: string[];
    contacts: PortfolioContacts;
    sections: PortfolioSections;
    ai_enhanced?: boolean;
};

export type PortfolioRecord = {
    public_id: string;
    status: "draft" | "published";
    draft_content: PortfolioContent | null;
    published_content: PortfolioContent | null;
    has_photo: boolean;
    public_url: string;
    published_at: string | null;
    updated_at: string | null;
};

export type PublicPortfolioContent = Omit<PortfolioContent, "contacts"> & {
    contacts: Partial<Record<keyof PortfolioContacts, string>>;
};

export type PublicPortfolio = {
    public_id: string;
    content: PublicPortfolioContent;
    verified_skills: Array<{
        skill: string;
        level?: string;
        score?: number;
        evidence?: {
            repos?: number;
            own_commits?: number;
            last_used?: string;
            confidence?: string;
            repo_names?: string[];
            repo_urls?: string[];
        };
    }>;
    has_photo: boolean;
};
