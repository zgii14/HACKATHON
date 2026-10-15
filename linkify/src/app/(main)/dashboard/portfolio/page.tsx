import { PortfolioEditor } from "@/components/portfolio/portfolio-editor";
import { Suspense } from "react";

export default function PortfolioPage() {
    // useSearchParams (bagian aktif editor) butuh Suspense boundary di Next 14.
    return (
        <Suspense fallback={<div className="h-48 animate-pulse rounded-md bg-muted/40" />}>
            <PortfolioEditor />
        </Suspense>
    );
}
