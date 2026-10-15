import { SignUpForm } from "@/components";
import { AuthShell } from "@/components/auth/auth-shell";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SignUpPage = () => {
    return (
        <AuthShell
            footer={
                <p>
                    Sudah punya akun?{" "}
                    <Link href="/auth/sign-in" className="font-semibold text-primary">
                        Masuk
                    </Link>
                </p>
            }
        >
            <SignUpForm />
            <p className="mt-5 text-[13px] leading-relaxed text-muted-foreground">
                Dengan melanjutkan, kamu menyetujui{" "}
                <Link href="/terms" className="text-primary">
                    Ketentuan Layanan
                </Link>{" "}
                dan{" "}
                <Link href="/privacy" className="text-primary">
                    Kebijakan Privasi
                </Link>{" "}
                GitHire.
            </p>
        </AuthShell>
    );
};

export default SignUpPage;
