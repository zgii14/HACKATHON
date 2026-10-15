"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSignUp } from '@clerk/nextjs';
import { Eye, EyeOff, LoaderIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from 'react';
import { toast } from "react-toastify";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../ui/input-otp";
import { Label } from "../ui/label";
import OAuthButton from "./oauth-button";

const SignUpForm = () => {

    const router = useRouter();
    const searchParams = useSearchParams();

    const { signUp, isLoaded, setActive } = useSignUp();

    const [name, setName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [code, setCode] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [isVerifying, setIsVerifying] = useState<boolean>(false);
    const [isUpdating, setIsUpdating] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isLoaded) return;

        if (!name || !email || !password) {
            toast.error("Nama, email, dan kata sandi wajib diisi.");
            return;
        }

        setIsUpdating(true);

        try {
            await signUp.create({
                emailAddress: email,
                password,
                firstName: name.split(" ")[0],
                lastName: name.split(" ")[1],
            });

            await signUp.prepareEmailAddressVerification({
                strategy: "email_code",
            });

            toast.success("Kode verifikasi sudah dikirim ke email-mu.");

            setIsVerifying(true);
        } catch (error: any) {
            switch (error.errors[0]?.code) {
                case "form_identifier_exists":
                    toast.error("Email ini sudah terdaftar. Silakan masuk.");
                    break;
                case "form_password_pwned":
                    toast.error("Kata sandi terlalu umum. Pilih yang lebih kuat.");
                    break;
                case "form_param_format_invalid":
                    toast.error("Format email tidak valid.");
                    break;
                case "form_password_length_too_short":
                    toast.error("Kata sandi terlalu pendek. Minimal 8 karakter.");
                    break;
                default:
                    toast.error("Terjadi kesalahan. Coba lagi.");
                    break;
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isLoaded) return;

        if (!code) {
            toast.error("Masukkan kode verifikasi.");
            return;
        }

        setIsLoading(true);

        try {
            const completeSignUp = await signUp.attemptEmailAddressVerification({
                code,
            });

            if (completeSignUp.status === "complete") {
                await setActive({
                    session: completeSignUp.createdSessionId,
                });
                const redirectUrl = searchParams.get("redirect_url");
                router.push(redirectUrl ? `/auth/auth-callback?redirect_url=${encodeURIComponent(redirectUrl)}` : "/auth/auth-callback");
            } else {
                toast.error("Kode verifikasi salah.");
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Error:', JSON.stringify(error, null, 2));
            toast.error("Terjadi kesalahan. Coba lagi nanti.");
        } finally {
            setIsLoading(false);
        }
    };

    return isVerifying ? (
        <div className="flex flex-col items-start w-full text-start gap-y-6">
            <h2 className="text-2xl font-bold tracking-[-0.02em]">
                Verifikasi email
            </h2>
            <p className="text-sm text-muted-foreground">
                Masukkan 6 digit kode yang baru kami kirim ke {email}.
            </p>
            <form onSubmit={handleVerifyEmail} className="w-full">
                <div className="space-y-2 w-full pl-0.5">
                    <Label htmlFor="code">
                        Kode verifikasi
                    </Label>
                    <InputOTP
                        id="code"
                        name="code"
                        maxLength={6}
                        value={code}
                        disabled={!isLoaded || isLoading}
                        onChange={(e) => setCode(e)}
                        className="pt-2"
                    >
                        <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                        </InputOTPGroup>
                    </InputOTP>
                </div>
                <div className="mt-4 w-full">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full"
                    >
                        {isLoading ? (
                            <LoaderIcon className="w-5 h-5 animate-spin" />
                        ) : "Verifikasi"}
                    </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                    Tidak menerima kode?{" "}
                    <Link
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            signUp?.prepareEmailAddressVerification({
                                strategy: "email_code",
                            });
                            toast.success("Kode verifikasi dikirim ulang.");
                        }}
                        className="text-primary"
                    >
                        Kirim ulang
                    </Link>
                </p>
            </form>
        </div>
    ) : (
        <div className="flex flex-col items-start gap-y-6 w-full">
            <h2 className="text-2xl font-bold tracking-[-0.02em]">
                Buat akun
            </h2>

            <div className="w-full">
                <div className="space-y-2">
                    <OAuthButton provider="github" mode="sign-up" disabled={isUpdating} />
                    <OAuthButton provider="google" mode="sign-up" disabled={isUpdating} />
                </div>
                <div className="flex items-center gap-x-3 mt-6">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">atau</span>
                    <span className="h-px flex-1 bg-border" />
                </div>
            </div>

            <form onSubmit={handleSignUp} className="w-full">
                <div className="space-y-2 w-full">
                    <Label htmlFor="name">
                        Nama
                    </Label>
                    <Input
                        id="name"
                        type="name"
                        value={name}
                        disabled={!isLoaded || isUpdating}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nama lengkap"
                        className="w-full focus-visible:border-foreground"
                    />
                </div>
                <div className="mt-4 space-y-2 w-full">
                    <Label htmlFor="email">
                        Email
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        value={email}
                        disabled={!isLoaded || isUpdating}
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
                            disabled={!isLoaded || isUpdating}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Minimal 8 karakter"
                            className="w-full focus-visible:border-foreground"
                        />
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
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
                {/*
                    Tempat Clerk menaruh widget CAPTCHA. Wajib ada sebelum
                    signUp.create() dipanggil. Tanpa elemen ini Clerk memakai
                    widget tak terlihat yang langsung memblokir trafik yang
                    dicurigai bot — user asli ditolak tanpa bisa membuktikan diri.
                */}
                <div id="clerk-captcha" className="mt-4 empty:mt-0" />
                <div className="mt-4 w-full">
                    <Button
                        type="submit"
                        disabled={!isLoaded || isUpdating}
                        className="w-full"
                    >
                        {isUpdating ? (
                            <LoaderIcon className="w-5 h-5 animate-spin" />
                        ) : "Lanjut"}
                    </Button>
                </div>
            </form>
        </div>
    )
};

export default SignUpForm
