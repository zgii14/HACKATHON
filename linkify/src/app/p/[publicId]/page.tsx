import { fetchPublicPortfolio, PublicPortfolioPage, portfolioMetadata } from "@/components/portfolio/public-portfolio-page";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

type Props = {
    params: { publicId: string };
    searchParams: { theme?: string; embed?: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    return portfolioMetadata(await fetchPublicPortfolio(params.publicId));
}

export default function PublicPortfolioRoute({ params, searchParams }: Props) {
    return <PublicPortfolioPage publicId={params.publicId} theme={searchParams.theme} embed={searchParams.embed === "1"} />;
}
