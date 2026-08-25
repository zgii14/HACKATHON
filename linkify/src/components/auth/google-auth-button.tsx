"use client";

import { Button } from "@/components/ui/button";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { LoaderIcon } from "lucide-react";
import React, { useState } from "react";
import { toast } from "react-toastify";

/** Logo Google resmi. Inline supaya tidak menambah request atau dependency. */
const GoogleIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3.01c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24z" />
        <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.63l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
    </svg>
);

interface Props {
    /** Menentukan alur Clerk yang dipakai: masuk atau daftar. */
    mode: "sign-in" | "sign-up";
    /** Ikut dinonaktifkan saat form email sedang diproses. */
    disabled?: boolean;
}

const GoogleAuthButton = ({ mode, disabled }: Props) => {
    const { signIn, isLoaded: signInLoaded } = useSignIn();
    const { signUp, isLoaded: signUpLoaded } = useSignUp();
    const [isRedirecting, setIsRedirecting] = useState<boolean>(false);

    const isLoaded = mode === "sign-in" ? signInLoaded : signUpLoaded;

    const handleGoogleAuth = async () => {
        if (!isLoaded) return;

        setIsRedirecting(true);

        try {
            const flow = mode === "sign-in" ? signIn : signUp;
            await flow!.authenticateWithRedirect({
                strategy: "oauth_google",
                // Clerk menuntaskan OAuth di sini, lalu melempar ke auth-callback
                // yang sudah ada — jalur setelah login tetap satu pintu.
                redirectUrl: "/auth/sso-callback",
                redirectUrlComplete: "/auth/auth-callback",
            });
        } catch {
            // Sampai sini berarti redirect gagal dan halaman tidak berpindah,
            // jadi tombol harus bisa dipakai lagi.
            setIsRedirecting(false);
            toast.error("Could not open Google sign-in. Please try again.");
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            disabled={!isLoaded || disabled || isRedirecting}
            onClick={handleGoogleAuth}
            className="w-full gap-x-2"
        >
            {isRedirecting ? (
                <LoaderIcon className="w-5 h-5 animate-spin" />
            ) : (
                <>
                    <GoogleIcon />
                    Continue with Google
                </>
            )}
        </Button>
    );
};

export default GoogleAuthButton;
