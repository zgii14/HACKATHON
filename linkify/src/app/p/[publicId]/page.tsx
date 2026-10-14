import { PublicPortfolioView } from "@/components/portfolio/public-portfolio";
import type { PortfolioTheme, PublicPortfolio } from "@/components/portfolio/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
    title: "Developer Portfolio · GitHire",
    robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const THEMES: PortfolioTheme[] = ["editorial", "developer", "professional", "maestro"];

type Props = {
    params: { publicId: string };
    searchParams: { theme?: string; embed?: string };
};

export default async function PublicPortfolioPage({ params, searchParams }: Props) {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
    const response = await fetch(`${apiBase}/portfolios/${encodeURIComponent(params.publicId)}`, {
        cache: "no-store",
    });
    if (!response.ok) notFound();
    const fetched = await response.json() as PublicPortfolio;

    // ?theme= hanya mengganti tampilan (pratinjau di landing); isi tetap milik pemilik.
    // ?embed=1 dipakai iframe landing: tanpa email dan tanpa chip mengambang.
    const themeOverride = THEMES.find((theme) => theme === searchParams.theme);
    const embed = searchParams.embed === "1";
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
