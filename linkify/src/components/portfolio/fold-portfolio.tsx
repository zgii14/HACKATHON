"use client";

import { motion } from "framer-motion";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Sofia_Sans_Extra_Condensed } from "next/font/google";
import { useEffect, useState } from "react";
import { cn } from "@/utils/functions/cn";
import { FoldPhone, FoldStage } from "./fold-device";
import { FOLD_BACKDROPS, FOLD_BEZELS, FOLD_PREFS_KEY, getFoldCopy, isSectionOn, parseFoldPrefs, type FoldBackdrop, type FoldBezel, type FoldPrefs } from "./fold-portfolio-config";
import { DISPLAY, MONO, ProjectTile } from "./fold-scenes";
import type { PublicPortfolio } from "./types";

// Font tema Fold (keputusan user: persis referensi). next/font men-self-host, hanya ikut di chunk tema ini.
const sofia = Sofia_Sans_Extra_Condensed({
    weight: "900",
    subsets: ["latin"],
    display: "swap",
    variable: "--font-fold-display",
});

type FoldPortfolioProps = {
    portfolio: PublicPortfolio;
    apiBase: string;
    contacts: Array<[string, string]>;
};

// Posisi tile Orbit di sekeliling device (persen viewport), rotasi kecil agar terasa melayang.
const ORBIT_SLOTS = [
    { left: "8%", top: "16%", rotate: -8 },
    { left: "84%", top: "12%", rotate: 7 },
    { left: "4%", top: "58%", rotate: 6 },
    { left: "88%", top: "54%", rotate: -6 },
    { left: "16%", top: "80%", rotate: 9 },
    { left: "76%", top: "82%", rotate: -10 },
];

export function FoldPortfolio({ portfolio, apiBase, contacts }: FoldPortfolioProps) {
    const content = portfolio.content;
    const copy = getFoldCopy(content.language);
    const [prefs, setPrefs] = useState<FoldPrefs>({
        backdrop: "basic",
        bezel: "silver",
    });
    const projects = isSectionOn(content, "projects") ? (content.projects ?? []) : [];
    const backdrops = FOLD_BACKDROPS.filter((item) => item !== "orbit" || projects.length > 0);
    const backdrop = backdrops.includes(prefs.backdrop) ? prefs.backdrop : "basic";

    // localStorage hanya dibaca setelah mount agar render server = render pertama client.
    useEffect(() => {
        try {
            setPrefs(parseFoldPrefs(window.localStorage.getItem(FOLD_PREFS_KEY)));
        } catch {
            /* storage diblokir: pakai default */
        }
    }, []);

    const update = (next: Partial<FoldPrefs>) => {
        setPrefs((current) => {
            const merged = { ...current, ...next };
            try {
                window.localStorage.setItem(FOLD_PREFS_KEY, JSON.stringify(merged));
            } catch {
                /* abaikan */
            }
            return merged;
        });
    };

    const sceneProps = { portfolio, apiBase, copy, contacts };

    return (
        <main
            lang={content.language}
            className={cn(
                sofia.variable,
                GeistSans.variable,
                GeistMono.variable,
                "relative min-h-screen overflow-x-clip bg-[#f5f4f2] text-[#111111] [font-family:var(--font-geist-sans)] selection:bg-[#111111] selection:text-white",
            )}
        >
            <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-4 md:px-7">
                <p className={cn("pointer-events-auto max-w-[44vw] truncate text-[20px] leading-none md:max-w-[60vw] md:text-[22px]", DISPLAY)}>
                    {content.name || "Portfolio"}
                    <sup className="text-[0.5em]">®</sup>
                </p>
                <div className="pointer-events-auto flex rounded-full bg-white/80 p-1 shadow-[0_6px_24px_-12px_rgba(0,0,0,0.35)] backdrop-blur" role="radiogroup" aria-label={copy.backdropLabel}>
                    {backdrops.map((item) => (
                        <button
                            key={item}
                            type="button"
                            role="radio"
                            aria-checked={backdrop === item}
                            onClick={() => update({ backdrop: item })}
                            className={cn(
                                "relative rounded-full px-2.5 py-1.5 text-[12px] font-medium transition-colors md:px-3.5 md:text-[13px]",
                                backdrop === item ? "text-white" : "text-[#111111]/70 hover:text-[#111111]",
                            )}
                        >
                            {backdrop === item && (
                                <motion.span layoutId="fold-backdrop-active" className="absolute inset-0 rounded-full bg-[#111111]" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                            )}
                            <span className="relative">{copy.backdrops[item]}</span>
                        </button>
                    ))}
                </div>
            </header>

            <Backdrop kind={backdrop} portfolio={portfolio} />
            {/* Desktop/tablet vs HP dipilih CSS, bukan JS, supaya SSR dan hidrasi selalu sama. */}
            <div className="relative z-10 hidden md:block">
                <FoldStage {...sceneProps} bezel={FOLD_BEZELS[prefs.bezel]} />
            </div>
            <div className="relative z-10 md:hidden">
                <FoldPhone {...sceneProps} bezel={FOLD_BEZELS[prefs.bezel]} />
            </div>
            <div
                className="fixed bottom-3 left-1/2 md:bottom-5 z-50 flex -translate-x-1/2 gap-2 rounded-full bg-white/80 p-1.5 shadow-[0_6px_24px_-12px_rgba(0,0,0,0.35)] backdrop-blur"
                role="radiogroup"
                aria-label={copy.bezelLabel}
            >
                {(Object.keys(FOLD_BEZELS) as FoldBezel[]).map((item) => (
                    <button
                        key={item}
                        type="button"
                        role="radio"
                        aria-checked={prefs.bezel === item}
                        aria-label={copy.bezels[item]}
                        onClick={() => update({ bezel: item })}
                        className={cn("size-6 rounded-full border border-black/10 transition-transform hover:scale-110", prefs.bezel === item && "ring-2 ring-[#111111] ring-offset-2")}
                        style={{ backgroundColor: FOLD_BEZELS[item] }}
                    />
                ))}
            </div>

            <footer className={cn("relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#111111]/10 px-5 pb-24 pt-6 text-[#111111]/55 md:px-7 md:pb-20", MONO)}>
                <span>
                    © {new Date().getFullYear()} {content.name || "Portfolio"}
                </span>
                <span>
                    {copy.madeWith} <strong className="text-[#111111]">GitHire</strong>
                </span>
            </footer>
        </main>
    );
}

function Backdrop({ kind, portfolio }: { kind: FoldBackdrop; portfolio: PublicPortfolio }) {
    if (kind === "glow") {
        return (
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
                <motion.div
                    className="absolute left-[20%] top-[15%] h-[70vh] w-[60vw] rounded-full bg-[#f59e3b]/55 blur-[110px]"
                    animate={{ x: ["-6%", "6%", "-6%"], y: ["-4%", "5%", "-4%"] }}
                    transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                    className="absolute left-[38%] top-[30%] h-[40vh] w-[34vw] rounded-full bg-[#a855f7]/30 blur-[100px]"
                    animate={{ x: ["8%", "-8%", "8%"] }}
                    transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>
        );
    }
    if (kind === "orbit") {
        const projects = portfolio.content.projects ?? [];
        return (
            <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
                {projects.slice(0, ORBIT_SLOTS.length).map((project, index) => {
                    const slot = ORBIT_SLOTS[index];
                    return (
                        <div key={project.repo_name} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: slot.left, top: slot.top }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.6, rotate: slot.rotate }}
                                animate={{
                                    opacity: 1,
                                    scale: 1,
                                    rotate: slot.rotate,
                                    y: [0, -14, 0],
                                }}
                                transition={{
                                    opacity: { delay: 0.1 * index },
                                    scale: {
                                        delay: 0.1 * index,
                                        ease: [0.16, 1, 0.3, 1],
                                        duration: 0.8,
                                    },
                                    y: {
                                        duration: 5 + index,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                    },
                                }}
                            >
                                <ProjectTile
                                    project={project}
                                    className="size-16 rounded-[16px] p-2 text-[18px] md:size-24 md:rounded-[22px] md:p-3 md:text-[26px] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.5)]"
                                />
                            </motion.div>
                        </div>
                    );
                })}
            </div>
        );
    }
    return null;
}
