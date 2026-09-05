import AboutRedesign from "@/components/landing/about-redesign";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Tentang GitHire",
    description: "GitHire memberi konteks pada bukti kerja developer Indonesia melalui portfolio publik, CV, GitHub, dan job matching.",
};

export default function AboutPage() {
    return <AboutRedesign />;
}
