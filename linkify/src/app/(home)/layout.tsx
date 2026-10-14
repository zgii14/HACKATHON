import { LandingFooter } from "@/components/landing-v2/landing-footer";
import { LandingNav } from "@/components/landing-v2/landing-nav";
import type { ReactNode } from "react";

export default function HomeLayout({ children }: { children: ReactNode }) {
    return (
        <div className="relative min-h-screen bg-background text-foreground">
            <LandingNav />
            <main>{children}</main>
            <LandingFooter />
        </div>
    );
}
