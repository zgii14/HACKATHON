const NAVBAR_OFFSET = 96;

export const smoothScrollToHash = (href: string) => {
    if (typeof window === "undefined") return;
    const hash = href.split("#")[1];
    if (!hash) return;
    const el = document.getElementById(hash);
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - NAVBAR_OFFSET);
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    history.pushState(null, "", `#${hash}`);
};

export const handleHashLinkClick = (
    e: { preventDefault: () => void },
    href: string
) => {
    if (!href.includes("#")) return;
    const hash = href.split("#")[1];
    if (!hash || typeof document === "undefined" || !document.getElementById(hash)) return;
    e.preventDefault();
    smoothScrollToHash(href);
};
