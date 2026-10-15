/** Domain tempat portfolio tinggal sebagai nama.githire.my.id. */
export const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "githire.my.id";

const APP_LABELS = new Set(["www"]);

/**
 * Nama subdomain portfolio dari header Host, atau null untuk host aplikasi
 * (root, www, preview Vercel, localhost biasa). `nama.localhost` dipakai saat dev.
 */
export function subdomainFromHost(host: string | null | undefined, rootDomain: string = ROOT_DOMAIN): string | null {
    if (!host) return null;
    const hostname = host.split(":")[0].toLowerCase();
    for (const root of [rootDomain.toLowerCase(), "localhost"]) {
        if (!hostname.endsWith(`.${root}`)) continue;
        const label = hostname.slice(0, -(root.length + 1));
        if (!label || label.includes(".") || APP_LABELS.has(label)) return null;
        return label;
    }
    return null;
}

export function subdomainUrl(name: string, rootDomain: string = ROOT_DOMAIN): string {
    return `https://${name}.${rootDomain}`;
}

/** Usulan nama dari username GitHub; null bila hasilnya kurang dari 3 karakter. */
export function toSubdomainCandidate(value: string | null | undefined): string | null {
    const cleaned = (value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 30)
        .replace(/-$/, "");
    return cleaned.length >= 3 ? cleaned : null;
}
