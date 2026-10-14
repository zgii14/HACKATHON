"use client";

import { cn } from "@/utils";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

const THEMES = [
    { key: "editorial", label: "Editorial" },
    { key: "developer", label: "Developer" },
    { key: "professional", label: "Professional" },
    { key: "maestro", label: "Maestro" },
] as const;

type ThemeKey = (typeof THEMES)[number]["key"];

// Portfolio dirender selebar desktop lalu diperkecil, supaya tiap tema tampil persis aslinya.
const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 800;

type Props = { publicId: string; ownerName: string };

/**
 * Panggung hero: poster WebP tiap tema tampil seketika (LCP berupa gambar),
 * iframe portfolio asli baru dipasang saat browser menganggur atau saat
 * pengunjung berinteraksi, dan tidak pernah dipasang dalam mode hemat data.
 */
export function PortfolioStage({ publicId, ownerName }: Props) {
    const [theme, setTheme] = useState<ThemeKey>("editorial");
    // Poster hanya dipasang setelah temanya pernah dipilih: unduhan awal cukup satu gambar.
    const [seen, setSeen] = useState<ThemeKey[]>(["editorial"]);
    const [live, setLive] = useState(false);
    const [loadedTheme, setLoadedTheme] = useState<ThemeKey | null>(null);
    const [scale, setScale] = useState(0);
    const viewport = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const goLive = useCallback(() => {
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
        if (!connection?.saveData) setLive(true);
    }, []);

    useEffect(() => {
        const idle = window.requestIdleCallback
            ? window.requestIdleCallback(goLive, { timeout: 4000 })
            : window.setTimeout(goLive, 2500);
        return () => {
            if (window.cancelIdleCallback) window.cancelIdleCallback(idle as number);
            else window.clearTimeout(idle as number);
        };
    }, [goLive]);

    useEffect(() => {
        const element = viewport.current;
        if (!element) return;
        const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / FRAME_WIDTH));
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const selectTheme = (next: ThemeKey) => {
        setTheme(next);
        setSeen((current) => (current.includes(next) ? current : [...current, next]));
        goLive();
    };

    const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
        event.preventDefault();
        const next = (index + (event.key === "ArrowRight" ? 1 : THEMES.length - 1)) % THEMES.length;
        selectTheme(THEMES[next].key);
        tabRefs.current[next]?.focus();
    };

    const src = `/p/${publicId}?theme=${theme}&embed=1`;
    const iframeReady = live && loadedTheme === theme;

    return (
        <div>
            <div className="flex justify-center">
                <div role="tablist" aria-label="Tema portfolio" className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-border bg-muted/60 p-1">
                    {THEMES.map((item, index) => (
                        <button
                            key={item.key}
                            ref={(node) => {
                                tabRefs.current[index] = node;
                            }}
                            type="button"
                            role="tab"
                            aria-selected={theme === item.key}
                            tabIndex={theme === item.key ? 0 : -1}
                            onClick={() => selectTheme(item.key)}
                            onKeyDown={(event) => onTabKey(event, index)}
                            className={cn(
                                "shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                theme === item.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <div
                className="mt-4 overflow-hidden rounded-xl border border-border bg-muted shadow-[0_24px_70px_-20px_rgba(76,29,149,0.28)]"
                onPointerEnter={goLive}
                onFocus={goLive}
            >
                <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-2.5">
                    <span className="flex gap-1.5" aria-hidden="true">
                        <span className="size-2.5 rounded-full bg-border" />
                        <span className="size-2.5 rounded-full bg-border" />
                        <span className="size-2.5 rounded-full bg-border" />
                    </span>
                    <span className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/50 px-3 py-1 text-[12px] text-muted-foreground">
                        githire.my.id/p/{publicId}
                    </span>
                </div>
                <div ref={viewport} role="tabpanel" className="relative aspect-[16/10] w-full overflow-hidden bg-background">
                    {THEMES.filter((item) => seen.includes(item.key)).map((item, index) => (
                        <Image
                            key={item.key}
                            src={`/landing/portfolio-${item.key}.webp`}
                            alt={item.key === theme ? `Portfolio ${ownerName} dengan tema ${item.label}` : ""}
                            fill
                            priority={index === 0}
                            sizes="(min-width: 1152px) 1088px, 100vw"
                            className={cn("object-cover object-top transition-opacity duration-300", item.key === theme ? "opacity-100" : "opacity-0")}
                        />
                    ))}
                    {live && scale > 0 && (
                        <iframe
                            key={src}
                            src={src}
                            title={`Portfolio ${ownerName}, tema ${theme}`}
                            sandbox="allow-scripts allow-same-origin allow-popups"
                            loading="lazy"
                            onLoad={() => setLoadedTheme(theme)}
                            className={cn("absolute left-0 top-0 origin-top-left border-0 transition-opacity duration-500", iframeReady ? "opacity-100" : "opacity-0")}
                            style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT, transform: `scale(${scale})` }}
                        />
                    )}
                </div>
            </div>
            <p className="mt-3 text-center text-[13px] text-muted-foreground">Portfolio {ownerName}, dibuat dengan GitHire.</p>
        </div>
    );
}
