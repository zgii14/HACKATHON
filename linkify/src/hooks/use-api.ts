"use client";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";

export function useApi() {
    const { getToken, isLoaded, isSignedIn } = useAuth();

    const withAuth = useCallback(
        async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
            // Tunggu sesi Clerk selesai diload
            if (!isLoaded || !isSignedIn) {
                throw new Error("AUTH_NOT_READY");
            }
            const token = await getToken();
            if (!token) {
                throw new Error("AUTH_NOT_READY");
            }
            return apiFetch<T>(path, { ...init, token });
        },
        [getToken, isLoaded, isSignedIn]
    );

    return { withAuth, isLoaded, isSignedIn };
}
