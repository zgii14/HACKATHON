"use client";

import { motion, useReducedMotion } from "framer-motion";

// Mirip logo GitHire: 2 outline circle + 1 filled + garis, versi besar hero
export function LogoNetwork() {
    const reduced = useReducedMotion();

    return (
        <svg viewBox="0 0 600 420" className="h-auto w-full" fill="none" aria-hidden="true">
            <defs>
                <linearGradient id="logo-line" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#e879f9" stopOpacity="0.9" />
                </linearGradient>
            </defs>

            {/* glow belakang — solid to avoid framer radialGradient NaN */}
            <ellipse cx="300" cy="210" rx="210" ry="160" fill="#a78bfa" opacity="0.07" />

            {/* Garis utama — mirip logo, tapi besar */}
            {/* Vertikal kiri */}
            <motion.line
                x1="200" y1="110" x2="200" y2="310"
                stroke="url(#logo-line)" strokeWidth="2.5" strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.9 }}
                transition={reduced ? { duration: 0 } : { duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            />
            {/* Diagonal atas ke tengah */}
            <motion.line
                x1="218" y1="128" x2="282" y2="182"
                stroke="url(#logo-line)" strokeWidth="2.5" strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.9 }}
                transition={reduced ? { duration: 0 } : { duration: 1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
            {/* Diagonal bawah ke tengah */}
            <motion.line
                x1="218" y1="292" x2="282" y2="228"
                stroke="rgba(255,255,255,0.18)" strokeWidth="1.8" strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={reduced ? { duration: 0 } : { duration: 1, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
            {/* Garis ke kanan — cabang karier */}
            <motion.line
                x1="324" y1="210" x2="420" y2="150"
                stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeDasharray="4 6" strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={reduced ? { duration: 0 } : { duration: 1, delay: 1.0, ease: "easeOut" }}
            />
            <motion.line
                x1="324" y1="210" x2="420" y2="270"
                stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeDasharray="4 6" strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={reduced ? { duration: 0 } : { duration: 1, delay: 1.1, ease: "easeOut" }}
            />

            {/* Titik-titik kecil rasi di sekitar */}
            {[
                [120, 80], [380, 90], [460, 180], [460, 240], [380, 330], [120, 340],
                [250, 60], [320, 340], [180, 200],
            ].map(([x, y], i) => (
                <motion.circle
                    key={i}
                    cx={x} cy={y} r={1.8} fill="rgba(255,255,255,0.35)"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={reduced ? { duration: 0 } : { duration: 0.4, delay: 0.7 + i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                />
            ))}
            {/* garis halus ke titik kecil */}
            <line x1="200" y1="110" x2="120" y2="80" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1="200" y1="310" x2="120" y2="340" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1="324" y1="210" x2="380" y2="90" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />

            {/* Node kiri atas — outline */}
            <motion.g
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={reduced ? { duration: 0 } : { duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: "200px 110px" }}
            >
                <circle cx="200" cy="110" r="28" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" />
                <circle cx="200" cy="110" r="10" fill="rgba(255,255,255,0.9)" />
                {/* pulse ring */}
                <motion.circle
                    cx="200" cy="110" r="28" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"
                    initial={{ opacity: 0.5, scale: 1 }}
                    animate={reduced ? { scale: 1, opacity: 0 } : { scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
                    transition={reduced ? { duration: 0 } : { duration: 2.8, repeat: Infinity, ease: "easeOut" }}
                    style={{ transformOrigin: "200px 110px" }}
                />
            </motion.g>

            {/* Node kiri bawah — outline */}
            <motion.g
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={reduced ? { duration: 0 } : { duration: 0.6, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: "200px 310px" }}
            >
                <circle cx="200" cy="310" r="28" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.5" />
                <circle cx="200" cy="310" r="10" fill="rgba(255,255,255,0.9)" />
                <motion.circle
                    cx="200" cy="310" r="28" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"
                    initial={{ opacity: 0.5, scale: 1 }}
                    animate={reduced ? { scale: 1, opacity: 0 } : { scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
                    transition={reduced ? { duration: 0 } : { duration: 2.8, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
                    style={{ transformOrigin: "200px 310px" }}
                />
            </motion.g>

            {/* Node tengah — filled violet (hero) */}
            <motion.g
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={reduced ? { duration: 0 } : { duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: "300px 210px" }}
            >
                <motion.circle
                    cx="300" cy="210" r="32" fill="#6d28d9"
                    animate={reduced ? undefined : { scale: [1, 1.06, 1] }}
                    transition={reduced ? undefined : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ transformOrigin: "300px 210px" }}
                />
                <circle cx="300" cy="210" r="32" fill="none" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.5" />
                {/* inner highlight */}
                <circle cx="300" cy="210" r="8" fill="white" opacity="0.95" />
                <motion.circle
                    cx="300" cy="210" r="32" fill="none" stroke="#a78bfa" strokeWidth="1"
                    initial={{ opacity: 0.4, scale: 1 }}
                    animate={reduced ? { scale: 1, opacity: 0 } : { scale: [1, 1.35, 1], opacity: [0.4, 0, 0.4] }}
                    transition={reduced ? { duration: 0 } : { duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                    style={{ transformOrigin: "300px 210px" }}
                />
            </motion.g>

            {/* Node kanan — kecil */}
            <motion.g
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={reduced ? { duration: 0 } : { duration: 0.5, delay: 1.15, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: "420px 150px" }}
            >
                <circle cx="420" cy="150" r="14" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
                <circle cx="420" cy="150" r="4" fill="rgba(255,255,255,0.8)" />
            </motion.g>
            <motion.g
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={reduced ? { duration: 0 } : { duration: 0.5, delay: 1.25, ease: [0.16, 1, 0.3, 1] }}
                style={{ transformOrigin: "420px 270px" }}
            >
                <circle cx="420" cy="270" r="14" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
                <circle cx="420" cy="270" r="4" fill="rgba(255,255,255,0.8)" />
            </motion.g>

            {/* Label kecil mirip logo text */}
            <text x="300" y="395" textAnchor="middle" fontFamily="system-ui,sans-serif" fontSize="11" letterSpacing="0.18em" fill="rgba(255,255,255,0.22)" fontWeight="600">GITHUB → MATCH → CAREER</text>
        </svg>
    );
}
