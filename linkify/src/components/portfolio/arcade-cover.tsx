"use client";

import { motion } from "framer-motion";
import { getProjectCover, type ArcadeCover } from "./arcade-portfolio-config";
import type { PortfolioProject } from "./types";

const CELL_OPACITY = [0, 0.22, 0.5, 0.9];

function PatternLayer({ cover, reduceMotion }: { cover: ArcadeCover; reduceMotion: boolean | null }) {
    const { from, to } = cover.palette;
    if (cover.pattern === "scan") {
        // Matahari terbenam ala synthwave dengan garis-garis horizontal.
        return (
            <>
                <span className="absolute bottom-[-35%] left-1/2 aspect-square w-[62%] -translate-x-1/2 rounded-full" style={{ backgroundImage: `linear-gradient(180deg, ${to}, ${from})` }} />
                <span className="absolute inset-x-0 bottom-0 h-1/2" style={{ backgroundImage: "repeating-linear-gradient(180deg, #0B0D17 0 3px, transparent 3px 11px)" }} />
                <span className="absolute inset-x-0 bottom-0 h-[30%] border-t border-[#2A2F55]" style={{ backgroundImage: "linear-gradient(90deg, rgba(42,47,85,0.9) 1px, transparent 1px)", backgroundSize: "28px 100%" }} />
            </>
        );
    }
    if (cover.pattern === "rings") {
        return (
            <motion.span
                className="absolute left-[66%] top-1/2 aspect-square w-[62%] -translate-x-1/2 -translate-y-1/2"
                animate={reduceMotion ? undefined : { rotate: 360 }}
                transition={reduceMotion ? undefined : { duration: 40, repeat: Infinity, ease: "linear" }}
            >
                {[100, 82, 64, 46, 28].map((size, index) => (
                    <span
                        key={size}
                        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${index % 2 ? "border-dashed" : ""}`}
                        style={{ width: `${size}%`, height: `${size}%`, borderColor: index % 2 ? to : from, opacity: 0.3 + index * 0.13 }}
                    />
                ))}
            </motion.span>
        );
    }
    if (cover.pattern === "halftone") {
        return (
            <span
                className="absolute inset-0"
                style={{
                    backgroundImage: `radial-gradient(${from} 2.2px, transparent 2.6px)`,
                    backgroundSize: "12px 12px",
                    WebkitMaskImage: "radial-gradient(circle at 70% 40%, #000 0%, transparent 70%)",
                    maskImage: "radial-gradient(circle at 70% 40%, #000 0%, transparent 70%)",
                }}
            />
        );
    }
    return null;
}

/** Cover "kartrid game" generatif per repo: pola, pixel grid bergelombang, dan inisial hologram. */
export function ProjectCover({ project, reduceMotion }: { project: PortfolioProject; reduceMotion: boolean | null }) {
    const cover = getProjectCover(project);
    const { from, to } = cover.palette;
    const pixelsMain = cover.pattern === "pixels";

    return (
        <div className="relative aspect-[16/9] overflow-hidden border-b-[3px] border-[#5B3FD9] bg-[#0B0D17]" aria-hidden="true">
            <span className="absolute inset-0 opacity-60" style={{ backgroundImage: `radial-gradient(circle at 20% 15%, ${from}33, transparent 55%), radial-gradient(circle at 85% 90%, ${to}33, transparent 55%)` }} />
            <PatternLayer cover={cover} reduceMotion={reduceMotion} />

            <div className={`absolute grid grid-cols-8 ${pixelsMain ? "right-4 top-9 w-[56%] gap-1.5" : "bottom-3 right-3 w-[34%] gap-1"}`}>
                {cover.cells.map((value, index) => {
                    const col = index % 8;
                    const row = Math.floor(index / 8);
                    const color = (col + row) % 3 === 0 ? to : from;
                    return (
                        <motion.span
                            key={index}
                            className="aspect-square transition-transform duration-300 group-hover:scale-75 motion-reduce:transition-none"
                            style={{ backgroundColor: color, opacity: reduceMotion ? CELL_OPACITY[value] : undefined }}
                            initial={reduceMotion ? false : { opacity: 0, scale: 0.2 }}
                            whileInView={{ opacity: CELL_OPACITY[value], scale: 1 }}
                            viewport={{ once: true, amount: 0.3 }}
                            transition={{ duration: 0.35, delay: (col + row) * 0.045 }}
                        />
                    );
                })}
            </div>

            <span className="absolute left-3 top-2.5 max-w-[70%] truncate font-mono text-[11px] text-[#9AA0C3]"><span className="text-[#5EEAD4]">$</span> cd {project.repo_name}</span>
            <span
                className="absolute bottom-3 left-4 bg-clip-text text-[clamp(3.5rem,9vw,5.5rem)] font-extrabold leading-none tracking-[-0.06em] text-transparent transition-transform duration-500 group-hover:-translate-y-1 motion-reduce:transition-none"
                style={{ backgroundImage: `linear-gradient(120deg, ${from}, ${to})`, filter: "drop-shadow(3px 3px 0 #5B3FD9)" }}
            >
                {cover.initials}
            </span>
            <span className="pointer-events-none absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(180deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 4px)" }} />
        </div>
    );
}
