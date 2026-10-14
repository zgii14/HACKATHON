"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";

type Props = {
    className?: string;
    /** Teks untuk pengunjung yang belum masuk; default "Buat portfolio". */
    label?: string;
};

/**
 * CTA utama landing. Status login dibaca di client supaya halaman landing tetap
 * statis (di-cache CDN) dan tidak memanggil Clerk di server untuk tiap pengunjung.
 */
export function CtaLink({ className, label = "Buat portfolio" }: Props) {
    const { isSignedIn } = useAuth();
    return isSignedIn ? (
        <Link href="/dashboard/portfolio" className={className}>
            Buka portfolio
        </Link>
    ) : (
        <Link href="/auth/sign-up" className={className}>
            {label}
        </Link>
    );
}
