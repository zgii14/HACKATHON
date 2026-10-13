import {
    BookmarkIcon,
    BriefcaseIcon,
    CompassIcon,
    LayoutDashboardIcon,
    MessageCircle,
    SendIcon,
    SparklesIcon,
    TargetIcon,
    UserIcon,
    UserCircle2,
    FileText as FileTextIcon,
    PanelsTopLeft,
    type LucideIcon,
} from "lucide-react";
import type { NavMatchable } from "@/utils/functions/nav-active";

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

export type NavBadge = "bookmarks" | "applications";
export type DashboardNavLink = NavMatchable & { title: string; icon: LucideIcon; badge?: NavBadge };
export type DashboardNavGroup = { label?: string; links: DashboardNavLink[] };

// Sidebar kandidat, dikelompokkan per tujuan. Satu-satunya sumber menu kandidat.
// label undefined = tanpa pemisah (grup teratas); label "" = pemisah tanpa judul.
export const CANDIDATE_NAV_GROUPS: DashboardNavGroup[] = [
    { links: [{ title: "Ringkasan", href: "/dashboard", icon: LayoutDashboardIcon }] },
    {
        label: "Profil saya",
        links: [
            { title: "Data GitHub & CV", href: "/dashboard/onboarding",   icon: UserIcon },
            { title: "Profil & Skill",   href: "/dashboard/profile",      icon: SparklesIcon },
            { title: "CV",               href: "/dashboard/cv-generator", icon: FileTextIcon },
            { title: "Portfolio",        href: "/dashboard/portfolio",    icon: PanelsTopLeft },
        ],
    },
    {
        label: "Cari kerja",
        links: [
            { title: "Rekomendasi",    href: "/dashboard/jobs/recommended", icon: CompassIcon },
            { title: "Semua Lowongan", href: "/dashboard/jobs",             icon: BriefcaseIcon },
            { title: "Lamaranku",      href: "/dashboard/applications",     icon: SendIcon, badge: "applications" },
            { title: "Chat",           href: "/dashboard/chat",             icon: MessageCircle },
        ],
    },
    {
        label: "Tingkatkan skill",
        links: [
            { title: "Skill Gap", href: "/dashboard/skill-gap", icon: TargetIcon },
            { title: "Roadmap",   href: "/dashboard/my-roadmaps", icon: BookmarkIcon, match: ["/dashboard/roadmap"], badge: "bookmarks" },
        ],
    },
    { label: "", links: [{ title: "Kelola Akun", href: "/dashboard/account", icon: UserCircle2 }] },
];
