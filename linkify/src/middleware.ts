import { subdomainFromHost, ROOT_DOMAIN } from "@/utils/functions/subdomain-host";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);

const clerk = clerkMiddleware(async (auth, req) => {
    if (isDashboardRoute(req)) {
        await auth().protect();
    }
});

export default function middleware(req: NextRequest, event: NextFetchEvent) {
    // nama.githire.my.id hanya melayani portfolio publik; Clerk tidak dijalankan di sana.
    const name = subdomainFromHost(req.headers.get("host"));
    if (name) {
        if (req.nextUrl.pathname === "/") {
            return NextResponse.rewrite(new URL(`/s/${name}`, req.url));
        }
        return NextResponse.redirect(new URL(`${req.nextUrl.pathname}${req.nextUrl.search}`, `https://www.${ROOT_DOMAIN}`), 307);
    }
    return clerk(req, event);
}

export const config = {
    matcher: [
        "/((?!.*\..*|_next).*)",
        "/(api|trpc)(.*)",
        "/dashboard(.*)",
        "/",
        "/auth/sign-in",
        "/auth/sign-up",
    ],
};
