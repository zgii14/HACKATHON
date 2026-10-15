"use client";

import { cn } from "@/utils";
import type { HTMLAttributes, PointerEvent } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
    /** Warna cahaya, sebagai nilai CSS lengkap. Default: ungu primary tipis. */
    glow?: string;
};

/**
 * Kartu dengan cahaya lembut yang mengikuti kursor. Posisi kursor ditulis
 * langsung ke CSS variable (bukan state React), jadi tidak ada re-render saat
 * mouse bergerak. Di layar sentuh dan prefers-reduced-motion cahaya tidak tampil.
 */
export function GlowCard({ glow = "hsl(var(--primary) / 0.09)", className, children, ...rest }: Props) {
    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (event.pointerType !== "mouse") return;
        const box = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--glow-x", `${event.clientX - box.left}px`);
        event.currentTarget.style.setProperty("--glow-y", `${event.clientY - box.top}px`);
    };
    return (
        <div {...rest} onPointerMove={onPointerMove} className={cn("group/glow relative isolate overflow-hidden", className)}>
            <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-0 opacity-0 transition-opacity duration-500 motion-safe:group-hover/glow:opacity-100"
                style={{ background: `radial-gradient(420px circle at var(--glow-x, 50%) var(--glow-y, 50%), ${glow}, transparent 65%)` }}
            />
            {children}
        </div>
    );
}
