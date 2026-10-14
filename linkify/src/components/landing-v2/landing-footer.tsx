import Link from "next/link";
import { BrandMark } from "./brand-mark";

const LINKS = [
    { label: "Portfolio", href: "#portfolio" },
    { label: "Lowongan", href: "#lowongan" },
    { label: "Untuk recruiter", href: "#recruiter" },
    { label: "Harga", href: "#harga" },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
];

export function LandingFooter() {
    return (
        <footer className="border-t border-border">
            <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-start md:justify-between">
                <div className="max-w-xs">
                    <BrandMark />
                    <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">Portfolio developer dari kode aslimu.</p>
                </div>
                <ul className="grid grid-cols-2 gap-x-10 gap-y-2 text-[14px] text-muted-foreground sm:grid-cols-3">
                    {LINKS.map((link) => (
                        <li key={link.href}>
                            <Link href={link.href} className="transition-colors hover:text-foreground">
                                {link.label}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
            <p className="mx-auto max-w-6xl px-5 pb-10 text-[13px] text-muted-foreground sm:px-8">© {new Date().getFullYear()} GitHire</p>
        </footer>
    );
}
