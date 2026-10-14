import { Hero } from "@/components/landing-v2/hero";
import {
    ClosingSection,
    JobsSection,
    PricingSection,
    ProofSection,
    RecruiterCtaSection,
    RecruiterViewSection,
    type PublicJobs,
} from "@/components/landing-v2/sections";
import type { PublicPortfolio } from "@/components/portfolio/types";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "GitHire · Portfolio developer dari kode aslimu",
    description: "Disusun dari repo GitHub dan CV-mu, dengan skill terverifikasi dari commit. Pilih tampilan, bagikan satu link.",
};

// Tanpa currentUser(): halaman ini statis + ISR 5 menit, CTA login dibaca di client.
export const revalidate = 300;

const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");
const SHOWCASE_ID = process.env.NEXT_PUBLIC_SHOWCASE_PORTFOLIO_ID || "kBvAyQPhGD";

async function getJson<T>(path: string): Promise<T | null> {
    try {
        const response = await fetch(`${API}${path}`, { next: { revalidate: 300 } });
        return response.ok ? ((await response.json()) as T) : null;
    } catch {
        return null;
    }
}

export default async function HomePage() {
    const [showcase, jobs] = await Promise.all([
        getJson<PublicPortfolio>(`/portfolios/${encodeURIComponent(SHOWCASE_ID)}`),
        getJson<PublicJobs>("/public/jobs?limit=5"),
    ]);

    // Landing tidak pernah menampilkan email pemilik portfolio.
    if (showcase?.content?.contacts) delete showcase.content.contacts.email;

    const owner = showcase ? { publicId: showcase.public_id, ownerName: showcase.content.name || "pengguna GitHire" } : null;

    return (
        <>
            <Hero showcase={owner} />
            <ProofSection portfolio={showcase} />
            <RecruiterViewSection portfolio={showcase} />
            <JobsSection jobs={jobs} />
            <RecruiterCtaSection />
            <PricingSection />
            <ClosingSection />
        </>
    );
}
