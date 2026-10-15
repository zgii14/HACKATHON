import { PublicPortfolioView } from "@/components/portfolio/public-portfolio";
import type { PortfolioTheme, PublicPortfolio } from "@/components/portfolio/types";
import { subdomainUrl } from "@/utils/functions/subdomain-host";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const THEMES: PortfolioTheme[] = ["editorial", "developer", "professional", "maestro", "arcade"];

export const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

/** Fetch identik di generateMetadata dan page di-memoize Next, jadi hanya satu request. */
export async function fetchPublicPortfolio(publicId: string): Promise<PublicPortfolio | null> {
    const response = await fetch(`${apiBase}/portfolios/${encodeURIComponent(publicId)}`, { cache: "no-store" });
    return response.ok ? ((await response.json()) as PublicPortfolio) : null;
}

export function portfolioMetadata(portfolio: PublicPortfolio | null): Metadata {
    return {
        title: portfolio?.content.name ? `${portfolio.content.name} · Portfolio` : "Developer Portfolio · GitHire",
        robots: { index: false, follow: false },
        alternates: portfolio?.subdomain ? { canonical: subdomainUrl(portfolio.subdomain) } : undefined,
    };
}

type Props = { publicId: string; theme?: string; embed?: boolean };

export async function PublicPortfolioPage({ publicId, theme, embed = false }: Props) {
    const fetched = await fetchPublicPortfolio(publicId);
    if (!fetched) notFound();

    // ?theme= hanya mengganti tampilan (pratinjau di landing); isi tetap milik pemilik.
    // ?embed=1 dipakai iframe landing: tanpa email dan tanpa chip mengambang.
    const themeOverride = THEMES.find((item) => item === theme);
    const contacts = { ...(fetched.content.contacts ?? {}) };
    if (embed) delete contacts.email;
    const portfolio: PublicPortfolio = {
        ...fetched,
        content: { ...fetched.content, theme: themeOverride ?? fetched.content.theme, contacts },
    };

    // Tema Editorial sudah punya stiker "GitHub verified" sendiri.
    const showVerifiedChip = fetched.github_verified && !embed && portfolio.content.theme !== "editorial";

    return (
        <>
            <PublicPortfolioView portfolio={portfolio} apiBase={apiBase} />
            {showVerifiedChip && (
                // Di luar tema supaya konsisten di semua tampilan portfolio.
                <p className="fixed bottom-4 right-4 z-40 rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm">
                    <span className="text-emerald-600">✓</span> GitHub terverifikasi oleh GitHire
                </p>
            )}
        </>
    );
}
