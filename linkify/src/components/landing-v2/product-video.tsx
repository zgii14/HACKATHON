"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = {
    poster: string;
    label: string;
    mp4?: string;
    webm?: string;
};

/**
 * Rekaman produk berbingkai. Poster selalu tampil; video baru diunduh dan diputar
 * saat hampir terlihat, dijeda saat keluar layar, dan tidak pernah dimuat untuk
 * prefers-reduced-motion atau mode hemat data. Tanpa sumber video: poster saja.
 */
export function ProductVideo({ poster, label, mp4, webm }: Props) {
    const wrapper = useRef<HTMLDivElement>(null);
    const video = useRef<HTMLVideoElement>(null);
    const [active, setActive] = useState(false);
    const hasVideo = Boolean(mp4 || webm);

    useEffect(() => {
        if (!hasVideo || !wrapper.current) return;
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
        if (reduceMotion || saveData) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setActive(true);
                    video.current?.play().catch(() => undefined);
                } else {
                    video.current?.pause();
                }
            },
            { rootMargin: "200px 0px" },
        );
        observer.observe(wrapper.current);
        return () => observer.disconnect();
    }, [hasVideo]);

    return (
        <div ref={wrapper} className="overflow-hidden rounded-xl border border-border bg-muted shadow-[0_20px_60px_-24px_rgba(76,29,149,0.25)]">
            <div className="relative aspect-[16/10] w-full">
                <Image src={poster} alt={label} fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover object-top" />
                {hasVideo && active && (
                    <video ref={video} className="absolute inset-0 size-full object-cover object-top" muted loop playsInline autoPlay preload="none" poster={poster} aria-label={label}>
                        {webm && <source src={webm} type="video/webm" />}
                        {mp4 && <source src={mp4} type="video/mp4" />}
                    </video>
                )}
            </div>
        </div>
    );
}
