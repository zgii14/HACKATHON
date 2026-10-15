import { BrandMark } from "@/components/landing-v2/brand-mark";
import Link from "next/link";
import type { ReactNode } from "react";

/** Kartu putih di tengah layar untuk semua halaman auth, di atas AuthBackdrop. */
export function AuthShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
    return (
        <div className="flex min-h-dvh items-center justify-center px-4 py-10">
            <div className="w-full max-w-[420px] rounded-2xl border border-border bg-background/95 p-6 shadow-[0_30px_80px_-30px_rgba(76,29,149,0.35)] backdrop-blur-sm sm:p-8">
                <Link href="/" aria-label="GitHire, kembali ke beranda" className="inline-flex">
                    <BrandMark />
                </Link>
                <div className="mt-7">{children}</div>
                {footer && <div className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">{footer}</div>}
            </div>
        </div>
    );
}
