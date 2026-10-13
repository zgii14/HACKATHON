import { PublicPortfolioView } from "@/components/portfolio/public-portfolio";
import type { PublicPortfolio } from "@/components/portfolio/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
    title: "Developer Portfolio · GitHire",
    robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PublicPortfolioPage({ params }: { params: { publicId: string } }) {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
    const response = await fetch(`${apiBase}/portfolios/${encodeURIComponent(params.publicId)}`, {
        cache: "no-store",
    });
    if (!response.ok) notFound();
    const portfolio = await response.json() as PublicPortfolio;
    return (
        <>
            <PublicPortfolioView portfolio={portfolio} apiBase={apiBase} />
            {portfolio.github_verified && (
                // Di luar tema supaya konsisten di semua tampilan portfolio.
                <p className="fixed bottom-4 right-4 z-40 rounded-full border border-zinc-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm">
                    <span className="text-emerald-600">✓</span> GitHub terverifikasi oleh GitHire
                </p>
            )}
        </>
    );
}
