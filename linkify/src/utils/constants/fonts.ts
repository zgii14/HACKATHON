import localFont from "next/font/local";

export const aeonik = localFont({
    src: [
        {
            path: "../../../public/fonts/AeonikPro-Light.woff2",
            weight: "300",
        },
        {
            path: "../../../public/fonts/AeonikPro-Regular.woff2",
            weight: "400",
        },
        {
            path: "../../../public/fonts/AeonikPro-Medium.woff2",
            weight: "500",
        },
        {
            path: "../../../public/fonts/AeonikPro-Bold.woff2",
            weight: "700",
        },
        {
            path: "../../../public/fonts/AeonikPro-Black.woff2",
            weight: "900",
        }
    ],
    variable: "--font-aeonik",
});

export const inter = localFont({
    src: [
        {
            path: "../../../public/fonts/Inter-Light.woff2",
            weight: "300",
        },
        {
            path: "../../../public/fonts/Inter-Regular.woff2",
            weight: "400",
        },
        {
            path: "../../../public/fonts/Inter-Medium.woff2",
            weight: "500",
        },
        {
            path: "../../../public/fonts/Inter-SemiBold.woff2",
            weight: "600",
        },
        {
            path: "../../../public/fonts/Inter-Bold.woff2",
            weight: "700",
        },
    ],
    variable: "--font-inter",
});

