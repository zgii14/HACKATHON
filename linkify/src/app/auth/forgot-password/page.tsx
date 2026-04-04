"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignIn } from "@clerk/nextjs";
import { Eye, EyeOff, LoaderIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Step = "email" | "code";

const ForgotPasswordPage = () => {
    const { signIn, isLoaded, setActive } = useSignIn();
    const router = useRouter();

    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Step 1: Send reset code
    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded || !email) return;

        setIsLoading(true);
        try {
            await signIn.create({
                strategy: "reset_password_email_code",
                identifier: email,
            });
            toast.success("Reset code sent! Check your email.");
            setStep("code");
        } catch (err: any) {
            const errCode = err.errors?.[0]?.code;
            if (errCode === "form_identifier_not_found") {
                toast.error("This email is not registered.");
            } else {
                toast.error("Failed to send reset email. Try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Verify code + set new password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;

        if (!code) {
            toast.error("Please enter the reset code from your email.");
            return;
        }
        if (password.length < 8) {
            toast.error("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        try {
            const result = await signIn.attemptFirstFactor({
                strategy: "reset_password_email_code",
                code,
                password,
            });

            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                toast.success("Password reset successful!");
                router.push("/dashboard");
            } else {
                toast.error("Something went wrong. Please try again.");
            }
        } catch (err: any) {
            const errCode = err.errors?.[0]?.code;
            if (errCode === "form_code_incorrect") {
                toast.error("Invalid code. Please check your email and try again.");
            } else if (errCode === "form_password_pwned") {
                toast.error("This password is too common. Choose a stronger one.");
            } else {
                toast.error("An error occurred. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-start max-w-sm mx-auto h-dvh overflow-hidden pt-4 md:pt-20">
            {/* Logo */}
            <div className="flex items-center w-full py-8 border-b border-border/80">
                <Link href="/#home" className="flex items-center">
                    <svg width="110" height="30" viewBox="0 0 180 60" xmlns="http://www.w3.org/2000/svg" aria-label="GitHire">
                        <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="16" cy="44" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="34" cy="30" r="6" fill="#6d28d9" />
                        <line x1="16" y1="22" x2="16" y2="38" stroke="currentColor" strokeWidth="2" />
                        <line x1="20" y1="18" x2="30" y2="26" stroke="currentColor" strokeWidth="2" />
                        <text x="50" y="30" fontFamily="system-ui,sans-serif" fontSize="22" fontWeight="700" fill="currentColor" dominantBaseline="central">
                            Git<tspan fill="#8b5cf6">Hire</tspan>
                        </text>
                    </svg>
                </Link>
            </div>

            <div className="flex flex-col items-start gap-y-6 py-8 w-full px-0.5">

                {/* Step indicator */}
                <div className="flex items-center gap-2 w-full">
                    <div className={`h-1 flex-1 rounded-full transition-colors ${step === "email" ? "bg-primary" : "bg-primary"}`} />
                    <div className={`h-1 flex-1 rounded-full transition-colors ${step === "code" ? "bg-primary" : "bg-border"}`} />
                </div>

                {step === "email" ? (
                    <>
                        <div>
                            <h2 className="text-2xl font-semibold">Forgot your password?</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                We&apos;ll send a reset code to your email.
                            </p>
                        </div>
                        <form onSubmit={handleSendCode} className="w-full space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email address</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    disabled={!isLoaded || isLoading}
                                    className="w-full focus-visible:border-foreground"
                                />
                            </div>
                            <Button type="submit" disabled={!isLoaded || isLoading} className="w-full">
                                {isLoading ? <LoaderIcon className="w-4 h-4 animate-spin" /> : "Send reset code"}
                            </Button>
                        </form>
                    </>
                ) : (
                    <>
                        <div>
                            <h2 className="text-2xl font-semibold">Set a new password</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Enter the code sent to <span className="font-medium text-foreground">{email}</span> and choose a new password.
                            </p>
                        </div>
                        <form onSubmit={handleResetPassword} className="w-full space-y-4">
                            {/* Code */}
                            <div className="space-y-2">
                                <Label htmlFor="code">Reset code</Label>
                                <Input
                                    id="code"
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Enter code from email"
                                    disabled={!isLoaded || isLoading}
                                    className="w-full focus-visible:border-foreground tracking-widest text-center"
                                    maxLength={6}
                                />
                            </div>

                            {/* New password */}
                            <div className="space-y-2">
                                <Label htmlFor="password">New password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="At least 8 characters"
                                        disabled={!isLoaded || isLoading}
                                        className="w-full focus-visible:border-foreground"
                                    />
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="absolute top-1 right-1"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>

                            {/* Confirm */}
                            <div className="space-y-2">
                                <Label htmlFor="confirm">Confirm password</Label>
                                <Input
                                    id="confirm"
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter new password"
                                    disabled={!isLoaded || isLoading}
                                    className="w-full focus-visible:border-foreground"
                                />
                            </div>

                            <Button type="submit" disabled={!isLoaded || isLoading} className="w-full">
                                {isLoading ? <LoaderIcon className="w-4 h-4 animate-spin" /> : "Reset password"}
                            </Button>

                            <button
                                type="button"
                                onClick={() => setStep("email")}
                                className="text-sm text-muted-foreground hover:text-primary transition-colors w-full text-center"
                            >
                                Didn&apos;t receive a code? Go back
                            </button>
                        </form>
                    </>
                )}
            </div>

            <div className="flex items-center mt-auto border-t border-border/80 py-6 w-full">
                <p className="text-sm text-muted-foreground">
                    Remember your password?{" "}
                    <Link href="/auth/sign-in" className="text-primary">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
