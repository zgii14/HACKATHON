"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSignIn } from '@clerk/nextjs';
import { Eye, EyeOff, LoaderIcon } from "lucide-react";
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from 'react';
import { toast } from "react-toastify";
import { Label } from "../ui/label";
import OAuthButton from "./oauth-button";

const SignInForm = () => {

    const router = useRouter();
    const searchParams = useSearchParams();

    const { signIn, isLoaded, setActive } = useSignIn();

    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isLoaded) return;

        if (!email || !password) {
            setIsLoading(false);
            toast.error("Email dan kata sandi wajib diisi.");
            return;
        }

        setIsLoading(true);

        try {
            const signInAttempt = await signIn.create({
                identifier: email,
                password,
                redirectUrl: "/auth/auth-callback",
            });

            if (signInAttempt.status === "complete") {
                await setActive({
                    session: signInAttempt.createdSessionId,
                });
                const redirectUrl = searchParams.get("redirect_url");
                router.push(redirectUrl ? `/auth/auth-callback?redirect_url=${encodeURIComponent(redirectUrl)}` : "/auth/auth-callback");
            } else {
                toast.error("Email atau kata sandi salah.");
                setIsLoading(false);
            }
        } catch (error: any) {
            switch (error.errors[0]?.code) {
                case "form_identifier_not_found":
                    toast.error("Email ini belum terdaftar. Daftar dulu.");
                    break;
                case "form_password_incorrect":
                    toast.error("Kata sandi salah. Coba lagi.");
                    break;
                case "too_many_attempts":
                    toast.error("Terlalu banyak percobaan. Coba lagi nanti.");
                    break;
                default:
                    toast.error("Terjadi kesalahan. Coba lagi.");
                    break;
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-start gap-y-6 w-full">
            <h2 className="text-2xl font-bold tracking-[-0.02em]">
                Masuk ke GitHire
            </h2>

            <div className="w-full">
                <div className="space-y-2">
                    <OAuthButton provider="github" mode="sign-in" disabled={isLoading} />
                    <OAuthButton provider="google" mode="sign-in" disabled={isLoading} />
                </div>
                <div className="flex items-center gap-x-3 mt-6">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">atau</span>
                    <span className="h-px flex-1 bg-border" />
                </div>
            </div>

            <form onSubmit={handleSignIn} className="w-full">
                <div className="space-y-2 w-full">
                    <Label htmlFor="email">
                        Email
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        disabled={!isLoaded || isLoading}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama@email.com"
                        className="w-full focus-visible:border-foreground"
                    />
                </div>
                <div className="mt-4 space-y-2">
                    <Label htmlFor="password">
                        Kata sandi
                    </Label>
                    <div className="relative w-full">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            disabled={!isLoaded || isLoading}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Kata sandi"
                            className="w-full focus-visible:border-foreground"
                        />
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={!isLoaded || isLoading}
                            className="absolute top-1 right-1"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ?
                                <EyeOff className="w-4 h-4" /> :
                                <Eye className="w-4 h-4" />
                            }
                        </Button>
                    </div>
                </div>
                <div className="mt-4 w-full">
                    <Button
                        type="submit"
                        disabled={!isLoaded || isLoading}
                        className="w-full"
                    >
                        {isLoading ? (
                            <LoaderIcon className="w-5 h-5 animate-spin" />
                        ) : "Masuk dengan email"}
                    </Button>
                </div>
            </form>
        </div>
    )
};

export default SignInForm
