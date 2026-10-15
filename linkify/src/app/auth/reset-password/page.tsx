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
            toast.error("Kata sandi tidak sama.");
            return;
        }
        if (password.length < 8) {
            toast.error("Kata sandi minimal 8 karakter.");
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
                toast.error("Gagal mengganti kata sandi. Coba lagi.");
            }
        } catch (err: any) {
            const code = err.errors?.[0]?.code;
            if (code === "form_code_incorrect") {
                toast.error("Kode reset salah. Cek email-mu.");
            } else if (code === "form_password_pwned") {
                toast.error("Kata sandi terlalu umum. Pilih yang lain.");
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
                <div>
                    <h2 className="text-2xl font-semibold">Buat kata sandi baru</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Masukkan kode dari email-mu lalu buat kata sandi baru.
                    </p>
                </div>

                <form onSubmit={handleReset} className="w-full space-y-4">
                    {/* Reset code */}
                    <div className="space-y-2">
                        <Label htmlFor="code">Kode reset</Label>
                        <Input
                            id="code"
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Kode dari email"
                            disabled={!isLoaded || isLoading}
                            className="w-full focus-visible:border-foreground tracking-widest"
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

                    {/* Confirm password */}
                    <div className="space-y-2">
                        <Label htmlFor="confirm">Ulangi kata sandi baru</Label>
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
                </form>
            </div>

        </AuthShell>
    );
};

export default ResetPasswordPage;
