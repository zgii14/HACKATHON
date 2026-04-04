import { SignUpForm } from "@/components";
import Link from "next/link";

const SignUpPage = () => {
    return (
        <div className="flex flex-col items-start max-w-sm mx-auto h-dvh overflow-hidden pt-4 md:pt-20">
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

            <SignUpForm />

            <div className="flex flex-col items-start w-full">
                <p className="text-sm text-muted-foreground">
                    By signing in, you agree to our{" "}
                    <Link href="/terms" className="text-primary">
                        Terms of Service{" "}
                    </Link>
                    and{" "}
                    <Link href="/privacy" className="text-primary">
                        Privacy Policy
                    </Link>
                </p>
            </div>
            <div className="flex items-start mt-auto border-t border-border/80 py-6 w-full">
                <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/auth/sign-in" className="text-primary">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
};

export default SignUpPage
