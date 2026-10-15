import { AuthBackdrop } from "@/components/auth/auth-backdrop";
import { AppToastContainer } from "@/components/ui/app-toast";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <AppToastContainer />
            <AuthBackdrop />
            <main className="relative mx-auto w-full">{children}</main>
        </>
    );
}
