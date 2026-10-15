"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSignIn } from "@clerk/nextjs";
import { Eye, EyeOff, LoaderIcon } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";

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
            toast.success("Kode reset sudah dikirim. Cek email-mu.");
            setStep("code");
        } catch (err: any) {
            const errCode = err.errors?.[0]?.code;
            if (errCode === "form_identifier_not_found") {
                toast.error("Email ini belum terdaftar.");
            } else {
                toast.error("Gagal mengirim email reset. Coba lagi.");
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
            toast.error("Masukkan kode reset dari email-mu.");
            return;
        }
        if (password.length < 8) {
            toast.error("Kata sandi minimal 8 karakter.");
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Kata sandi tidak sama.");
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
                toast.success("Kata sandi berhasil diganti.");
                router.push("/dashboard");
            } else {
                toast.error("Terjadi kesalahan. Coba lagi.");
            }
        } catch (err: any) {
            const errCode = err.errors?.[0]?.code;
            if (errCode === "form_code_incorrect") {
                toast.error("Kode salah. Cek email-mu lalu coba lagi.");
            } else if (errCode === "form_password_pwned") {
                toast.error("Kata sandi terlalu umum. Pilih yang lebih kuat.");
            } else {
                toast.error("Terjadi kesalahan. Coba lagi.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthShell
            footer={
                <p>
                    Ingat kata sandimu?{" "}
                    <Link href="/auth/sign-in" className="font-semibold text-primary">
                        Masuk
                    </Link>
                </p>
            }
        >
            <div className="flex flex-col items-start gap-y-6 w-full">

                {/* Step indicator */}
                <div className="flex items-center gap-2 w-full">
                    <div className={`h-1 flex-1 rounded-full transition-colors ${step === "email" ? "bg-primary" : "bg-primary"}`} />
                    <div className={`h-1 flex-1 rounded-full transition-colors ${step === "code" ? "bg-primary" : "bg-border"}`} />
                </div>

                {step === "email" ? (
                    <>
                        <div>
                            <h2 className="text-2xl font-semibold">Lupa kata sandi?</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Kami kirim kode reset ke email-mu.
                            </p>
                        </div>
                        <form onSubmit={handleSendCode} className="w-full space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="nama@email.com"
                                    disabled={!isLoaded || isLoading}
                                    className="w-full focus-visible:border-foreground"
                                />
                            </div>
                            <Button type="submit" disabled={!isLoaded || isLoading} className="w-full">
                                {isLoading ? <LoaderIcon className="w-4 h-4 animate-spin" /> : "Kirim kode reset"}
                            </Button>
                        </form>
                    </>
                ) : (
                    <>
                        <div>
                            <h2 className="text-2xl font-semibold">Buat kata sandi baru</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Masukkan kode yang dikirim ke <span className="font-medium text-foreground">{email}</span> lalu buat kata sandi baru.
                            </p>
                        </div>
                        <form onSubmit={handleResetPassword} className="w-full space-y-4">
                            {/* Code */}
                            <div className="space-y-2">
                                <Label htmlFor="code">Kode reset</Label>
                                <Input
                                    id="code"
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="Kode dari email"
                                    disabled={!isLoaded || isLoading}
                                    className="w-full focus-visible:border-foreground tracking-widest text-center"
                                    maxLength={6}
                                />
                            </div>

                            {/* New password */}
                            <div className="space-y-2">
                                <Label htmlFor="password">Kata sandi baru</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Minimal 8 karakter"
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
                                <Label htmlFor="confirm">Ulangi kata sandi</Label>
                                <Input
                                    id="confirm"
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Ketik ulang kata sandi baru"
                                    disabled={!isLoaded || isLoading}
                                    className="w-full focus-visible:border-foreground"
                                />
                            </div>

                            <Button type="submit" disabled={!isLoaded || isLoading} className="w-full">
                                {isLoading ? <LoaderIcon className="w-4 h-4 animate-spin" /> : "Simpan kata sandi"}
                            </Button>

                            <button
                                type="button"
                                onClick={() => setStep("email")}
                                className="text-sm text-muted-foreground hover:text-primary transition-colors w-full text-center"
                            >
                                Tidak menerima kode? Kembali
                            </button>
                        </form>
                    </>
                )}
            </div>

        </AuthShell>
    );
};

export default ForgotPasswordPage;
