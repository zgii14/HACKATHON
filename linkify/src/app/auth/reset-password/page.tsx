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

const ResetPasswordPage = () => {
    const { signIn, isLoaded, setActive } = useSignIn();
    const router = useRouter();

    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;

        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }
        if (password.length < 8) {
            toast.error("Password must be at least 8 characters.");
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
                toast.error("Reset failed. Please try again.");
            }
        } catch (err: any) {
            const code = err.errors?.[0]?.code;
            if (code === "form_code_incorrect") {
                toast.error("Invalid reset code. Please check your email.");
            } else if (code === "form_password_pwned") {
                toast.error("This password is too common. Please choose another.");
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
                <div>
                    <h2 className="text-2xl font-semibold">Set a new password</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Enter the code from your email and choose a new password.
                    </p>
                </div>

                <form onSubmit={handleReset} className="w-full space-y-4">
                    {/* Reset code */}
                    <div className="space-y-2">
                        <Label htmlFor="code">Reset code</Label>
                        <Input
                            id="code"
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Enter code from email"
                            disabled={!isLoaded || isLoading}
                            className="w-full focus-visible:border-foreground tracking-widest"
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

                    {/* Confirm password */}
                    <div className="space-y-2">
                        <Label htmlFor="confirm">Confirm new password</Label>
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
                </form>
            </div>

            <div className="flex items-center mt-auto border-t border-border/80 py-6 w-full">
                <p className="text-sm text-muted-foreground">
                    Back to{" "}
                    <Link href="/auth/sign-in" className="text-primary">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
