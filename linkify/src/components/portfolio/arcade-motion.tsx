"use client";

import { animate, motion, useInView, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { formatCount } from "./arcade-portfolio-config";

// Primitif animasi tema Arcade. Semua menerima reduceMotion dan merender keadaan akhir bila true.

export const ARCADE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const HOLO = "linear-gradient(90deg, #5EEAD4 0%, #A78BFA 38%, #F0ABFC 70%, #FDE68A 100%)";

type Reduce = { reduceMotion: boolean | null };

/** Progress bar hologram di atas layar, terisi seiring scroll halaman. */
export function XpBar({ reduceMotion }: Reduce) {
    const { scrollYProgress } = useScroll();
    const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
    return (
        <motion.div
            className="fixed inset-x-0 top-0 z-50 h-1 origin-left"
            style={{ backgroundImage: HOLO, scaleX: reduceMotion ? scrollYProgress : smooth }}
            aria-hidden="true"
        />
    );
}

/** Window menyala ala layar CRT: garis tipis lalu membuka penuh. */
export function CrtBoot({ reduceMotion, children, className = "" }: Reduce & { children: ReactNode; className?: string }) {
    if (reduceMotion) return <div className={className}>{children}</div>;
    return (
        <motion.div
            className={className}
            initial={{ scaleX: 0.4, scaleY: 0.012, opacity: 0 }}
            animate={{ scaleX: [0.4, 1, 1], scaleY: [0.012, 0.012, 1], opacity: [0, 1, 1] }}
            transition={{ duration: 1, times: [0, 0.4, 1], ease: ARCADE_EASE }}
        >
            {children}
        </motion.div>
    );
}

/** Kilau diagonal yang menyapu permukaan secara berkala. */
export function Shimmer({ reduceMotion, delay = 1.4 }: Reduce & { delay?: number }) {
    if (reduceMotion) return null;
    return (
        <span className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <motion.span
                className="absolute inset-y-[-20%] left-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent mix-blend-overlay"
                initial={{ x: "-150%" }}
                animate={{ x: "420%" }}
                transition={{ duration: 1.6, delay, repeat: Infinity, repeatDelay: 4.5, ease: "easeInOut" }}
            />
        </span>
    );
}

/** Nama dengan sapuan "wipe" hologram saat masuk dan glitch RGB-split berkala. */
export function GlitchName({ text, reduceMotion, className, style }: Reduce & { text: string; className: string; style: CSSProperties }) {
    if (reduceMotion) return <h1 className={className} style={style}>{text}</h1>;
    const glitch = { duration: 0.32, times: [0, 0.3, 0.7, 1], repeat: Infinity, repeatDelay: 5.2 };
    return (
        <span className="relative block">
            <motion.h1 className={className} style={style} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.01, delay: 1.25 }}>
                {text}
            </motion.h1>
            <motion.span
                className={`${className} pointer-events-none absolute inset-0 !bg-none !text-[#5EEAD4] mix-blend-screen`}
                aria-hidden="true"
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: [0, 0.85, 0.85, 0], x: [0, -6, 4, 0] }}
                transition={{ ...glitch, delay: 1.3 }}
            >
                {text}
            </motion.span>
            <motion.span
                className={`${className} pointer-events-none absolute inset-0 !bg-none !text-[#F0ABFC] mix-blend-screen`}
                aria-hidden="true"
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: [0, 0.85, 0.85, 0], x: [0, 6, -4, 0] }}
                transition={{ ...glitch, delay: 1.34 }}
            >
                {text}
            </motion.span>
            <span className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <motion.span
                    className="absolute inset-0"
                    style={{ backgroundImage: HOLO }}
                    initial={{ x: "-101%" }}
                    animate={{ x: ["-101%", "0%", "101%"] }}
                    transition={{ duration: 0.9, delay: 0.85, times: [0, 0.45, 1], ease: "easeInOut" }}
                />
            </span>
        </span>
    );
}

/** Teks muncul huruf per huruf (untuk judul section, tanpa gradien). */
export function PopText({ text, reduceMotion }: Reduce & { text: string }) {
    if (reduceMotion) return <>{text}</>;
    return (
        <span aria-label={text} className="inline-flex flex-wrap">
            {Array.from(text).map((char, index) => (
                <motion.span
                    key={`${char}-${index}`}
                    aria-hidden="true"
                    className="inline-block whitespace-pre"
                    initial={{ y: "60%", opacity: 0, scale: 0.6 }}
                    whileInView={{ y: "0%", opacity: 1, scale: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ type: "spring", stiffness: 520, damping: 18, delay: index * 0.035 }}
                >
                    {char}
                </motion.span>
            ))}
        </span>
    );
}

/** Nilai pointer ternormalisasi (-0.5..0.5) untuk parallax; hanya mouse, bukan sentuhan. */
export function usePointerParallax(reduceMotion: boolean | null) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 60, damping: 18 });
    const sy = useSpring(y, { stiffness: 60, damping: 18 });
    const onPointerMove = (event: PointerEvent<HTMLElement>) => {
        if (reduceMotion || event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - rect.left) / rect.width - 0.5);
        y.set((event.clientY - rect.top) / rect.height - 0.5);
    };
    return { sx, sy, onPointerMove };
}

export function ParallaxLayer({ sx, sy, depth, className = "", children }: { sx: MotionValue<number>; sy: MotionValue<number>; depth: number; className?: string; children: ReactNode }) {
    const x = useTransform(sx, (value) => value * depth);
    const y = useTransform(sy, (value) => value * depth);
    return <motion.div className={className} style={{ x, y }}>{children}</motion.div>;
}

/** Kartu miring 3D mengikuti kursor, dengan pantulan cahaya. */
export function TiltCard({ reduceMotion, className = "", children }: Reduce & { className?: string; children: ReactNode }) {
    const px = useMotionValue(0.5);
    const py = useMotionValue(0.5);
    const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), { stiffness: 200, damping: 20 });
    const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), { stiffness: 200, damping: 20 });
    const glareX = useTransform(px, [0, 1], ["-30%", "30%"]);
    const glareY = useTransform(py, [0, 1], ["-30%", "30%"]);
    const [active, setActive] = useState(false);

    if (reduceMotion) return <div className={className}>{children}</div>;

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        px.set((event.clientX - rect.left) / rect.width);
        py.set((event.clientY - rect.top) / rect.height);
        setActive(true);
    };
    const reset = () => {
        px.set(0.5);
        py.set(0.5);
        setActive(false);
    };

    return (
        <motion.div
            className={`relative ${className}`}
            style={{ rotateX, rotateY, transformPerspective: 900 }}
            onPointerMove={onPointerMove}
            onPointerLeave={reset}
        >
            {children}
            <span className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <motion.span
                    className="absolute left-[-25%] top-[-25%] size-[150%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_45%)] mix-blend-overlay"
                    style={{ x: glareX, y: glareY }}
                    animate={{ opacity: active ? 1 : 0 }}
                    transition={{ duration: 0.25 }}
                />
            </span>
        </motion.div>
    );
}

/** Garis gelombang hologram yang menggambar dirinya saat terlihat. */
export function DrawWave({ reduceMotion }: Reduce) {
    const id = useId().replace(/:/g, "");
    const path = Array.from({ length: 8 }, (_, index) => `Q ${index * 150 + 75} ${index % 2 ? 36 : 4} ${index * 150 + 150} 20`).join(" ");
    return (
        <svg viewBox="0 0 1200 40" preserveAspectRatio="none" className="block h-8 w-full" aria-hidden="true">
            <defs>
                <linearGradient id={`holo-${id}`} x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#5EEAD4" />
                    <stop offset="38%" stopColor="#A78BFA" />
                    <stop offset="70%" stopColor="#F0ABFC" />
                    <stop offset="100%" stopColor="#FDE68A" />
                </linearGradient>
            </defs>
            <motion.path
                d={`M 0 20 ${path}`}
                fill="none"
                stroke={`url(#holo-${id})`}
                strokeWidth="3"
                vectorEffect="non-scaling-stroke"
                initial={reduceMotion ? false : { pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 1.6, ease: ARCADE_EASE }}
            />
        </svg>
    );
}

/** Angka yang menghitung naik saat pertama terlihat. */
export function CountUp({ value, reduceMotion }: Reduce & { value?: number | null }) {
    const ref = useRef<HTMLSpanElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.6 });
    const target = typeof value === "number" && value > 0 ? value : 0;
    const [display, setDisplay] = useState(reduceMotion ? target : 0);

    useEffect(() => {
        if (reduceMotion) {
            setDisplay(target);
            return;
        }
        if (!inView) return;
        const controls = animate(0, target, { duration: 1.2, ease: ARCADE_EASE, onUpdate: (latest) => setDisplay(Math.round(latest)) });
        return () => controls.stop();
    }, [inView, reduceMotion, target]);

    return <span ref={ref}>{formatCount(display)}</span>;
}

/** Kartu achievement yang berputar masuk lalu memercikkan pixel. */
export function Unlock({ reduceMotion, index, className = "", children }: Reduce & { index: number; className?: string; children: ReactNode }) {
    if (reduceMotion) return <div className={className}>{children}</div>;
    const delay = 0.15 + index * 0.09;
    return (
        <motion.div
            className={`relative ${className}`}
            initial={{ rotateX: 90, opacity: 0 }}
            whileInView={{ rotateX: 0, opacity: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, delay, ease: ARCADE_EASE }}
            style={{ transformPerspective: 700 }}
        >
            {children}
            <span className="pointer-events-none absolute left-6 top-6" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5].map((spark) => {
                    const angle = (spark / 6) * Math.PI * 2;
                    return (
                        <motion.span
                            key={spark}
                            className={`absolute size-1.5 ${spark % 2 ? "bg-[#FDE68A]" : "bg-[#5EEAD4]"}`}
                            initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                            whileInView={{ x: Math.cos(angle) * 26, y: Math.sin(angle) * 26, opacity: [0, 1, 0], scale: [0.5, 1, 0.4] }}
                            viewport={{ once: true, amount: 0.4 }}
                            transition={{ duration: 0.7, delay: delay + 0.45, ease: "easeOut" }}
                        />
                    );
                })}
            </span>
        </motion.div>
    );
}

/** Garis vertikal timeline yang tumbuh dari atas. */
export function GrowLine({ reduceMotion, className }: Reduce & { className: string }) {
    return (
        <motion.span
            className={`${className} origin-top`}
            initial={reduceMotion ? false : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 1.1, ease: ARCADE_EASE }}
            aria-hidden="true"
        />
    );
}
