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
    return <PublicPortfolioView portfolio={portfolio} apiBase={apiBase} />;
}
