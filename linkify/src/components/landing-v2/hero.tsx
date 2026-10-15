import Image from "next/image";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { CtaLink } from "./cta-link";
import { PortfolioStage } from "./portfolio-stage";

const HEADLINE = "Portfolio developer yang dibangun dari kode aslimu.".split(" ");
// Urutan masuk: kata judul satu per satu, lalu paragraf, lalu tombol.
const order = (i: number) => ({ "--i": i }) as CSSProperties;

type Props = {
    showcase: { publicId: string; ownerName: string } | null;
};

export function Hero({ showcase }: Props) {
    return (
        <section className="px-5 pb-20 pt-12 sm:px-8 md:pt-16">
            <div className="mx-auto max-w-6xl">
                {/* Bertumpuk (bukan judul kiri + paragraf kanan): satu pesan, dua baris di desktop. */}
                <h1 className="max-w-5xl text-[clamp(2.25rem,5vw,3.75rem)] font-extrabold leading-[1.04] tracking-[-0.04em] [text-wrap:balance]">
                    {HEADLINE.map((word, i) => (
                        <span key={i}>
                            <span className="landing-rise inline-block" style={order(i)}>
                                {word}
                            </span>{" "}
                        </span>
                    ))}
                </h1>
                <p style={order(HEADLINE.length + 1)} className="landing-rise mt-5 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
                    Disusun dari repo GitHub dan CV-mu, dengan skill terverifikasi dari commit. Pilih tampilan, bagikan satu link.
                </p>
                <div style={order(HEADLINE.length + 3)} className="landing-rise mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <CtaLink className="inline-flex rounded-full bg-primary px-6 py-3 text-[15px] font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px" />
                    {showcase && (
                        <Link href={`/p/${showcase.publicId}`} className="group inline-flex items-center gap-1.5 text-[15px] font-semibold text-foreground">
                            <span className="underline decoration-border underline-offset-4 transition-colors group-hover:decoration-foreground">Lihat portfolio contoh</span>
                            <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-1" />
                        </Link>
                    )}
                </div>

                <div className="mt-12 md:mt-14">
                    {showcase ? (
                        <PortfolioStage publicId={showcase.publicId} ownerName={showcase.ownerName} />
                    ) : (
                        <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border">
                            <Image src="/landing/portfolio-professional.webp" alt="Contoh portfolio GitHire" fill priority sizes="(min-width: 1152px) 1088px, 100vw" className="object-cover object-top" />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
