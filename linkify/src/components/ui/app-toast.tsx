"use client";

import { ToastContainer } from "react-toastify";
import { useTheme } from "next-themes";
import "react-toastify/dist/ReactToastify.css";

/**
 * App-wide toast host (react-toastify) — ikut tema next-themes (default dark),
 * posisi top-right. Notif "sudah dilakukan" (toast.success / toast.error).
 */
export function AppToastContainer() {
    const { resolvedTheme } = useTheme();
    return (
        <ToastContainer
            position="top-right"
            autoClose={4000}
            newestOnTop
            closeOnClick
            pauseOnHover
            theme={resolvedTheme === "light" ? "light" : "dark"}
        />
    );
}
