"use client";

import { animate, motion, useInView, useMotionValue, useScroll, useSpring, useTransform, useVelocity, type MotionValue, type Variants } from "framer-motion";
import { useEffect, useId, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode, type RefObject } from "react";
import { formatCount } from "./arcade-portfolio-config";

// Primitif animasi tema Arcade. Semua menerima reduceMotion dan merender keadaan akhir bila true.
// Koreografi memakai variants: label "hidden"/"show" mengalir dari induk ke semua motion turunan,
// jadi urutan muncul diatur staggerChildren, bukan delay manual per elemen.

export const ARCADE_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const HOLO = "linear-gradient(90deg, #5EEAD4 0%, #A78BFA 38%, #F0ABFC 70%, #FDE68A 100%)";

type Reduce = { reduceMotion: boolean | null };

/** Item yang naik pelan sambil memudar masuk. */
export const riseItem: Variants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: ARCADE_EASE } },
};

/** Item yang meletup dengan pegas (chip, kotak title bar, penanda timeline). */
export const popItem: Variants = {
    hidden: { opacity: 0, scale: 0 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 520, damping: 16 } },
};

/** Item yang masuk dari kanan (isi timeline). */
export const slideItem: Variants = {
    hidden: { opacity: 0, x: 18 },
    show: { opacity: 1, x: 0, transition: { duration: 0.55, ease: ARCADE_EASE } },
};

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

const crtVariants: Variants = {
    hidden: { scaleX: 0.4, scaleY: 0.012, opacity: 0 },
    show: {
        scaleX: [0.4, 1, 1],
        scaleY: [0.012, 0.012, 1],
        opacity: [0, 1, 1],
        // Layar menyala dulu, baru isinya muncul berurutan.
        transition: { duration: 1, times: [0, 0.4, 1], ease: ARCADE_EASE, when: "beforeChildren", staggerChildren: 0.11 },
    },
};

/** Window menyala ala layar CRT, lalu memicu urutan muncul semua isinya. */
export function CrtBoot({ reduceMotion, children, className = "" }: Reduce & { children: ReactNode; className?: string }) {
    if (reduceMotion) return <div className={className}>{children}</div>;
    return (
        <motion.div className={className} variants={crtVariants} initial="hidden" animate="show">
            {children}
        </motion.div>
    );
}

/** Grup yang memicu anak-anaknya (variants) berurutan saat pertama terlihat. */
export function StaggerGroup({ reduceMotion, as = "div", stagger = 0.07, delay = 0, amount = 0.25, className, children }: Reduce & { as?: "div" | "ol" | "ul"; stagger?: number; delay?: number; amount?: number; className?: string; children: ReactNode }) {
    if (reduceMotion) {
        const Plain = as;
        return <Plain className={className}>{children}</Plain>;
    }
    const Component = (as === "ol" ? motion.ol : as === "ul" ? motion.ul : motion.div) as typeof motion.div;
    return (
        <Component
            className={className}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
        >
            {children}
        </Component>
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

const wipeVariants: Variants = {
    hidden: { x: "-101%" },
    show: { x: ["-101%", "0%", "101%"], transition: { duration: 0.9, times: [0, 0.5, 1], ease: "easeInOut" } },
};
// Teks muncul tepat saat sapuan menutupinya penuh (titik tengah sapuan).
const nameVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.01, delay: 0.34 } },
};

/** Nama dengan sapuan "wipe" hologram (ikut urutan CrtBoot) dan glitch RGB-split berkala. */
export function GlitchName({ text, reduceMotion, className, style }: Reduce & { text: string; className: string; style: CSSProperties }) {
    if (reduceMotion) return <h1 className={className} style={style}>{text}</h1>;
    const glitch = { duration: 0.32, times: [0, 0.3, 0.7, 1], repeat: Infinity, repeatDelay: 5.2 };
    return (
        <span className="relative block">
            <span className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
                <motion.span className="absolute inset-0" style={{ backgroundImage: HOLO }} variants={wipeVariants} />
            </span>
            <motion.h1 className={className} style={style} variants={nameVariants}>
                {text}
            </motion.h1>
            <motion.span
                className={`${className} pointer-events-none absolute inset-0 !bg-none !text-[#5EEAD4] mix-blend-screen`}
                aria-hidden="true"
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: [0, 0.85, 0.85, 0], x: [0, -6, 4, 0] }}
                transition={{ ...glitch, delay: 2.1 }}
            >
                {text}
            </motion.span>
            <motion.span
                className={`${className} pointer-events-none absolute inset-0 !bg-none !text-[#F0ABFC] mix-blend-screen`}
                aria-hidden="true"
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: [0, 0.85, 0.85, 0], x: [0, 6, -4, 0] }}
                transition={{ ...glitch, delay: 2.14 }}
            >
                {text}
            </motion.span>
        </span>
    );
}

const letterVariants: Variants = {
    hidden: { y: "60%", opacity: 0, scale: 0.6 },
    show: { y: "0%", opacity: 1, scale: 1, transition: { type: "spring", stiffness: 520, damping: 18 } },
};

/** Teks muncul huruf per huruf (untuk judul section, tanpa gradien). */
export function PopText({ text, reduceMotion }: Reduce & { text: string }) {
    if (reduceMotion) return <>{text}</>;
    return (
        <motion.span
            aria-label={text}
            className="inline-flex flex-wrap"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.6 }}
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035 } } }}
        >
            {Array.from(text).map((char, index) => (
                <motion.span key={`${char}-${index}`} aria-hidden="true" className="inline-block whitespace-pre" variants={letterVariants}>
                    {char}
                </motion.span>
            ))}
        </motion.span>
    );
}

/** Miring sesaat mengikuti kecepatan scroll; memberi kesan "inersia" pada judul. */
export function VelocitySkew({ reduceMotion, children }: Reduce & { children: ReactNode }) {
    const { scrollY } = useScroll();
    const velocity = useSpring(useVelocity(scrollY), { stiffness: 400, damping: 50 });
    const skewX = useTransform(velocity, [-3000, 0, 3000], [-8, 0, 8], { clamp: true });
    return <motion.div style={reduceMotion ? undefined : { skewX }}>{children}</motion.div>;
}

/**
 * Kedalaman saat menggulir melewati hero: isi mundur, mengecil, dan memudar.
 * Offset ["start start", "end start"]: 0 saat hero menempel di atas, 1 saat hero lewat.
 */
export function useHeroDepth(target: RefObject<HTMLElement>, reduceMotion: boolean | null) {
    const { scrollYProgress } = useScroll({ target, offset: ["start start", "end start"] });
    const y = useTransform(scrollYProgress, [0, 1], [0, 140]);
    const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
    const opacity = useTransform(scrollYProgress, [0, 0.85], [1, 0.15]);
    return reduceMotion ? undefined : { y, scale, opacity };
}

/** Parallax di dalam bingkai: nilai -range..range px selama elemen melintasi layar. */
export function useInnerParallax(target: RefObject<HTMLElement>, range: number) {
    const { scrollYProgress } = useScroll({ target, offset: ["start end", "end start"] });
    return useTransform(scrollYProgress, [0, 1], [-range, range]);
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

/** Kartu miring 3D mengikuti kursor, pantulan cahaya, tekan (tap) dan angkat saat fokus keyboard. */
export function TiltCard({ reduceMotion, className = "", children }: Reduce & { className?: string; children: ReactNode }) {
    const px = useMotionValue(0.5);
    const py = useMotionValue(0.5);
    const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), { stiffness: 200, damping: 20 });
    const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), { stiffness: 200, damping: 20 });
    const glareX = useTransform(px, [0, 1], ["-30%", "30%"]);
    const glareY = useTransform(py, [0, 1], ["-30%", "30%"]);
    const [active, setActive] = useState(false);
    const [focused, setFocused] = useState(false);

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
            // Fokus keyboard pada link di dalam kartu ikut mengangkat kartu (onFocus React ikut bubble).
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            animate={{ y: focused ? -6 : 0 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 24 }}
        >
            {children}
            <span className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <motion.span
                    className="absolute left-[-25%] top-[-25%] size-[150%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_45%)] mix-blend-overlay"
                    style={{ x: glareX, y: glareY }}
                    animate={{ opacity: active || focused ? 1 : 0 }}
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

const unlockVariants: Variants = {
    hidden: { rotateX: 90, opacity: 0 },
    // Kartu berputar masuk dulu, baru percikan pixel menyala.
    show: { rotateX: 0, opacity: 1, transition: { duration: 0.6, ease: ARCADE_EASE, when: "beforeChildren" } },
};
const sparkVariants: Variants = {
    hidden: { x: 0, y: 0, opacity: 0, scale: 0.5 },
    show: (spark: number) => {
        const angle = (spark / 6) * Math.PI * 2;
        return {
            x: Math.cos(angle) * 26,
            y: Math.sin(angle) * 26,
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.4],
            transition: { duration: 0.7, ease: "easeOut" },
        };
    },
};

/** Kartu achievement (anak StaggerGroup) yang berputar masuk lalu memercikkan pixel. */
export function Unlock({ reduceMotion, className = "", children }: Reduce & { className?: string; children: ReactNode }) {
    if (reduceMotion) return <div className={className}>{children}</div>;
    return (
        <motion.div
            className={`relative ${className}`}
            variants={unlockVariants}
            whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 18 } }}
            style={{ transformPerspective: 700 }}
        >
            {children}
            <span className="pointer-events-none absolute left-6 top-6" aria-hidden="true">
                {[0, 1, 2, 3, 4, 5].map((spark) => (
                    <motion.span key={spark} custom={spark} variants={sparkVariants} className={`absolute size-1.5 ${spark % 2 ? "bg-[#FDE68A]" : "bg-[#5EEAD4]"}`} />
                ))}
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
