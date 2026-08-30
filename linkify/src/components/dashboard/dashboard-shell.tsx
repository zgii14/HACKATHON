"use client";

import { cn, DASHBOARD_LINKS } from "@/utils";
import { AppRole, redirectForRole } from "@/utils/constants/roles";
import { useApi } from "@/hooks/use-api";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserButton } from "@clerk/nextjs";
import { Menu, PanelLeftClose, PanelLeftOpen, X, Briefcase, PlusCircle, Search, ShieldCheck, MessageCircle, CreditCard, LayoutDashboard, Users, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

// ── Logo Components (Logo 6 — Minimal Dark) ──────────────────────────────────
function GitHireLogo() {
    return (
        <svg width="130" height="36" viewBox="0 0 180 60" xmlns="http://www.w3.org/2000/svg" aria-label="GitHire">
            {/* Git branch icon */}
            <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground" />
            <circle cx="16" cy="44" r="6" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground" />
            <circle cx="34" cy="30" r="6" fill="#7c3aed" />
            <line x1="16" y1="22" x2="16" y2="38" stroke="currentColor" strokeWidth="2" className="text-foreground" />
            <line x1="20" y1="18" x2="30" y2="26" stroke="currentColor" strokeWidth="2" className="text-foreground" />
            {/* Wordmark */}
            <text x="50" y="22" fontFamily="system-ui,sans-serif" fontSize="20" fontWeight="600" fill="currentColor" dominantBaseline="central" className="text-foreground">Git<tspan fill="#7c3aed">Hire</tspan></text>
            <text x="50" y="44" fontFamily="system-ui,sans-serif" fontSize="9" fill="#7c3aed" dominantBaseline="central" letterSpacing="0.1em">FROM CODE TO CAREER</text>
        </svg>
    );
}

function GitHireIcon() {
    return (
        <svg width="28" height="28" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-label="GitHire">
            <title>GitHire</title>
            <circle cx="10" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground" />
            <circle cx="10" cy="28" r="4" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground" />
            <circle cx="28" cy="18" r="5" fill="#7c3aed" />
            <line x1="10" y1="12" x2="10" y2="24" stroke="currentColor" strokeWidth="2" className="text-foreground" />
            <line x1="13" y1="10" x2="24" y2="16" stroke="currentColor" strokeWidth="2" className="text-foreground" />
        </svg>
    );
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { withAuth, authReady } = useApi();
    const qc = useQueryClient();

    // Desktop: sidebar collapsed ke icon-only
    const [collapsed, setCollapsed] = useState(false);
    // Mobile: sidebar drawer terbuka/tertutup
    const [mobileOpen, setMobileOpen] = useState(false);

    // Fetch profile role untuk sidebar dinamis
    const { data: profile } = useQuery({
        queryKey: ["profile"],
        queryFn: () =>
            withAuth<{ role: string; recruiter_access_denied?: boolean; recruiter_pending?: boolean; is_admin?: boolean } | null>("/me/profile"),
        enabled: authReady,
        staleTime: 5 * 60 * 1000,
    });

    const RECRUITER_LINKS = [
        {
            title: "Dashboard",
            href: "/dashboard/recruiter",
            icon: LayoutDashboard,
        },
        {
            title: "Lowongan Saya",
            href: "/dashboard/recruiter/jobs",
            icon: Briefcase,
        },
        {
            title: "Buat Lowongan",
            href: "/dashboard/recruiter/jobs/new",
            icon: PlusCircle,
        },
        {
            title: "Cari Kandidat",
            href: "/dashboard/recruiter/candidates",
            icon: Search,
        },
        {
            title: "Chat",
            href: "/dashboard/chat",
            icon: MessageCircle,
        },
        {
            title: "Tagihan",
            href: "/dashboard/recruiter/billing",
            icon: CreditCard,
        },
        {
            title: "Pengaturan",
            href: "/dashboard/recruiter/settings",
            icon: Settings,
        },
    ];

    const ADMIN_LINKS = [
        {
            title: "Dashboard Admin",
            href: "/dashboard/admin",
            icon: LayoutDashboard,
        },
        {
            title: "Permohonan Recruiter",
            href: "/dashboard/admin/recruiter-requests",
            icon: ShieldCheck,
        },
        {
            title: "Daftar Recruiter",
            href: "/dashboard/admin/recruiters",
            icon: Users,
        },
    ];


    // Fetch jumlah bookmark untuk badge di sidebar
    const { data: bookmarks = [] } = useQuery({
        queryKey: ["bookmarks"],
        queryFn: () => withAuth<{ job_id: string }[]>("/me/bookmarks"),
        enabled: authReady && profile?.role !== "recruiter",
        staleTime: 60_000,
    });
    const bookmarkCount: number = bookmarks.length;

    // Fetch jumlah lamaran aktif untuk badge Lamaranku
    const { data: applications = [] } = useQuery({
        queryKey: ["applications"],
        queryFn: () => withAuth<{ id: string }[]>("/applications"),
        enabled: authReady && profile?.role !== "recruiter",
        staleTime: 60_000,
    });
    const applicationCount: number = applications.length;

    // Routing berbasis role.
    //   role null      → user baru → auto-set candidate (recruiter ditentukan email allowlist)
    //   role recruiter → di home kandidat → arahkan ke recruiter jobs
    const role = profile?.role ?? null;

    // Auto-assign candidate untuk user baru. Recruiter tidak pernah role null
    // (dipaksa dari email allowlist di backend), jadi tidak perlu role picker.
    const assignedRef = useRef(false);
    const assignCandidate = useMutation({
        mutationFn: () =>
            withAuth("/me/role", { method: "POST", body: JSON.stringify({ role: "candidate" }) }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
        onError: () => {
            assignedRef.current = false;
        },
    });

    useEffect(() => {
        if (!authReady || !profile) return;
        if (role == null) {
            if (!assignedRef.current) {
                assignedRef.current = true;
                assignCandidate.mutate();
            }
            return;
        }
        // Guard dua arah, digerakkan peta rute — bukan pengecekan per-halaman.
        const dest = redirectForRole(role as AppRole, pathname);
        if (dest) router.replace(dest);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authReady, profile, role, pathname, router]);

    // Beri tahu sekali kalau akses recruiter ditolak — jangan turunkan role diam-diam.
    const deniedNotified = useRef(false);
    useEffect(() => {
        if (profile?.recruiter_access_denied && !deniedNotified.current) {
            deniedNotified.current = true;
            toast.info(
                "Akunmu belum terdaftar sebagai recruiter, jadi dibuka sebagai kandidat. Hubungi admin untuk didaftarkan.",
                { autoClose: 8000 }
            );
        }
    }, [profile?.recruiter_access_denied]);

    // Tutup mobile drawer saat navigasi
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Tutup mobile drawer saat resize ke desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) setMobileOpen(false);
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const NavLinks = ({ showLabel = true }: { showLabel?: boolean }) => {
        // Role belum dipilih → jangan tampilkan menu apa pun (user sedang di role picker)
        if (role == null) return null;
        const links = role === "recruiter" ? RECRUITER_LINKS : DASHBOARD_LINKS;
        const showAdmin = !!profile?.is_admin;

        return (
            <nav className="flex flex-col gap-1">
                {links.map((item) => {
                    const active =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    const isMyRoadmaps = item.href === "/dashboard/my-roadmaps";
                    const isApplications = item.href === "/dashboard/applications";
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            prefetch={false}
                            title={!showLabel ? item.title : undefined}
                            className={cn(
                                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-150",
                                showLabel ? "justify-start" : "justify-center",
                                active
                                    ? "bg-primary/10 text-foreground font-medium"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <item.icon className="size-4 shrink-0" />
                            {showLabel && (
                                <span className="truncate flex-1">{item.title}</span>
                            )}
                            {showLabel && isMyRoadmaps && bookmarkCount > 0 && (
                                <span className="ml-auto rounded-[3px] border border-primary/40 bg-primary/10 px-1.5 py-px font-mono text-[10px] font-semibold text-primary">
                                    {bookmarkCount > 9 ? "9+" : bookmarkCount}
                                </span>
                            )}
                            {showLabel && isApplications && applicationCount > 0 && (
                                <span className="ml-auto rounded-[3px] border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-px font-mono text-[10px] font-semibold text-emerald-500">
                                    {applicationCount > 9 ? "9+" : applicationCount}
                                </span>
                            )}
                        </Link>
                    );
                })}
                {showAdmin && (
                    <>
                        <div className="mt-4 mb-1 px-3">
                            {showLabel && <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Admin</p>}
                            {!showLabel && <div className="h-px bg-border" />}
                        </div>
                        {ADMIN_LINKS.map((item) => {
                            const active = pathname === item.href || pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    prefetch={false}
                                    title={!showLabel ? item.title : undefined}
                                    className={cn(
                                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-150",
                                        showLabel ? "justify-start" : "justify-center",
                                        active ? "bg-amber-500/10 text-amber-600 font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <item.icon className="size-4 shrink-0" />
                                    {showLabel && <span className="truncate flex-1">{item.title}</span>}
                                </Link>
                            );
                        })}
                    </>
                )}
            </nav>
        );
    };

    return (
        <div className="flex min-h-screen w-full bg-background">

            {/* ── Mobile: overlay backdrop ── */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
                    onClick={() => setMobileOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* ── Mobile: drawer sidebar ── */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-background p-4 gap-6",
                    // drawer harus opaque (bg-background) supaya konten di belakang tak tembus
                    "transition-transform duration-300 ease-in-out md:hidden",
                    mobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Header mobile drawer */}
                <div className="flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <GitHireLogo />
                    </Link>
                    <button
                        onClick={() => setMobileOpen(false)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        aria-label="Tutup sidebar"
                    >
                        <X className="size-4" />
                    </button>
                </div>
                <NavLinks showLabel />
            </aside>

            {/* ── Desktop: persistent sidebar ── */}
            <aside
                className={cn(
                    "hidden md:flex flex-col border-r border-border bg-background p-4 gap-6",
                    "sticky top-0 h-screen overflow-y-auto",
                    "transition-all duration-300 ease-in-out",
                    collapsed ? "w-16" : "w-56"
                )}
            >
                {/* Header desktop sidebar */}
                <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
                    {!collapsed && (
                        <Link href="/" className="flex items-center min-w-0">
                            <GitHireLogo />
                        </Link>
                    )}
                    {collapsed && (
                        <Link href="/" className="flex items-center justify-center">
                            <GitHireIcon />
                        </Link>
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                        aria-label={collapsed ? "Buka sidebar" : "Collapse sidebar"}
                        title={collapsed ? "Buka sidebar" : "Collapse sidebar"}
                    >
                        {collapsed
                            ? <PanelLeftOpen className="size-4" />
                            : <PanelLeftClose className="size-4" />
                        }
                    </button>
                </div>
                <NavLinks showLabel={!collapsed} />
            </aside>

            {/* ── Main content area ── */}
            <div className="flex flex-1 flex-col min-w-0">

                {/* Header */}
                <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-4 md:px-6">
                    {/* Mobile: hamburger button */}
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="md:hidden rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        aria-label="Buka menu navigasi"
                    >
                        <Menu className="size-5" />
                    </button>

                    {/* Mobile: logo di tengah */}
                    <Link href="/" className="md:hidden flex items-center">
                        <svg width="90" height="24" viewBox="0 0 180 60" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                            <circle cx="16" cy="44" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                            <circle cx="34" cy="30" r="6" fill="#7c3aed" />
                            <line x1="16" y1="22" x2="16" y2="38" stroke="currentColor" strokeWidth="2" />
                            <line x1="20" y1="18" x2="30" y2="26" stroke="currentColor" strokeWidth="2" />
                            <text x="50" y="30" fontFamily="system-ui,sans-serif" fontSize="22" fontWeight="600" fill="currentColor" dominantBaseline="central">Git<tspan fill="#7c3aed">Hire</tspan></text>
                        </svg>
                    </Link>

                    {/* Desktop: spacer kiri */}
                    <div className="hidden md:block" />

                    {/* Theme toggle + UserButton */}
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <UserButton
                            afterSignOutUrl="/"
                            appearance={{
                                elements: {
                                    userButtonPopoverActionButton__manageAccount: "hidden",
                                },
                            }}
                        />
                    </div>
                </header>

                {/* Pending recruiter banner */}
                {profile?.recruiter_pending && (
                    <div className="mx-4 mt-4 rounded-md border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm md:mx-8">
                        <span className="font-medium text-amber-600">Menunggu persetujuan recruiter</span>
                        <span className="text-muted-foreground"> — pengajuanmu untuk menjadi recruiter sedang ditinjau admin (1-2 hari). Kamu tetap bisa pakai fitur kandidat sementara.</span>
                        <Link href="/recruiter/apply" className="ml-2 font-medium text-amber-600 hover:underline">
                            Lihat status
                        </Link>
                    </div>
                )}

                {/* Page content */}
                <main className="flex-1 w-full p-4 md:px-8 md:py-7">
                    {children}
                </main>
            </div>
        </div>
    );
}
