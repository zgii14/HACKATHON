"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export function LandingOrb({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
    const y = useTransform(scrollYProgress, [0, 1], ["-18px", "18px"]);
    const rotate = useTransform(scrollYProgress, [0, 1], [-2, 2]);

    return (
        <motion.div ref={ref} style={{ y, rotate }} className="will-change-transform">
            {children}
        </motion.div>
    );
}
