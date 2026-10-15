import { SignInForm } from "@/components";
import { AuthShell } from "@/components/auth/auth-shell";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SignInPage = () => {
    return (
        <AuthShell
            footer={
                <div className="flex items-center justify-between gap-4">
                    <p>
                        Belum punya akun?{" "}
                        <Link href="/auth/sign-up" className="font-semibold text-primary">
                            Daftar
                        </Link>
                    </p>
                    <Link href="/auth/forgot-password" className="transition-colors hover:text-primary">
                        Lupa kata sandi?
                    </Link>
                </div>
            }
        >
            <SignInForm />
        </AuthShell>
    );
};

export default SignInPage;
