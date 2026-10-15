import { apiBase, fetchPublicPortfolio, PublicPortfolioPage, portfolioMetadata } from "@/components/portfolio/public-portfolio-page";
import { subdomainUrl } from "@/utils/functions/subdomain-host";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: { name: string } };
type Resolved = { public_id?: string; redirect_to?: string };

// Dipanggil lewat rewrite middleware dari nama.githire.my.id.
async function resolve(name: string): Promise<Resolved | null> {
    const response = await fetch(`${apiBase}/public/subdomains/${encodeURIComponent(name)}`, { next: { revalidate: 60 } });
    return response.ok ? ((await response.json()) as Resolved) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const resolved = await resolve(params.name);
    return portfolioMetadata(resolved?.public_id ? await fetchPublicPortfolio(resolved.public_id) : null);
}

export default async function SubdomainPortfolioRoute({ params }: Props) {
    const resolved = await resolve(params.name);
    if (resolved?.redirect_to) permanentRedirect(subdomainUrl(resolved.redirect_to));
    if (!resolved?.public_id) notFound();
    return <PublicPortfolioPage publicId={resolved.public_id} />;
}
