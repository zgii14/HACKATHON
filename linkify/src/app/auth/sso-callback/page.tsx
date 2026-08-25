"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/**
 * Titik pendaratan setelah Google mengembalikan user.
 *
 * Komponen Clerk menukar kode OAuth jadi sesi lalu meneruskan ke
 * `redirectUrlComplete` yang dikirim tombolnya (/auth/auth-callback).
 * Fallback dipasang untuk kasus Clerk kehilangan tujuan aslinya.
 */
const SSOCallbackPage = () => {
    return (
        <>
            <AuthenticateWithRedirectCallback
                signInFallbackRedirectUrl="/auth/auth-callback"
                signUpFallbackRedirectUrl="/auth/auth-callback"
            />
            <div className="flex items-center justify-center flex-col h-screen relative">
                <div className="border-[3px] border-neutral-800 rounded-full border-b-neutral-200 animate-loading w-8 h-8"></div>
                <p className="text-lg font-medium text-center mt-3">
                    Completing sign-in...
                </p>
            </div>
        </>
    );
};

export default SSOCallbackPage;
