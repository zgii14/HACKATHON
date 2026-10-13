import localFont from "next/font/local";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

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


// Font UI utama dan font angka/kode; di-self-host oleh next/font (tanpa @import remote).
export const jakarta = Plus_Jakarta_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
    variable: "--font-jakarta",
    display: "swap",
});

export const jetbrains = JetBrains_Mono({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    variable: "--font-jetbrains",
    display: "swap",
});
