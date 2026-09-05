"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
    ArrowDownRightIcon,
    ArrowRightIcon,
    CheckIcon,
    FileTextIcon,
    GithubIcon,
    Layers3Icon,
    SearchIcon,
    SendIcon,
    SparklesIcon,
} from "lucide-react";
import Link from "next/link";
import { useRef, type MouseEvent } from "react";

gsap.registerPlugin(ScrollTrigger);

type Props = {
    portfolioHref: string;
    jobsHref: string;
};

const marqueeItems = ["Portfolio publik", "Project GitHub", "CV ATS", "Match score", "Skill gap", "Roadmap", "Recruiter workspace"];

const accordionItems = [
    { name: "Portfolio", title: "Satu link untuk karya yang ingin kamu tunjukkan.", copy: "Pilih project, pengalaman, dan kontak yang ingin kamu bagikan.", tint: "from-violet-500/35 via-violet-950/20 to-[#111126]", icon: Layers3Icon },
    { name: "Match", title: "Lihat lowongan dari skill yang sudah terbaca.", copy: "Bandingkan profilmu dengan requirement setiap posisi.", tint: "from-fuchsia-500/30 via-violet-950/20 to-[#111126]", icon: SearchIcon },
    { name: "Recruiter", title: "Beri konteks sebelum recruiter membuka lamaran.", copy: "Project, skill, dan pengalaman muncul dalam satu cerita yang ringkas.", tint: "from-indigo-500/35 via-violet-950/20 to-[#111126]", icon: SendIcon },
];

const journeySteps = [
    { number: "01", title: "Hubungkan", copy: "GitHub dan CV membentuk dasar profil kandidatmu.", icon: GithubIcon },
    { number: "02", title: "Pilih", copy: "Tentukan project dan pengalaman yang layak masuk halaman publik.", icon: Layers3Icon },
    { number: "03", title: "Terbitkan", copy: "Bagikan satu link portfolio saat kamu siap.", icon: FileTextIcon },
    { number: "04", title: "Cocokkan", copy: "Gunakan profil yang sama untuk membaca kecocokan lowongan.", icon: SearchIcon },
];

const LandingRedesign = ({ portfolioHref, jobsHref }: Props) => {
    const root = useRef<HTMLDivElement>(null);
    const stage = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
        intro
            .from(".landing-hero-line", { yPercent: 115, duration: 1.05, stagger: 0.12 })
            .from(".landing-hero-copy", { autoAlpha: 0, y: 22, duration: 0.7 }, "-=0.55")
            .from(".landing-hero-action", { autoAlpha: 0, y: 16, duration: 0.55, stagger: 0.1 }, "-=0.42")
            .from(".landing-stage", { autoAlpha: 0, scale: 0.9, rotate: 4, duration: 1.1 }, "-=0.8");

        gsap.to(".landing-orbit", { rotate: 360, duration: 34, repeat: -1, ease: "none" });
        gsap.to(".landing-node-core", { scale: 1.08, transformOrigin: "50% 50%", duration: 1.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
        gsap.to(".landing-recruiter-signal", { x: 24, duration: 1.8, repeat: -1, yoyo: true, ease: "sine.inOut" });

        gsap.to(gsap.utils.toArray<HTMLElement>(".landing-word"), {
            color: "rgb(250 250 250)",
            opacity: 1,
            stagger: 0.12,
            ease: "none",
            scrollTrigger: { trigger: ".landing-manifesto", start: "top 76%", end: "bottom 48%", scrub: 0.5 },
        });

        const media = gsap.matchMedia();
        media.add("(min-width: 1024px)", () => {
            ScrollTrigger.create({ trigger: ".landing-journey", start: "top top+=110", end: "bottom bottom-=120", pin: ".landing-journey-intro", pinSpacing: false });
            gsap.fromTo(
                ".landing-journey-card",
                { y: 105, opacity: 0.14, scale: 0.94 },
                { y: 0, opacity: 1, scale: 1, stagger: 0.18, ease: "none", scrollTrigger: { trigger: ".landing-journey-cards", start: "top 75%", end: "bottom 74%", scrub: 0.75 } },
            );
        });

        media.add("(max-width: 1023px)", () => {
            gsap.fromTo(
                ".landing-journey-intro",
                { autoAlpha: 0, y: 26 },
                { autoAlpha: 1, y: 0, ease: "none", scrollTrigger: { trigger: ".landing-journey", start: "top 82%", end: "top 54%", scrub: 0.45 } },
            );

            gsap.utils.toArray<HTMLElement>(".landing-journey-card").forEach((card) => {
                gsap.fromTo(
                    card,
                    { autoAlpha: 0.18, y: 44, scale: 0.96 },
                    { autoAlpha: 1, y: 0, scale: 1, ease: "none", scrollTrigger: { trigger: card, start: "top 88%", end: "top 56%", scrub: 0.5 } },
                );
            });
        });

        return () => media.revert();
    }, { scope: root });

    const handleStageMove = (event: MouseEvent<HTMLDivElement>) => {
        const element = stage.current;
        const card = element?.querySelector(".landing-stage-card");
        if (!element || !card) return;
        const bounds = element.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        gsap.to(card, { x: x * 18, y: y * 14, rotateY: x * 5, rotateX: -y * 5, duration: 0.45, ease: "power2.out" });
    };

    const resetStage = () => {
        const card = stage.current?.querySelector(".landing-stage-card");
        if (card) gsap.to(card, { x: 0, y: 0, rotateX: 0, rotateY: 0, duration: 0.8, ease: "elastic.out(1, 0.45)" });
    };

    return (
        <div ref={root} className="landing-satoshi relative -mt-20 w-full max-w-full overflow-x-hidden bg-[#080811] text-[#F7F5FF]">
            <section className="relative isolate min-h-[calc(100svh-5rem)] overflow-hidden px-5 pb-20 pt-14 sm:px-8 md:pt-20">
                <div className="absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:54px_54px]" />
                <div className="absolute left-1/2 top-[-20rem] -z-10 h-[48rem] w-[48rem] -translate-x-1/2 rounded-full bg-violet-600/25 blur-[10rem]" />
                <div className="mx-auto flex min-h-[calc(100svh-9rem)] max-w-7xl flex-col items-center justify-center text-center">
                    <h1 className="max-w-6xl font-heading text-[clamp(3.5rem,8vw,8.6rem)] font-medium leading-[0.84] tracking-[-0.065em] [text-wrap:balance]">
                        <span className="block overflow-hidden"><span className="landing-hero-line block">From code to <span className="bg-gradient-to-r from-violet-200 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent">career.</span></span></span>
                    </h1>
                    <p className="landing-hero-copy mt-8 max-w-xl text-base leading-7 text-white/60 md:text-lg">Susun portfolio dari CV dan GitHub, lalu baca lowongan dari skill yang sama.</p>
                    <div className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
                        <Link href={portfolioHref} className="landing-hero-action group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#F7F5FF] px-6 py-3.5 text-sm font-semibold text-[#100E1B] shadow-[0_0_0_rgba(167,139,250,0)] transition-[transform,box-shadow,background-color] duration-300 ease-out hover:-translate-y-1 hover:scale-[1.025] hover:bg-white hover:shadow-[0_14px_32px_rgba(167,139,250,0.28)] sm:w-[11.75rem]">Buat portfolio <ArrowDownRightIcon className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1 group-hover:-translate-y-0.5" /></Link>
                        <Link href={jobsHref} className="landing-hero-action group inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_0_rgba(167,139,250,0)] transition-[transform,box-shadow,background-color,border-color] duration-300 ease-out hover:-translate-y-1 hover:scale-[1.025] hover:border-violet-200/75 hover:bg-violet-300/15 hover:shadow-[0_14px_32px_rgba(109,40,217,0.26)] sm:w-[11.75rem]">Cari lowongan <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1" /></Link>
                    </div>

                    <div ref={stage} onMouseMove={handleStageMove} onMouseLeave={resetStage} className="landing-stage relative mt-14 w-full max-w-3xl [perspective:1200px]">
                        <div className="landing-orbit absolute left-1/2 top-[42%] h-[min(68vw,27rem)] w-[min(88vw,36rem)] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-violet-300/10" />
                        <div className="landing-stage-card relative mx-auto w-full max-w-xl [transform-style:preserve-3d]">
                            <svg viewBox="0 0 720 520" role="img" aria-label="Jaringan yang menghubungkan karya, kecocokan, dan karier" className="block w-full overflow-visible">
                                <defs>
                                    <radialGradient id="network-field" cx="50%" cy="48%" r="62%">
                                        <stop offset="0%" stopColor="#2B1A62" stopOpacity="0.92" />
                                        <stop offset="100%" stopColor="#1A123C" stopOpacity="0.54" />
                                    </radialGradient>
                                    <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="#CFA7FF" stopOpacity="0.5" />
                                        <stop offset="100%" stopColor="#7C2BED" stopOpacity="0" />
                                    </radialGradient>
                                </defs>

                                <ellipse cx="360" cy="230" rx="246" ry="152" fill="url(#network-field)" />
                                <ellipse cx="360" cy="230" rx="248" ry="154" fill="none" stroke="#C4B5FD" strokeOpacity="0.05" />

                                <g stroke="#D9D0FF" strokeOpacity="0.16" strokeWidth="2">
                                    <line x1="360" y1="230" x2="218" y2="120" />
                                    <line x1="360" y1="230" x2="218" y2="348" />
                                    <line x1="360" y1="230" x2="500" y2="158" />
                                    <line x1="360" y1="230" x2="500" y2="304" />
                                    <line x1="360" y1="230" x2="440" y2="60" strokeOpacity="0.08" />
                                    <line x1="360" y1="230" x2="148" y2="384" strokeOpacity="0.08" />
                                </g>
                                <line x1="360" y1="230" x2="218" y2="120" stroke="#B873FF" strokeWidth="3" strokeOpacity="0.84" />

                                <g fill="#E7E1FF" fillOpacity="0.48">
                                    <circle cx="146" cy="83" r="2.6" /><circle cx="276" cy="61" r="2.5" />
                                    <circle cx="436" cy="91" r="2.3" /><circle cx="552" cy="191" r="2.5" />
                                    <circle cx="551" cy="263" r="2.1" /><circle cx="435" cy="370" r="2.7" />
                                    <circle cx="350" cy="381" r="2.3" /><circle cx="181" cy="219" r="2.3" />
                                    <circle cx="145" cy="383" r="2.4" /><circle cx="519" cy="143" r="2.1" />
                                </g>

                                <g>
                                    <circle cx="218" cy="120" r="40" fill="none" stroke="#FAFAFF" strokeOpacity="0.9" strokeWidth="3" />
                                    <circle cx="218" cy="120" r="12" fill="#FAFAFF" />
                                    <circle cx="218" cy="348" r="40" fill="none" stroke="#FAFAFF" strokeOpacity="0.9" strokeWidth="3" />
                                    <circle cx="218" cy="348" r="12" fill="#FAFAFF" />
                                    <circle cx="500" cy="158" r="18" fill="none" stroke="#EDE9FE" strokeOpacity="0.62" strokeWidth="2" />
                                    <circle cx="500" cy="158" r="5" fill="#EDE9FE" fillOpacity="0.86" />
                                    <circle cx="500" cy="304" r="18" fill="none" stroke="#EDE9FE" strokeOpacity="0.62" strokeWidth="2" />
                                    <circle cx="500" cy="304" r="5" fill="#EDE9FE" fillOpacity="0.86" />
                                </g>

                                <circle cx="360" cy="230" r="66" fill="url(#core-glow)" />
                                <g className="landing-node-core">
                                    <circle cx="360" cy="230" r="34" fill="#7427D8" stroke="#A962FF" strokeWidth="3" />
                                    <circle cx="360" cy="230" r="9" fill="#FBFAFF" />
                                </g>
                            </svg>

                            <div className="mt-1 grid grid-cols-3 items-center border-t border-white/15 pt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/50 sm:text-[11px]">
                                <span>Code</span>
                                <span className="text-center text-violet-300">→ Match</span>
                                <span className="text-right">→ Career</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="border-y border-white/10 bg-[#0E0D19] py-4"><div className="flex w-max animate-marquee items-center gap-9 [--duration:32s] [--gap:2.25rem]">{[0, 1].map((copy) => <div key={copy} aria-hidden={copy === 1} className="flex items-center gap-9">{marqueeItems.map((item) => <span key={item} className="flex items-center gap-9 font-mono text-xs uppercase tracking-[0.16em] text-white/45"><span>{item}</span><span className="text-violet-300">+</span></span>)}</div>)}</div></div>

            <section className="landing-manifesto px-5 py-32 sm:px-8 md:py-48"><p className="mx-auto max-w-6xl text-center font-heading text-[clamp(2.4rem,5.3vw,6.2rem)] leading-[0.96] tracking-[-0.055em]">{"Portfolio membuat project dan pengalamanmu lebih mudah dipahami sebelum recruiter membuka lamaran.".split(" ").map((word, index) => <span key={`${word}-${index}`} className="landing-word mr-[0.22em] inline-block text-white/15">{word}</span>)}</p></section>

            <section id="features" className="border-y border-white/10 bg-[#0E0D19] px-5 py-24 sm:px-8 md:py-40"><div className="mx-auto max-w-7xl"><div className="mb-12 flex flex-col justify-between gap-5 md:mb-16 md:flex-row md:items-end"><h2 className="max-w-3xl font-heading text-[clamp(2.8rem,5vw,5.5rem)] leading-[0.9] tracking-[-0.06em]">Satu profil untuk dua arah karier.</h2><p className="max-w-sm text-sm leading-6 text-white/55">Portfolio membuat pengalamanmu mudah dibaca. Job matching membantu menentukan langkah berikutnya.</p></div>
                <div className="grid grid-flow-dense gap-3 md:grid-cols-12 md:auto-rows-[10rem]">
                    <article className="group flex min-h-[18rem] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#151421] p-5 transition duration-700 hover:-translate-y-1 hover:border-violet-200/35 hover:bg-[#1A182A] md:col-span-7 md:row-span-2 md:min-h-0 md:p-7"><Layers3Icon className="h-5 w-5 text-violet-200 transition-transform duration-700 group-hover:rotate-12 group-hover:scale-110" /><h3 className="mt-6 max-w-lg font-heading text-3xl leading-[0.95] tracking-[-0.045em]">Portfolio yang bisa kamu kurasi.</h3><p className="mt-3 max-w-md text-sm leading-6 text-white/50">Ambil fondasi dari CV dan GitHub, lalu pilih apa yang benar-benar ingin ditampilkan.</p><div className="mt-auto grid grid-cols-[1fr_auto] gap-4 border-t border-white/10 pt-5"><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">Public link</p><p className="mt-2 text-sm font-medium text-white">githire.id/p/namamu</p></div><div className="flex -space-x-3">{["CV", "GH", "CV"].map((label, index) => <span key={`${label}-${index}`} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#161629] text-[10px] font-semibold text-violet-100">{label}</span>)}</div></div></article>
                    <article className="group flex min-h-[14rem] flex-col rounded-2xl border border-white/10 bg-[#151421] p-5 transition duration-700 hover:-translate-y-1 hover:border-violet-200/35 md:col-span-5 md:min-h-0 md:p-7"><GithubIcon className="h-5 w-5 text-violet-200" /><h3 className="mt-5 font-heading text-2xl leading-[0.95] tracking-[-0.045em]">CV dan GitHub, satu profil.</h3><p className="mt-3 text-sm leading-6 text-white/50">Data yang sama mengisi portfolio dan dasar match lowongan.</p><p className="mt-auto text-sm text-violet-200">Repository, bahasa, pengalaman</p></article>
                    <article className="group flex min-h-[14rem] flex-col rounded-2xl border border-white/10 bg-[#151421] p-5 transition duration-700 hover:-translate-y-1 hover:border-violet-200/35 md:col-span-5 md:min-h-0 md:p-7"><SparklesIcon className="h-5 w-5 text-violet-200" /><h3 className="mt-5 font-heading text-2xl leading-[0.95] tracking-[-0.045em]">Tiga tema, tetap punyamu.</h3><p className="mt-3 text-sm leading-6 text-white/50">Pilih tampilan yang cocok sebelum link dibagikan.</p><div className="mt-auto flex gap-2">{["Editorial", "Developer", "Maxfolio"].map((theme) => <span key={theme} className="rounded-full border border-white/15 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.08em] text-white/55">{theme}</span>)}</div></article>
                    <article className="group flex min-h-[18rem] flex-col rounded-2xl border border-white/10 bg-[#151421] p-5 transition duration-700 hover:-translate-y-1 hover:border-violet-200/35 md:col-span-4 md:row-span-2 md:min-h-0 md:p-7"><SearchIcon className="h-5 w-5 text-violet-200" /><h3 className="mt-6 font-heading text-3xl leading-[0.95] tracking-[-0.045em]">Baca requirement sebelum melamar.</h3><p className="mt-3 text-sm leading-6 text-white/50">Match score menunjukkan skill yang sudah ada dan yang masih perlu dipelajari.</p><div className="mt-auto"><div className="flex items-end justify-between"><span className="font-heading text-3xl tracking-[-0.06em]">Skill map</span><span className="mb-1 text-sm text-violet-200">per posisi</span></div><div className="mt-4 flex gap-1"><span className="h-1.5 flex-[4] rounded-full bg-violet-300" /><span className="h-1.5 flex-[3] rounded-full bg-violet-300/45" /><span className="h-1.5 flex-[2] rounded-full bg-white/10" /></div></div></article>
                    <article className="group flex min-h-[18rem] flex-col rounded-2xl border border-white/10 bg-[#151421] p-5 transition duration-700 hover:-translate-y-1 hover:border-violet-200/35 md:col-span-8 md:row-span-2 md:min-h-0 md:p-7"><SendIcon className="h-5 w-5 text-violet-200" /><h3 className="mt-6 max-w-lg font-heading text-3xl leading-[0.95] tracking-[-0.045em]">Recruiter melihat project, skill, dan pengalaman lebih awal.</h3><p className="mt-3 max-w-md text-sm leading-6 text-white/50">Portfolio publik memberi titik awal sebelum mereka membuka aplikasi dan screening kandidat.</p><div className="mt-auto grid grid-cols-3 gap-2 border-t border-white/10 pt-5 text-center font-mono text-[9px] uppercase tracking-[0.1em] text-white/45"><span className="rounded border border-white/10 py-2">Project</span><span className="rounded border border-white/10 py-2">Skill</span><span className="rounded border border-violet-300/30 bg-violet-300/10 py-2 text-violet-100">Review</span></div></article>
                </div></div></section>

            <section className="px-5 py-32 sm:px-8 md:py-48"><div className="mx-auto max-w-7xl"><div className="mb-12 max-w-3xl md:mb-16"><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-violet-200/65">Portfolio, match, recruiter</p><h2 className="mt-5 font-heading text-[clamp(2.8rem,5vw,5.7rem)] leading-[0.9] tracking-[-0.06em]">Buka yang paling penting dulu.</h2></div><div className="flex flex-col gap-3 md:h-[30rem] md:flex-row">{accordionItems.map((item) => { const Icon = item.icon; return <article key={item.name} className={`group relative min-h-[12rem] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br p-6 transition-[flex,transform,border-color] duration-700 ease-out hover:border-violet-200/40 md:min-h-0 md:flex-[0.85] md:hover:flex-[2.3] ${item.tint}`}><div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl transition-transform duration-700 group-hover:scale-150" /><div className="relative flex h-full flex-col justify-between"><Icon className="h-6 w-6 text-violet-100" /><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">{item.name}</p><h3 className="mt-3 max-w-lg font-heading text-2xl leading-[0.95] tracking-[-0.045em] md:text-4xl">{item.title}</h3><p className="mt-4 max-w-md text-sm leading-6 text-white/55 md:opacity-0 md:transition-opacity md:duration-500 md:group-hover:opacity-100">{item.copy}</p></div></div></article>; })}</div></div></section>

            <section className="landing-journey border-y border-white/10 bg-[#0E0D19] px-5 py-32 sm:px-8 md:py-48"><div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24"><div className="landing-journey-intro self-start lg:pt-8"><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-violet-200/65">Dari bukti ke peluang</p><h2 className="mt-5 max-w-xl font-heading text-[clamp(3rem,5vw,5.7rem)] leading-[0.9] tracking-[-0.06em]">Satu profil untuk portfolio dan pencarian kerja.</h2><p className="mt-7 max-w-sm text-base leading-7 text-white/55">CV dan GitHub yang kamu hubungkan tetap menjadi dasar saat menerbitkan portfolio atau mencari lowongan.</p><Link href={portfolioHref} className="mt-9 inline-flex items-center gap-2 border-b border-violet-200/60 pb-1 text-sm font-semibold text-violet-100 transition-colors hover:border-white hover:text-white">Mulai dari portfolio <ArrowRightIcon className="h-4 w-4" /></Link></div><div className="landing-journey-cards space-y-5">{journeySteps.map((step) => { const Icon = step.icon; return <article key={step.number} className="landing-journey-card rounded-2xl border border-white/10 bg-[#171624] p-6 shadow-2xl shadow-black/20 sm:p-8"><div className="flex items-start justify-between"><span className="font-mono text-xs tracking-[0.16em] text-violet-200/65">{step.number}</span><Icon className="h-5 w-5 text-violet-200" /></div><h3 className="mt-12 font-heading text-4xl leading-none tracking-[-0.055em]">{step.title}</h3><p className="mt-4 max-w-md text-sm leading-6 text-white/55">{step.copy}</p><div className="mt-7 flex items-center gap-2 text-xs text-violet-100"><CheckIcon className="h-3.5 w-3.5" /> Satu profil yang sama</div></article>; })}</div></div></section>

            <section className="relative overflow-hidden px-5 py-32 sm:px-8 md:py-48"><div className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/15 blur-[9rem]" /><div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:gap-24"><div><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-200/70">Untuk recruiter</p><h2 className="mt-5 max-w-xl font-heading text-[clamp(3rem,5.3vw,6rem)] leading-[0.88] tracking-[-0.065em]">Temukan developer dengan konteks yang jelas.</h2><p className="mt-7 max-w-sm text-base leading-7 text-white/55">Buka profil kandidat yang merangkai proyek, pengalaman, dan skill dalam satu halaman sebelum kamu melanjutkan ke proses rekrutmen.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/recruiter/apply" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#141321] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_14px_32px_rgba(167,139,250,0.28)]">Daftar sebagai recruiter <ArrowDownRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5" /></Link><Link href="/how-it-works" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-6 text-sm font-semibold text-white transition-[transform,border-color,background-color] duration-300 hover:-translate-y-1 hover:border-violet-200/75 hover:bg-violet-300/15">Lihat cara kerja <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></Link></div></div>
                <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#141224]/85 p-5 shadow-[0_32px_100px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-7"><div className="flex items-center justify-between border-b border-white/10 pb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45"><span>Recruiter workspace</span><span className="text-violet-200">Candidate view</span></div><div className="mt-5 grid gap-3 md:grid-cols-[0.95fr_auto_1.05fr]"><div className="rounded-2xl border border-white/10 bg-[#0B0A15]/60 p-5"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">01 · Lowongan</p><h3 className="mt-8 font-heading text-3xl leading-[0.9] tracking-[-0.055em]">Tulis requirement yang dibutuhkan.</h3><div className="mt-7 flex flex-wrap gap-2"><span className="rounded-full border border-violet-200/25 bg-violet-300/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-violet-100">Skill</span><span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-white/50">Peran</span></div></div><div className="hidden items-center justify-center md:flex"><div className="relative h-px w-12 bg-violet-200/25"><span className="landing-recruiter-signal absolute -top-1.5 left-0 h-3 w-3 rounded-full bg-violet-200 shadow-[0_0_16px_rgba(196,181,253,0.9)]" /></div></div><div className="rounded-2xl border border-violet-200/20 bg-violet-300/10 p-5"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-violet-100/60">02 · Profil kandidat</p><h3 className="mt-8 font-heading text-3xl leading-[0.9] tracking-[-0.055em]">Baca proyek sebelum membuka lamaran.</h3><div className="mt-7 grid grid-cols-3 gap-2 border-t border-violet-100/15 pt-4 text-center font-mono text-[9px] uppercase tracking-[0.1em] text-violet-100/60"><span>Project</span><span>Skill</span><span>Experience</span></div></div></div><div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-[#0B0A15]/50 p-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">03 · Lanjutkan</p><p className="mt-2 text-sm text-white/65">Undang kandidat atau mulai percakapan saat sudah ada konteks.</p></div><SendIcon className="h-5 w-5 text-violet-200" /></div></div></div></section>

            <section className="px-5 py-32 sm:px-8 md:py-48"><div className="mx-auto max-w-7xl rounded-[2rem] border border-violet-200/20 bg-[radial-gradient(circle_at_50%_0%,rgba(167,139,250,0.28),transparent_55%),#171525] px-6 py-20 text-center sm:px-12 md:py-32"><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-100/70">Mulai dari yang sudah kamu buat</p><h2 className="mx-auto mt-6 max-w-5xl font-heading text-[clamp(3rem,7vw,7.8rem)] leading-[0.84] tracking-[-0.07em]">Siapkan portfolio. Cari peluang yang cocok.</h2><p className="mx-auto mt-8 max-w-xl text-base leading-7 text-white/60">Hubungkan CV dan GitHub, pilih karya yang ingin kamu tampilkan, lalu gunakan profil itu untuk menemukan lowongan.</p><div className="mt-10 flex flex-wrap justify-center gap-3"><Link href={portfolioHref} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#141321] transition-transform duration-300 hover:-translate-y-1">Buat portfolio <ArrowDownRightIcon className="h-4 w-4" /></Link><Link href={jobsHref} className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">Cari lowongan <ArrowRightIcon className="h-4 w-4" /></Link></div></div></section>
        </div>
    );
};

export default LandingRedesign;
