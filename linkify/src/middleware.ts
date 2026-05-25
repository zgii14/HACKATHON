import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);
const isAuthRoute = createRouteMatcher(["/auth/sign-in(.*)", "/auth/sign-up(.*)"]);

export default clerkMiddleware((auth, req) => {
    // Protect dashboard routes — pass signInUrl so Clerk knows
    // where to send unauthenticated users and can set the
    // "redirect_url" param so users come back after sign-in.
    if (isProtectedRoute(req)) {
        auth().protect({
            unauthenticatedUrl: new URL("/auth/sign-in", req.url).toString(),
        });
    }

    // Redirect authenticated users away from auth routes
    if (isAuthRoute(req) && auth().userId) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }
});

export const config = {
    matcher: [
        "/((?!.*\\..*|_next).*)",
        "/(api|trpc)(.*)",
        "/dashboard(.*)",
        "/",
        "/auth/sign-in",
        "/auth/sign-up",
    ],
};