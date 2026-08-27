"use client";

import { motion, useReducedMotion } from "framer-motion";

export function AnimatedOrb() {
    const reduced = useReducedMotion();
    const C = 300;
    const spokes = 8;
    const rings = [90, 170, 250];
    const angles = Array.from({ length: spokes }, (_, i) => ((i * 360) / spokes) * (Math.PI / 180));
    const node = (r: number, a: number): [number, number] => [C + r * Math.cos(a), C + r * Math.sin(a)];

    return (
        <svg viewBox="0 0 600 600" className="h-auto w-full" fill="none" aria-hidden="true">
            <defs>
                <radialGradient id="orb-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35" />
                    <stop offset="55%" stopColor="#a78bfa" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="orb-path" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#e879f9" />
                </linearGradient>
            </defs>

            {/* Glow — subtle breathing */}
            <motion.circle
                cx={C}
                cy={C}
                r={250}
                fill="url(#orb-glow)"
                animate={reduced ? undefined : { scale: [1, 1.04, 1], opacity: [0.9, 1, 0.9] }}
                transition={reduced ? undefined : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: "300px 300px" }}
            />

            {/* Rings */}
            {/* inner solid */}
            <circle cx={C} cy={C} r={90} stroke="rgba(255,255,255,0.06)" />
            {/* middle — slow counter rotation */}
            <motion.circle
                cx={C}
                cy={C}
                r={170}
                stroke="rgba(255,255,255,0.06)"
                animate={reduced ? undefined : { rotate: -360 }}
                transition={reduced ? undefined : { duration: 45, repeat: Infinity, ease: "linear" }}
                style={{ transformOrigin: "300px 300px" }}
            />
            {/* outer dashed — slow rotation */}
            <motion.circle
                cx={C}
                cy={C}
                r={250}
                stroke="rgba(255,255,255,0.10)"
                strokeDasharray="2 6"
                animate={reduced ? undefined : { rotate: 360 }}
                transition={reduced ? undefined : { duration: 30, repeat: Infinity, ease: "linear" }}
                style={{ transformOrigin: "300px 300px" }}
            />

            {/* Spokes — fade in staggered */}
            {rings.flatMap((r, ri) =>
                angles.map((a, i) => {
                    const [x, y] = node(r, a);
                    return (
                        <motion.line
                            key={`${ri}-${i}`}
                            x1={C}
                            y1={C}
                            x2={x}
                            y2={y}
                            stroke="rgba(255,255,255,0.05)"
                            initial={reduced ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={reduced ? { duration: 0 } : { duration: 0.6, delay: (ri * 8 + i) * 0.015, ease: [0.16, 1, 0.3, 1] }}
                        />
                    );
                })
            )}

            {/* Dots — pop in staggered */}
            {rings.flatMap((r, ri) =>
                angles.map((a, i) => {
                    const [x, y] = node(r, a);
                    return (
                        <motion.circle
                            key={`d${ri}-${i}`}
                            cx={x}
                            cy={y}
                            r={2.5}
                            fill="rgba(255,255,255,0.4)"
                            initial={reduced ? false : { scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={reduced ? { duration: 0 } : { duration: 0.4, delay: 0.4 + (ri * 8 + i) * 0.01, ease: [0.16, 1, 0.3, 1] }}
                        />
                    );
                })
            )}

            {/* Main path — draw on mount */}
            <motion.path
                d={`M ${C - 180} ${C + 180} Q ${C} ${C} ${C + 180} ${C - 180}`}
                stroke="url(#orb-path)"
                strokeWidth="3"
                strokeLinecap="round"
                opacity={0.8}
                initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.8 }}
                transition={reduced ? { duration: 0 } : { duration: 1.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Orbit particle along path */}
            {!reduced && (
                <motion.circle
                    r="3.5"
                    fill="#e879f9"
                    initial={{ offsetDistance: "0%" }}
                    animate={{ offsetDistance: "100%" }}
                    transition={{ duration: 3.5, delay: 2.0, repeat: Infinity, ease: "linear", repeatDelay: 0.5 }}
                    style={{ offsetPath: `path("M ${C - 180} ${C + 180} Q ${C} ${C} ${C + 180} ${C - 180}")`, opacity: 0.9 } as React.CSSProperties}
                />
            )}

            {/* Start dot — pulse */}
            <motion.circle
                cx={C - 180}
                cy={C + 180}
                r="5"
                fill="#a78bfa"
                animate={reduced ? undefined : { scale: [1, 1.18, 1], opacity: [1, 0.85, 1] }}
                transition={reduced ? undefined : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: `${C - 180}px ${C + 180}px` }}
            />
            {/* End dot — slower pulse */}
            <motion.circle
                cx={C + 180}
                cy={C - 180}
                r="6"
                fill="#e879f9"
                opacity={0.35}
                animate={reduced ? undefined : { scale: [1, 1.14, 1], opacity: [0.35, 0.55, 0.35] }}
                transition={reduced ? undefined : { duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
                style={{ transformOrigin: `${C + 180}px ${C - 180}px` }}
            />
            {/* Center — breathing */}
            <motion.circle
                cx={C}
                cy={C}
                r="7"
                fill="#a78bfa"
                opacity={0.9}
                animate={reduced ? undefined : { scale: [1, 1.22, 1] }}
                transition={reduced ? undefined : { duration: 2.0, repeat: Infinity, ease: "easeInOut" }}
                style={{ transformOrigin: "300px 300px" }}
            />
        </svg>
    );
}
