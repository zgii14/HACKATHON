export type NavMatchable = { href: string; match?: string[] };

const ROOT = "/dashboard";

function matches(pathname: string, prefix: string): boolean {
    if (prefix === ROOT) return pathname === ROOT;
    return pathname === prefix || pathname.startsWith(prefix + "/");
}

// Longest-prefix match so nested routes (e.g. /dashboard/jobs/recommended)
// activate only their own item, never their parent as well.
export function findActiveHref(pathname: string, links: NavMatchable[]): string | null {
    let best: { href: string; length: number } | null = null;
    for (const link of links) {
        for (const prefix of [link.href, ...(link.match ?? [])]) {
            if (matches(pathname, prefix) && (!best || prefix.length > best.length)) {
                best = { href: link.href, length: prefix.length };
            }
        }
    }
    return best?.href ?? null;
}
