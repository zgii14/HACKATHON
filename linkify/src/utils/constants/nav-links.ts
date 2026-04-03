import {
    BookmarkIcon,
    BriefcaseIcon,
    CompassIcon,
    GraduationCapIcon,
    LayoutDashboardIcon,
    SendIcon,
    SparklesIcon,
    TargetIcon,
    UserIcon,
    UserCircle2,
} from "lucide-react";

export const NAV_LINKS = [
    {
        title: "Product",
        href: "/#features",
        menu: [
            {
                title: "Job matching",
                tagline: "GitHub + CV, scored with transparent skill overlap.",
                href: "/#features",
                icon: BriefcaseIcon,
            },
            {
                title: "Skill gap",
                tagline: "See what to learn next versus market demand.",
                href: "/#features",
                icon: TargetIcon,
            },
            {
                title: "Learning roadmap",
                tagline: "Personalized steps powered by AI.",
                href: "/#features",
                icon: GraduationCapIcon,
            },
        ],
    },
];

export const DASHBOARD_LINKS = [
    { title: "Overview",       href: "/dashboard",                  icon: LayoutDashboardIcon },
    { title: "Profil & Skill", href: "/dashboard/profile",          icon: SparklesIcon },
    { title: "Browse Jobs",    href: "/dashboard/jobs",             icon: BriefcaseIcon },
    { title: "Rekomendasi",    href: "/dashboard/jobs/recommended", icon: CompassIcon },
    { title: "Skill Gap",      href: "/dashboard/skill-gap",        icon: TargetIcon },
    { title: "My Roadmaps",    href: "/dashboard/my-roadmaps",      icon: BookmarkIcon },
    { title: "Lamaranku",      href: "/dashboard/applications",     icon: SendIcon },
    { title: "Roadmap Generik",href: "/dashboard/roadmap",          icon: GraduationCapIcon },
    { title: "Onboarding",     href: "/dashboard/onboarding",       icon: UserIcon },
    { title: "Kelola Akun",    href: "/dashboard/account",          icon: UserCircle2 },
];
