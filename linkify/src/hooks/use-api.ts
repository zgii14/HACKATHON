"use client";

import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";

export function useApi() {
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const [tokenReady, setTokenReady] = useState(false);
    const authReady = isLoaded && !!isSignedIn && tokenReady;

    useEffect(() => {
        let cancelled = false;

        if (!isLoaded || !isSignedIn) {
            setTokenReady(false);
            return;
        }

        setTokenReady(false);
        getToken()
            .then((token) => {
                if (!cancelled) {
                    setTokenReady(!!token);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setTokenReady(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [getToken, isLoaded, isSignedIn]);

    const withAuth = useCallback(
        async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
            // Tunggu sesi Clerk selesai diload
            if (!authReady) {
                throw new Error("AUTH_NOT_READY");
            }
            const token = await getToken();
            if (!token) {
                throw new Error("AUTH_NOT_READY");
            }
            try {
                return await apiFetch<T>(path, { ...init, token });
            } catch (error) {
                if (error instanceof ApiError && error.status === 401) {
                    const freshToken = await getToken({ skipCache: true });
                    if (freshToken && freshToken !== token) {
                        return apiFetch<T>(path, { ...init, token: freshToken });
                    }
                }
                throw error;
            }
        },
        [authReady, getToken]
    );

    return { withAuth, isLoaded, isSignedIn, authReady };
}
