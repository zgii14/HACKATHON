"use client";

import { motion, useReducedMotion } from "framer-motion";

// GitHub contribution graph — dark editorial, violet accent
// Mirip versi awal sebelum orb lingkaran

const WEEKS = 22;
const DAYS = 7;

// Generate mock contribution levels 0-4
function genLevels(): number[][] {
    // seed-ish random but deterministic for visual
    const levels: number[][] = [];
    for (let w = 0; w < WEEKS; w++) {
        const col: number[] = [];
        for (let d = 0; d < DAYS; d++) {
            // bias: more activity in middle weeks
            const dist = Math.abs(w - WEEKS / 2) / (WEEKS / 2); // 0 center, 1 edge
            const base = 1 - dist * 0.5;
            const r = Math.random();
            let lvl = 0;
            if (r < 0.35) lvl = 0;
            else if (r < 0.55 + base * 0.1) lvl = 1;
            else if (r < 0.75 + base * 0.08) lvl = 2;
            else if (r < 0.88 + base * 0.05) lvl = 3;
            else lvl = 4;
            // sprinkle some high streaks
            if (w > 8 && w < 14 && d >= 1 && d <= 4 && Math.random() > 0.3) lvl = Math.max(lvl, 3);
            col.push(lvl);
        }
        levels.push(col);
    }
    return levels;
}

const violetScale = [
    "bg-white/[0.06] border-white/[0.06]", // 0
    "bg-violet-900/40 border-violet-800/30", // 1
    "bg-violet-700/60 border-violet-600/30", // 2
    "bg-violet-500 border-violet-400/40", // 3
    "bg-gradient-to-br from-violet-400 to-fuchsia-400 border-violet-300/30", // 4
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function GithubGraph() {
    const reduced = useReducedMotion();
    const levels = genLevels();
    // flatten for stagger calc
    const total = WEEKS * DAYS;

    return (
        <div className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-white/80">
                            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">rozaki.dev</p>
                        <p className="text-xs text-white/50">312 contributions in the last year</p>
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-medium text-emerald-400">Active</span>
                </div>
            </div>

            {/* Graph */}
            <div className="px-5 py-5">
                {/* Months */}
                <div className="hidden sm:flex gap-[3px] ml-7 mb-2">
                    {MONTHS.slice(0, 8).map((m) => (
                        <span key={m} className="flex-1 text-[10px] leading-none text-white/30 font-mono">
                            {m}
                        </span>
                    ))}
                </div>

                <div className="flex gap-2">
                    {/* Day labels */}
                    <div className="hidden sm:flex flex-col gap-[3px] justify-between py-[1px] text-[10px] leading-none font-mono text-white/25">
                        <span>Mon</span>
                        <span className="opacity-0">Tue</span>
                        <span>Wed</span>
                        <span className="opacity-0">Thu</span>
                        <span>Fri</span>
                    </div>

                    {/* Grid */}
                    <div className="flex gap-[3px] flex-1">
                        {levels.map((col, wi) => (
                            <div key={wi} className="flex flex-1 flex-col gap-[3px]">
                                {col.map((lvl, di) => (
                                    <motion.div
                                        key={`${wi}-${di}`}
                                        initial={reduced ? false : { scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={
                                            reduced
                                                ? { duration: 0 }
                                                : {
                                                      duration: 0.35,
                                                      delay: (wi * DAYS + di) * 0.003,
                                                      ease: [0.16, 1, 0.3, 1],
                                                  }
                                        }
                                        className={`aspect-square w-full rounded-[3px] border ${violetScale[lvl]} ${lvl > 0 ? "hover:brightness-125 hover:scale-[1.15] transition-all duration-200 cursor-pointer" : ""}`}
                                        title={`${lvl} contributions`}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-between mt-4">
                    <p className="text-xs text-white/35">Less → More</p>
                    <div className="flex items-center gap-[3px]">
                        {[0, 1, 2, 3, 4].map((l) => (
                            <div key={l} className={`h-[10px] w-[10px] rounded-[2px] border ${violetScale[l]}`} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer stats */}
            <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-t border-white/[0.06] bg-white/[0.02]">
                {[
                    { label: "Repositories", value: "42" },
                    { label: "Languages", value: "8" },
                    { label: "Stars", value: "127" },
                ].map((s) => (
                    <div key={s.label} className="px-4 py-3 text-center">
                        <p className="text-sm font-semibold text-white">{s.value}</p>
                        <p className="text-[10px] font-mono uppercase tracking-widest text-white/30">{s.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
