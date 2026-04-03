"use client";

import React, { useEffect, useRef, useState } from 'react'
import { ClerkProvider, useAuth } from '@clerk/nextjs'
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";

// ── AuthCacheSync ──────────────────────────────────────────────────────────────
// Komponen ini mendeteksi perubahan userId (sign out / ganti akun) dan
// langsung membersihkan seluruh React Query cache agar data user lama
// tidak bocor ke akun yang baru login.

function AuthCacheSync() {
    const { userId } = useAuth();
    const qc = useQueryClient();
    const prevUserId = useRef<string | null | undefined>(undefined);

    useEffect(() => {
        // Pertama kali mount: simpan userId awal, jangan clear
        if (prevUserId.current === undefined) {
            prevUserId.current = userId;
            return;
        }

        // Jika userId berubah (logout / ganti akun) → clear semua cache
        if (prevUserId.current !== userId) {
            qc.clear();
            prevUserId.current = userId;
        }
    }, [userId, qc]);

    return null;
}

// ── Providers ──────────────────────────────────────────────────────────────────

interface Props {
    children: React.ReactNode;
}

const Providers = ({ children }: Props) => {
    const [client] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                // AUTH_NOT_READY → retry cepat sampai 20x selama Clerk loading
                // Error lain (404, 500, network) → tidak diretry otomatis
                retry: (failureCount, error) => {
                    if (error instanceof Error && error.message === "AUTH_NOT_READY") {
                        return failureCount < 20;
                    }
                    return false;
                },
                retryDelay: (failureCount, error) => {
                    // Retry AUTH_NOT_READY tiap 150ms agar tidak delay lama
                    if (error instanceof Error && error.message === "AUTH_NOT_READY") {
                        return 150;
                    }
                    return 1000;
                },
                refetchOnWindowFocus: false,
                staleTime: 30 * 1000, // 30 detik default
            },
        },
    }));

    return (
        // ClerkProvider di luar QueryClientProvider agar Clerk selesai init
        // sebelum query pertama dieksekusi — mencegah 401 saat hard refresh
        <ClerkProvider>
            <QueryClientProvider client={client}>
                {/* Clear cache otomatis saat user sign out / ganti akun */}
                <AuthCacheSync />
                {children}
            </QueryClientProvider>
        </ClerkProvider>
    )
};

export default Providers
