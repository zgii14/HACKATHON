"use client";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/utils";
import { useAuth } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BrandMark } from "./brand-mark";

const LINKS = [
    { label: "Portfolio", href: "#portfolio" },
    { label: "Lowongan", href: "#lowongan" },
    { label: "Untuk recruiter", href: "#recruiter" },
    { label: "Harga", href: "#harga" },
];

export function LandingNav() {
    const { isSignedIn } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [open, setOpen] = useState(false);

    // Garis bawah muncul setelah digulir; IntersectionObserver, bukan listener scroll.
    useEffect(() => {
        const sentinel = document.getElementById("landing-top");
        if (!sentinel) return;
        const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);

    const primary = isSignedIn
        ? { label: "Buka dashboard", href: "/dashboard" }
        : { label: "Buat portfolio", href: "/auth/sign-up" };

    return (
        <>
            <div id="landing-top" className="absolute top-0 h-px w-px" aria-hidden="true" />
            <header
                className={cn(
                    "sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md transition-colors duration-300",
                    scrolled ? "border-border" : "border-transparent",
                )}
            >
                <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8" aria-label="Navigasi utama">
                    <Link href="/" aria-label="GitHire, beranda">
                        <BrandMark />
                    </Link>
                    <ul className="hidden items-center gap-7 text-[14px] font-medium text-muted-foreground lg:flex">
                        {LINKS.map((link) => (
                            <li key={link.href}>
                                <a href={link.href} className="transition-colors hover:text-foreground">
                                    {link.label}
                                </a>
                            </li>
                        ))}
                    </ul>
                    <div className="flex items-center gap-2">
                        {!isSignedIn && (
                            <Link href="/auth/sign-in" className="hidden rounded-full px-4 py-2 text-[14px] font-semibold text-foreground transition-colors hover:bg-muted sm:inline-flex">
                                Masuk
                            </Link>
                        )}
                        <Link
                            href={primary.href}
                            className="inline-flex rounded-full bg-primary px-4 py-2 text-[14px] font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px"
                        >
                            {primary.label}
                        </Link>
                        <Sheet open={open} onOpenChange={setOpen}>
                            <SheetTrigger className="grid size-10 place-items-center rounded-full text-foreground hover:bg-muted lg:hidden" aria-label="Buka menu">
                                <Menu className="size-5" />
                            </SheetTrigger>
                            <SheetContent side="right" className="w-72 bg-background">
                                <SheetTitle className="sr-only">Menu</SheetTitle>
                                <ul className="mt-8 space-y-1 text-[16px] font-medium">
                                    {LINKS.map((link) => (
                                        <li key={link.href}>
                                            <a href={link.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 hover:bg-muted">
                                                {link.label}
                                            </a>
                                        </li>
                                    ))}
                                    {!isSignedIn && (
                                        <li>
                                            <Link href="/auth/sign-in" className="block rounded-lg px-3 py-2.5 hover:bg-muted">
                                                Masuk
                                            </Link>
                                        </li>
                                    )}
                                </ul>
                            </SheetContent>
                        </Sheet>
                    </div>
                </nav>
            </header>
        </>
    );
}
