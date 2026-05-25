"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) {
        return (
            <div className="w-8 h-8 rounded-lg bg-muted/50 animate-pulse" />
        );
    }

    const isDark = theme === "dark";

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="relative w-8 h-8 rounded-lg border border-border bg-muted/30 hover:bg-muted flex items-center justify-center transition-all duration-200"
            title={isDark ? "Light mode" : "Dark mode"}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
            <Sun className={`w-4 h-4 absolute transition-all duration-300 ${isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
            <Moon className={`w-4 h-4 absolute transition-all duration-300 ${isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
        </button>
    );
}
