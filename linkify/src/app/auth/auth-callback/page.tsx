"use client";

import { getAuthStatus } from "@/actions";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from "react";

export const dynamic = "force-dynamic";

function AuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const { data, isError } = useQuery({
        queryKey: ["auth-status"],
        queryFn: async () => await getAuthStatus(),
        retry: true,
        retryDelay: 500,
    });

    useEffect(() => {
        if (data?.success) {
            const redirectUrl = searchParams.get("redirect_url");
            if (redirectUrl && redirectUrl.startsWith("/") && !redirectUrl.startsWith("//")) {
                router.replace(redirectUrl);
            } else {
                router.replace("/dashboard");
            }
        }
    }, [data?.success, router, searchParams]);

    if (isError) {
        return <div className="flex h-screen items-center justify-center">Gagal memverifikasi akun. Silakan login ulang.</div>;
    }

    return (
        <div className="flex items-center justify-center flex-col h-screen relative">
            <div className="border-[3px] border-neutral-800 rounded-full border-b-neutral-200 animate-loading w-8 h-8"></div>
            <p className="text-lg font-medium text-center mt-3">Verifying your account...</p>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Memuat...</div>}>
            <AuthCallbackContent />
        </Suspense>
    );
}
