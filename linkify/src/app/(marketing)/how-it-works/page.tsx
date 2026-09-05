import HowItWorksRedesign from "@/components/landing/how-it-works-redesign";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Cara Kerja — GitHire",
    description: "Lihat bagaimana GitHire menyatukan CV dan GitHub menjadi portfolio, profil, dan peluang karier yang relevan.",
};

export default function HowItWorksPage() {
    return <HowItWorksRedesign />;
}
