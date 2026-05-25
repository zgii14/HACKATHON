"use client";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetTrigger
} from "@/components/ui/sheet";
import { cn, NAV_LINKS } from "@/utils";
import { useAuth } from "@clerk/nextjs";
import { LucideIcon, Menu, X, ZapIcon } from "lucide-react";
import Link from "next/link";
import React, { useState } from 'react';

const MobileNavbar = () => {

    const { isSignedIn } = useAuth();
    const [isOpen, setIsOpen] = useState<boolean>(false);

    const handleClose = () => {
        setIsOpen(false);
    };

    return (
        <div className="flex lg:hidden items-center justify-end">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-xl text-neutral-300 hover:text-white hover:bg-white/[0.08] transition-all duration-200"
                    >
                        <Menu className="w-5 h-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent className="w-screen border-none bg-[#0a0a0f]/95 backdrop-blur-2xl">
                    <SheetClose asChild className="absolute top-4 right-4 z-20">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.08]"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </SheetClose>

                    {/* Logo */}
                    <div className="flex items-center pt-2 pb-6 border-b border-white/[0.06]">
                        <svg width="100" height="28" viewBox="0 0 180 60" xmlns="http://www.w3.org/2000/svg" aria-label="GitHire">
                            <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                            <circle cx="16" cy="44" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                            <circle cx="34" cy="30" r="6" fill="#6d28d9" />
                            <line x1="16" y1="22" x2="16" y2="38" stroke="currentColor" strokeWidth="2" />
                            <line x1="20" y1="18" x2="30" y2="26" stroke="currentColor" strokeWidth="2" />
                            <text x="50" y="30" fontFamily="system-ui,sans-serif" fontSize="22" fontWeight="700" fill="currentColor" dominantBaseline="central">
                                Git<tspan fill="#8b5cf6">Hire</tspan>
                            </text>
                        </svg>
                    </div>

                    <div className="flex flex-col w-full mt-6 gap-4">
                        {/* CTA Buttons */}
                        <div className="flex items-center gap-3">
                            {isSignedIn ? (
                                <Link
                                    href="/dashboard"
                                    onClick={handleClose}
                                    className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all duration-300 shadow-lg shadow-violet-500/25"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href="/auth/sign-in"
                                        onClick={handleClose}
                                        className="flex-1 flex items-center justify-center py-2.5 rounded-xl text-sm font-medium text-neutral-300 hover:text-white border border-white/[0.10] hover:border-white/[0.20] bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        href="/auth/sign-up"
                                        onClick={handleClose}
                                        className="relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-white overflow-hidden group"
                                        style={{
                                            background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                                            boxShadow: "0 0 20px rgba(124,58,237,0.35)"
                                        }}
                                    >
                                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                        <span className="relative">Get Started</span>
                                        <ZapIcon className="relative h-3.5 w-3.5 text-yellow-300 fill-yellow-300" />
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Nav Links */}
                        <ul className="flex flex-col w-full divide-y divide-white/[0.06]">
                            {NAV_LINKS.map((link) => (
                                <li key={link.title}>
                                    <Link
                                        href={link.href!}
                                        onClick={handleClose}
                                        className="flex items-center w-full py-4 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                                    >
                                        {link.title}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    )
};

const ListItem = React.forwardRef<
    React.ElementRef<"a">,
    React.ComponentPropsWithoutRef<"a"> & { title: string; icon: LucideIcon }
>(({ className, title, href, icon: Icon, children, ...props }, ref) => {
    return (
        <li>
            <Link
                href={href!}
                ref={ref}
                className={cn(
                    "group flex items-start gap-3 select-none rounded-xl p-3 leading-none no-underline outline-none transition-all duration-200 hover:bg-white/[0.06]",
                    className
                )}
                {...props}
            >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                    <Icon className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                    <h6 className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">
                        {title}
                    </h6>
                    <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-neutral-500 group-hover:text-neutral-400 transition-colors">
                        {children}
                    </p>
                </div>
            </Link>
        </li>
    )
})
ListItem.displayName = "ListItem"

export default MobileNavbar
