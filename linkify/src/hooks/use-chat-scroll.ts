"use client";

import { useEffect, useRef } from "react";

export function useChatScroll(deps: unknown[]) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        // respect reduced-motion
        const prefersReduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        el.scrollTo({
            top: el.scrollHeight,
            behavior: prefersReduced ? "auto" : "smooth",
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return ref;
}
