import { subdomainFromHost, ROOT_DOMAIN } from "@/utils/functions/subdomain-host";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
    // nama.githire.my.id hanya melayani portfolio publik.
    const name = subdomainFromHost(req.headers.get("host"));
    if (name) {
        if (req.nextUrl.pathname === "/") {
            return NextResponse.rewrite(new URL(`/s/${name}`, req.url));
        }
        return NextResponse.redirect(new URL(`${req.nextUrl.pathname}${req.nextUrl.search}`, `https://www.${ROOT_DOMAIN}`), 307);
    }
    if (isDashboardRoute(req)) {
        await auth().protect();
    }
});

export const config = {
    matcher: [
        // WAJIB dua backslash ("\\." = titik literal). Dengan satu backslash pola ini mengecualikan
        // hampir semua path, middleware Clerk tidak jalan, dan auth()/currentUser() di server error.
        // Dijaga oleh tests/middleware-matcher.test.mts.
        "/((?!.*\\..*|_next).*)",
        "/(api|trpc)(.*)",
        "/dashboard(.*)",
        "/",
        "/auth/sign-in",
        "/auth/sign-up",
    ],
};
