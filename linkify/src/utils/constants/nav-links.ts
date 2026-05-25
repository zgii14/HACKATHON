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
    FileText as FileTextIcon,
} from "lucide-react";

export const NAV_LINKS = [
    {
        title: "Features",
        href: "/#features",
        menu: null,
    },
    {
        title: "How It Works",
        href: "/how-it-works",
        menu: null,
    },
    {
        title: "About",
        href: "/about",
        menu: null,
    },
];

export const DASHBOARD_LINKS = [
    { title: "Overview",       href: "/dashboard",                  icon: LayoutDashboardIcon },
    { title: "Profil & Skill", href: "/dashboard/profile",          icon: SparklesIcon },
    { title: "CV Generator",   href: "/dashboard/cv-generator",     icon: FileTextIcon },
    { title: "Browse Jobs",    href: "/dashboard/jobs",             icon: BriefcaseIcon },
    { title: "Rekomendasi",    href: "/dashboard/jobs/recommended", icon: CompassIcon },
    { title: "Skill Gap",      href: "/dashboard/skill-gap",        icon: TargetIcon },
    { title: "My Roadmaps",    href: "/dashboard/my-roadmaps",      icon: BookmarkIcon },
    { title: "Lamaranku",      href: "/dashboard/applications",     icon: SendIcon },
    { title: "Roadmap Generik",href: "/dashboard/roadmap",          icon: GraduationCapIcon },
    { title: "Onboarding",     href: "/dashboard/onboarding",       icon: UserIcon },
    { title: "Kelola Akun",    href: "/dashboard/account",          icon: UserCircle2 },
];
