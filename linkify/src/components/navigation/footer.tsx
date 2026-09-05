"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDownRightIcon, ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

const footerGroups = [
    {
        title: "Eksplorasi",
        links: [
            { label: "Fitur", href: "/#features" },
            { label: "Cara kerja", href: "/how-it-works" },
            { label: "Masuk", href: "/auth/sign-in" },
        ],
    },
    {
        title: "Karier",
        links: [
            { label: "Lowongan", href: "/dashboard/jobs" },
            { label: "Skill gap", href: "/dashboard/skill-gap" },
            { label: "Roadmap", href: "/dashboard/roadmap" },
        ],
    },
    {
        title: "Informasi",
        links: [
            { label: "Tentang GitHire", href: "/about" },
            { label: "Privasi", href: "/privacy" },
            { label: "Ketentuan", href: "/terms" },
        ],
    },
];

const Footer = () => {
    const root = useRef<HTMLElement>(null);

    useGSAP(() => {
        gsap.fromTo(
            ".footer-reveal",
            { autoAlpha: 0, y: 42, scale: 0.97 },
            {
                autoAlpha: 1,
                y: 0,
                scale: 1,
                duration: 0.9,
                stagger: 0.11,
                ease: "power3.out",
                scrollTrigger: { trigger: ".landing-footer", start: "top 78%", once: true },
            },
        );
        gsap.to(".footer-signal", { yPercent: -28, opacity: 0.42, ease: "none", scrollTrigger: { trigger: ".landing-footer", start: "top bottom", end: "bottom bottom", scrub: 0.7 } });
    }, { scope: root });

    return (
        <footer ref={root} className="landing-footer relative isolate overflow-hidden border-t border-white/10 bg-[#080811] px-5 pb-7 pt-24 text-[#F7F5FF] sm:px-8 md:pt-32">
            <div className="footer-signal pointer-events-none absolute -right-20 top-8 -z-10 h-80 w-80 rounded-full bg-violet-600/20 blur-[7rem]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-violet-300/65 to-transparent" />

            <div className="mx-auto max-w-7xl">
                <div className="footer-reveal grid gap-10 border-b border-white/10 pb-16 lg:grid-cols-[1.18fr_0.82fr] lg:items-end lg:gap-20">
                    <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-200/70">From code to career</p>
                        <h2 className="mt-5 max-w-3xl font-sans text-[clamp(3.2rem,6vw,6.8rem)] font-medium leading-[0.84] tracking-[-0.065em]">Buat karya yang layak <span className="bg-gradient-to-r from-violet-200 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent">dibuka.</span></h2>
                    </div>
                    <div className="max-w-md lg:pb-1">
                        <p className="text-base leading-7 text-white/60">Portfolio publik dan pencarian lowongan memakai dasar yang sama: pengalaman, project, dan skill yang bisa kamu buktikan.</p>
                        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                            <Link href="/auth/sign-up" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F7F5FF] px-5 text-sm font-semibold text-[#100E1B] transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_14px_32px_rgba(167,139,250,0.28)]">Mulai sekarang <ArrowDownRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5" /></Link>
                            <Link href="/dashboard/jobs" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-5 text-sm font-semibold text-white transition-[transform,background-color,border-color] duration-300 ease-out hover:-translate-y-1 hover:border-violet-200/75 hover:bg-violet-300/15">Lihat lowongan <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></Link>
                        </div>
                    </div>
                </div>

                <div className="grid gap-12 py-14 md:grid-cols-[1.1fr_1.9fr] md:gap-16">
                    <div className="footer-reveal flex max-w-xs flex-col gap-5">
                        <Link href="/" className="group inline-flex w-fit items-center gap-3" aria-label="GitHire, kembali ke beranda">
                            <span className="relative flex h-9 w-9 items-center justify-center rounded-full border border-violet-200/35 bg-violet-300/10 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                                <span className="h-2.5 w-2.5 rounded-full bg-violet-200 shadow-[0_0_18px_rgba(196,181,253,0.9)]" />
                            </span>
                            <span className="font-sans text-xl font-semibold tracking-[-0.06em]">Git<span className="text-violet-300">Hire</span></span>
                        </Link>
                        <p className="text-sm leading-6 text-white/45">Ruang karier untuk developer Indonesia yang ingin menunjukkan bukti kerja, bukan hanya daftar skill.</p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">Portfolio · Match · Recruiter</p>
                    </div>

                    <div className="footer-reveal grid grid-cols-2 gap-x-7 gap-y-10 sm:grid-cols-3 sm:gap-x-10">
                        {footerGroups.map((group) => (
                            <nav key={group.title} aria-label={group.title}>
                                <h3 className="font-mono text-[10px] uppercase tracking-[0.17em] text-violet-100/60">{group.title}</h3>
                                <ul className="mt-5 space-y-3">
                                    {group.links.map((link) => (
                                        <li key={link.href}>
                                            <Link href={link.href} className="group inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors duration-300 hover:text-white">
                                                <span>{link.label}</span><ArrowRightIcon className="h-3 w-3 -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </nav>
                        ))}
                    </div>
                </div>

                <div className="footer-reveal flex flex-col gap-5 border-t border-white/10 py-6 text-[11px] text-white/35 sm:flex-row sm:items-center sm:justify-between">
                    <p>© {new Date().getFullYear()} GitHire. Dibuat untuk developer Indonesia.</p>
                    <div className="flex items-center gap-4 font-mono uppercase tracking-[0.13em]">
                        <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,0.9)]" /> Sistem aktif</span>
                        <span>Jakarta, ID</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
