import Image from "next/image";
import Link from "next/link";
import { PortfolioStage } from "./portfolio-stage";

type Props = {
    ctaHref: string;
    ctaLabel: string;
    showcase: { publicId: string; ownerName: string } | null;
};

export function Hero({ ctaHref, ctaLabel, showcase }: Props) {
    return (
        <section className="px-5 pb-20 pt-12 sm:px-8 md:pt-16">
            <div className="mx-auto max-w-6xl">
                <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:gap-12">
                    <h1 className="text-[clamp(2.25rem,5vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.04em] [text-wrap:balance]">
                        Portfolio developer yang dibangun dari kode aslimu.
                    </h1>
                    <div>
                        <p className="text-[17px] leading-relaxed text-muted-foreground">
                            Disusun dari repo GitHub dan CV-mu, dengan skill terverifikasi dari commit. Pilih tampilan, bagikan satu link.
                        </p>
                        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
                            <Link
                                href={ctaHref}
                                className="inline-flex rounded-full bg-primary px-6 py-3 text-[15px] font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px"
                            >
                                {ctaLabel}
                            </Link>
                            {showcase && (
                                <Link href={`/p/${showcase.publicId}`} className="text-[15px] font-semibold text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground">
                                    Lihat portfolio contoh
                                </Link>
                            )}
                        </div>
                    </div>
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
