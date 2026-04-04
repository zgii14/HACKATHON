"use client";

import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn, NAV_LINKS } from "@/utils";
import { useClerk } from "@clerk/nextjs";
import { ZapIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from 'react';
import MaxWidthWrapper from "../global/max-width-wrapper";
import MobileNavbar from "./mobile-navbar";
import AnimationContainer from "../global/animation-container";

const Navbar = () => {

    const { user } = useClerk();
    const [scroll, setScroll] = useState(false);

    const handleScroll = () => {
        if (window.scrollY > 8) {
            setScroll(true);
        } else {
            setScroll(false);
        }
    };

    useEffect(() => {
        window.addEventListener("scroll", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    return (
        <header className={cn(
            "sticky top-0 inset-x-0 w-full z-[99999] select-none transition-all duration-500",
            scroll ? "py-2" : "py-4"
        )}>
            <AnimationContainer reverse delay={0.1} className="size-full">
                <MaxWidthWrapper>
                    <div className={cn(
                        "relative flex items-center justify-between h-14 px-4 rounded-2xl transition-all duration-500",
                        scroll
                            ? "bg-background/70 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                            : "bg-transparent"
                    )}>

                        {/* Left: Logo */}
                        <Link href="/#home" className="flex items-center z-10">
                            <svg width="110" height="30" viewBox="0 0 180 60" xmlns="http://www.w3.org/2000/svg" aria-label="GitHire">
                                <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                                <circle cx="16" cy="44" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                                <circle cx="34" cy="30" r="6" fill="#6d28d9" />
                                <line x1="16" y1="22" x2="16" y2="38" stroke="currentColor" strokeWidth="2" />
                                <line x1="20" y1="18" x2="30" y2="26" stroke="currentColor" strokeWidth="2" />
                                <text x="50" y="30" fontFamily="system-ui,sans-serif" fontSize="22" fontWeight="700" fill="currentColor" dominantBaseline="central">
                                    Git<tspan fill="#8b5cf6">Hire</tspan>
                                </text>
                            </svg>
                        </Link>

                        {/* Center: Nav (absolutely centered) */}
                        <div className="absolute left-1/2 -translate-x-1/2 hidden lg:flex">
                            <NavigationMenu>
                                <NavigationMenuList className="gap-1">
                                    {NAV_LINKS.map((link) => (
                                        <NavigationMenuItem key={link.title}>
                                            <Link href={link.href} legacyBehavior passHref>
                                                <NavigationMenuLink className={cn(
                                                    navigationMenuTriggerStyle(),
                                                    "bg-transparent hover:bg-white/[0.06] text-neutral-300 hover:text-white transition-all duration-200 rounded-xl text-sm font-medium"
                                                )}>
                                                    {link.title}
                                                </NavigationMenuLink>
                                            </Link>
                                        </NavigationMenuItem>
                                    ))}
                                </NavigationMenuList>
                            </NavigationMenu>
                        </div>

                        {/* Right: CTA Buttons */}
                        <div className="hidden lg:flex items-center gap-3 z-10">
                            {user ? (
                                <Link
                                    href="/dashboard"
                                    className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href="/auth/sign-in"
                                        className="px-4 py-2 rounded-xl text-sm font-medium text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-all duration-200"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        href="/auth/sign-up"
                                        className="relative inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white overflow-hidden group"
                                        style={{
                                            background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                                            boxShadow: "0 0 20px rgba(124,58,237,0.35), 0 4px 12px rgba(0,0,0,0.3)"
                                        }}
                                    >
                                        {/* Shimmer overlay */}
                                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                                        <span className="relative">Get Started</span>
                                        <ZapIcon className="relative h-3.5 w-3.5 text-yellow-300 fill-yellow-300" />
                                    </Link>
                                </>
                            )}
                        </div>

                        <MobileNavbar />

                    </div>
                </MaxWidthWrapper>
            </AnimationContainer>
        </header>
    )
};

export default Navbar
