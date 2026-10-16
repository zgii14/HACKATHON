"use client";

import { cn } from "@/utils";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

const THEMES = [
    { key: "editorial", label: "Editorial" },
    { key: "developer", label: "Developer" },
    { key: "professional", label: "Professional" },
    { key: "maestro", label: "Maestro" },
    { key: "arcade", label: "Arcade" },
    { key: "fold", label: "Fold" },
] as const;

type ThemeKey = (typeof THEMES)[number]["key"];

// Portfolio dirender selebar desktop lalu diperkecil, supaya tiap tema tampil persis aslinya.
const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 800;
// Lama satu tema tampil saat berganti otomatis; garis progres di tab mengikuti durasi ini.
const CYCLE_MS = 4500;

type Props = { publicId: string; ownerName: string };

/**
 * Panggung hero: poster WebP tiap tema tampil seketika (LCP berupa gambar).
 *
 * Selama pengunjung belum menyentuhnya, panggung berganti tema sendiri (hanya
 * poster) dengan garis progres di tab aktif, dan berhenti saat di luar layar,
 * tab browser tersembunyi, atau prefers-reduced-motion. Begitu pengunjung
 * berinteraksi, pergantian otomatis berhenti dan iframe portfolio asli (JS
 * halaman /p + foto) dipasang, hanya di layar >= 768px (di HP iframe 1280px
 * diperkecil jadi tak terbaca), dan tidak pernah dalam mode hemat data.
 */
export function PortfolioStage({ publicId, ownerName }: Props) {
    const [theme, setTheme] = useState<ThemeKey>("editorial");
    // Poster hanya dipasang setelah temanya pernah (atau akan segera) tampil: unduhan awal cukup satu gambar.
    const [seen, setSeen] = useState<ThemeKey[]>(["editorial"]);
    const [live, setLive] = useState(false);
    const [loadedTheme, setLoadedTheme] = useState<ThemeKey | null>(null);
    const [scale, setScale] = useState(0);
    const [auto, setAuto] = useState(false);
    const [running, setRunning] = useState(false);
    const stage = useRef<HTMLDivElement>(null);
    const viewport = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const remember = useCallback((key: ThemeKey) => {
        setSeen((current) => (current.includes(key) ? current : [...current, key]));
    }, []);

    // Pengunjung mengambil alih: hentikan pergantian otomatis, pasang iframe asli.
    const takeOver = useCallback(() => {
        setAuto(false);
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
        if (!connection?.saveData && window.matchMedia("(min-width: 768px)").matches) setLive(true);
    }, []);

    useEffect(() => {
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAuto(true);
    }, []);

    // Garis progres hanya berjalan saat panggung terlihat dan tab browser aktif.
    useEffect(() => {
        const element = stage.current;
        if (!auto || !element) return;
        let visible = false;
        const sync = () => setRunning(visible && document.visibilityState === "visible");
        const observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            sync();
        }, { threshold: 0.35 });
        observer.observe(element);
        document.addEventListener("visibilitychange", sync);
        return () => {
            observer.disconnect();
            document.removeEventListener("visibilitychange", sync);
        };
    }, [auto]);

    // Unduh poster tema berikutnya selama tema sekarang tampil, supaya pergantian tidak berkedip.
    const nextKey = THEMES[(THEMES.findIndex((item) => item.key === theme) + 1) % THEMES.length].key;
    useEffect(() => {
        if (auto && running) remember(nextKey);
    }, [auto, running, nextKey, remember]);

    useEffect(() => {
        const element = viewport.current;
        if (!element) return;
        const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / FRAME_WIDTH));
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const selectTheme = (next: ThemeKey) => {
        setTheme(next);
        remember(next);
        takeOver();
    };

    const advance = () => setTheme(nextKey);

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
        <div ref={stage}>
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
                                "relative shrink-0 overflow-hidden rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                theme === item.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {item.label}
                            {auto && theme === item.key && (
                                <span
                                    key={item.key}
                                    aria-hidden="true"
                                    onAnimationEnd={advance}
                                    className="landing-progress absolute inset-x-4 bottom-1 h-0.5 rounded-full bg-primary/70"
                                    style={{ "--duration": `${CYCLE_MS}ms`, animationPlayState: running ? "running" : "paused" } as CSSProperties}
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div
                className="mt-4 overflow-hidden rounded-xl border border-border bg-muted shadow-[0_24px_70px_-20px_rgba(76,29,149,0.28)]"
                // Hanya mouse: jari yang menggulir melewati panggung di HP tidak dihitung "mengambil alih".
                onPointerEnter={(event) => event.pointerType === "mouse" && takeOver()}
                onFocus={takeOver}
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
                            className={cn(
                                "object-cover object-top transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                                item.key === theme ? "scale-100 opacity-100" : "scale-[1.015] opacity-0",
                            )}
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
