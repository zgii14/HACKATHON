"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDownRightIcon, ArrowRightIcon, BriefcaseIcon, ChevronLeftIcon, ChevronRightIcon, FileTextIcon, GithubIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

gsap.registerPlugin(ScrollTrigger);

const outcomes = [
    { label: "Portfolio publik", title: "Karya mendapat halaman yang jelas.", copy: "Pilih project dan pengalaman yang ingin kamu tampilkan saat link siap dibagikan.", icon: FileTextIcon },
    { label: "Match yang terbaca", title: "Requirement punya konteks.", copy: "Bandingkan skill yang terbaca dengan setiap lowongan sebelum memilih peluang berikutnya.", icon: SparklesIcon },
    { label: "Aplikasi yang siap", title: "Lamaran dimulai dari bukti.", copy: "Gunakan profil, pengalaman, dan konteks posisi untuk menyiapkan langkah berikutnya.", icon: BriefcaseIcon },
];

const flowSteps = [
    { id: "01", title: "Connect", copy: "GitHub dan CV masuk ke satu workspace." },
    { id: "02", title: "Frame", copy: "Karya dan pengalaman diberi konteks." },
    { id: "03", title: "Compare", copy: "Profil dibaca bersama requirement posisi." },
    { id: "04", title: "Move", copy: "Portfolio dan peluang siap ditindaklanjuti." },
];

function NodeMark({ tone = "violet" }: { tone?: "violet" | "white" }) {
    return <span className={`relative flex h-9 w-9 items-center justify-center rounded-full border ${tone === "violet" ? "border-violet-200/35 bg-violet-300/12" : "border-white/20 bg-white/[0.04]"}`}><span className={`h-2.5 w-2.5 rounded-full ${tone === "violet" ? "bg-violet-200 shadow-[0_0_16px_rgba(196,181,253,0.9)]" : "bg-white/85"}`} /></span>;
}

export default function HowItWorksRedesign() {
    const root = useRef<HTMLDivElement>(null);
    const [activeOutcome, setActiveOutcome] = useState(0);
    const outcome = outcomes[activeOutcome];
    const OutcomeIcon = outcome.icon;

    useGSAP(() => {
        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
        intro.from(".how-hero-reveal", { autoAlpha: 0, x: -26, duration: 0.8, stagger: 0.1 }).from(".how-hero-panel", { autoAlpha: 0, y: 30, scale: 0.92, duration: 0.95 }, "-=0.65");
        gsap.to(".how-workspace-glow", { scale: 1.16, opacity: 0.42, duration: 2.5, repeat: -1, yoyo: true, ease: "sine.inOut" });
        gsap.to(".how-source-stack", { y: -7, rotate: -1.5, duration: 2.1, repeat: -1, yoyo: true, ease: "sine.inOut" });
        gsap.fromTo(".how-workspace", { autoAlpha: 0.25, y: 70, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, ease: "none", scrollTrigger: { trigger: ".how-workspace", start: "top 80%", end: "top 40%", scrub: 0.6 } });
        gsap.to(gsap.utils.toArray<HTMLElement>(".how-word"), { color: "rgb(250 250 250)", opacity: 1, stagger: 0.11, ease: "none", scrollTrigger: { trigger: ".how-manifesto", start: "top 77%", end: "bottom 53%", scrub: 0.55 } });
    }, { scope: root });

    const previousOutcome = () => setActiveOutcome((current) => (current - 1 + outcomes.length) % outcomes.length);
    const nextOutcome = () => setActiveOutcome((current) => (current + 1) % outcomes.length);

    return (
        <div ref={root} className="landing-satoshi relative -mt-20 w-full max-w-full overflow-x-hidden bg-[#080811] text-[#F7F5FF]">
            <section className="relative isolate overflow-hidden px-5 pb-28 pt-28 sm:px-8 md:pb-40 md:pt-40">
                <div className="absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:54px_54px]" />
                <div className="absolute left-[65%] top-[-16rem] -z-10 h-[40rem] w-[40rem] rounded-full bg-violet-600/25 blur-[10rem]" />
                <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20">
                    <div className="max-w-5xl">
                        <p className="how-hero-reveal font-mono text-[11px] uppercase tracking-[0.22em] text-violet-200/70">Cara kerja GitHire</p>
                        <h1 className="how-hero-reveal mt-6 max-w-5xl font-heading text-[clamp(3.8rem,7.2vw,8rem)] leading-[0.84] tracking-[-0.07em]">Bukti kerja, siap jadi <span className="bg-gradient-to-r from-violet-200 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent">peluang.</span></h1>
                        <p className="how-hero-reveal mt-8 max-w-xl text-base leading-7 text-white/60 md:text-lg">Satu workspace membaca GitHub dan CV, lalu membantumu menyusun portfolio dan memahami lowongan dari sumber yang sama.</p>
                        <div className="how-hero-reveal mt-9 flex flex-col gap-3 sm:flex-row">
                            <Link href="/auth/sign-up" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F7F5FF] px-6 text-sm font-semibold text-[#100E1B] transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_14px_32px_rgba(167,139,250,0.28)]">Mulai dari profil <ArrowDownRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5" /></Link>
                            <Link href="/dashboard/jobs" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-6 text-sm font-semibold text-white transition-[transform,border-color,background-color] duration-300 hover:-translate-y-1 hover:border-violet-200/75 hover:bg-violet-300/15">Lihat lowongan <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></Link>
                        </div>
                    </div>
                    <div className="how-hero-panel relative mx-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#12111F]/90 p-5 shadow-[0_32px_100px_rgba(0,0,0,0.42)] sm:p-7">
                        <div className="how-workspace-glow pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-violet-400/25 blur-3xl" />
                        <div className="relative flex items-center justify-between border-b border-white/10 pb-4 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45"><span>githire / workspace</span><span className="text-violet-200">active</span></div>
                        <div className="relative mt-7 grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
                            <div className="how-source-stack rounded-2xl border border-white/10 bg-[#0B0A15]/70 p-4"><div className="flex items-center justify-between"><NodeMark /><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">Input</span></div><p className="mt-10 font-heading text-3xl leading-none tracking-[-0.055em]">GitHub<br />CV</p><div className="mt-6 flex gap-1.5"><span className="h-1.5 flex-1 rounded-full bg-violet-300" /><span className="h-1.5 flex-[0.6] rounded-full bg-violet-300/45" /><span className="h-1.5 flex-[0.35] rounded-full bg-white/10" /></div></div>
                            <div className="rounded-2xl border border-violet-200/20 bg-violet-300/10 p-4"><div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.14em] text-violet-100/60">Output</span><span className="h-2 w-2 rounded-full bg-violet-200 shadow-[0_0_14px_rgba(196,181,253,0.9)]" /></div><p className="mt-10 font-heading text-3xl leading-none tracking-[-0.055em]">Portfolio<br />Match</p><p className="mt-6 text-xs leading-5 text-violet-100/60">Konteks yang sama, dua keputusan yang berbeda.</p></div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="border-y border-white/10 bg-[#0E0D19] py-4"><div className="flex w-max animate-marquee items-center gap-8 font-mono text-xs uppercase tracking-[0.15em] text-white/45"><span>GitHub</span><span className="text-violet-300">+</span><span>CV</span><span className="text-violet-300">+</span><span>Portfolio publik</span><span className="text-violet-300">+</span><span>Match score</span><span className="text-violet-300">+</span><span>Skill gap</span><span className="text-violet-300">+</span><span>Roadmap</span></div></div>

            <section className="px-5 py-32 sm:px-8 md:py-48"><div className="mx-auto max-w-7xl"><div className="mb-14 grid gap-7 md:grid-cols-[1fr_auto] md:items-end"><h2 className="max-w-4xl font-heading text-[clamp(3rem,5.5vw,6.2rem)] leading-[0.88] tracking-[-0.065em]">Satu desktop untuk membaca arah kariermu.</h2><p className="max-w-sm text-base leading-7 text-white/55">Bukan form panjang yang berdiri sendiri. Setiap sinyal dirangkai dalam satu alur kerja.</p></div>
                <div className="how-workspace relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#12111F] p-4 shadow-[0_32px_100px_rgba(0,0,0,0.42)] sm:p-6">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4"><div className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-white/20" /><span className="h-2 w-2 rounded-full bg-white/20" /><span className="h-2 w-2 rounded-full bg-violet-300/80" /></div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">career-workspace</p><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet-200/70">ready</p></div>
                    <div className="mt-4 grid grid-flow-dense gap-3 md:grid-cols-12">
                        <article className="group min-h-[18rem] overflow-hidden rounded-2xl border border-white/10 bg-[#0B0A15]/75 p-5 transition-transform duration-500 hover:-translate-y-1 md:col-span-3"><div className="flex items-center justify-between"><GithubIcon className="h-5 w-5 text-violet-200" /><span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">Source</span></div><h3 className="mt-12 font-heading text-4xl leading-[0.88] tracking-[-0.055em]">GitHub</h3><p className="mt-4 text-sm leading-6 text-white/50">Repository, bahasa, dan kontribusi memberi sinyal pertama.</p><div className="mt-8 flex -space-x-3">{["GH", "TS", "PY"].map((item) => <span key={item} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#1A182A] font-mono text-[9px] text-violet-100">{item}</span>)}</div></article>
                        <article className="group min-h-[18rem] overflow-hidden rounded-2xl border border-white/10 bg-[#0B0A15]/75 p-5 transition-transform duration-500 hover:-translate-y-1 md:col-span-2"><FileTextIcon className="h-5 w-5 text-violet-200" /><p className="mt-12 font-heading text-3xl leading-[0.88] tracking-[-0.055em]">CV</p><p className="mt-4 text-sm leading-6 text-white/50">Pengalaman dan pendidikan melengkapi cerita.</p><div className="mt-8 h-px bg-white/10" /><p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">Context</p></article>
                        <article className="group relative min-h-[18rem] overflow-hidden rounded-2xl border border-violet-200/20 bg-violet-300/10 p-5 transition-transform duration-500 hover:-translate-y-1 md:col-span-3"><div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-300/20 blur-3xl transition-transform duration-700 group-hover:scale-150" /><div className="relative flex items-center justify-between"><NodeMark /><span className="font-mono text-[10px] uppercase tracking-[0.15em] text-violet-100/60">Profile</span></div><h3 className="relative mt-12 font-heading text-4xl leading-[0.88] tracking-[-0.055em]">Satu profil.</h3><p className="relative mt-4 text-sm leading-6 text-violet-100/65">Sinyal dari dua sumber disusun sebagai dasar keputusan berikutnya.</p></article>
                        <article className="group min-h-[18rem] overflow-hidden rounded-2xl border border-white/10 bg-[#18152A] p-5 transition-transform duration-500 hover:-translate-y-1 md:col-span-4"><div className="flex items-center justify-between"><SparklesIcon className="h-5 w-5 text-violet-200" /><span className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40">Read</span></div><h3 className="mt-12 font-heading text-4xl leading-[0.88] tracking-[-0.055em]">Portfolio<br />dan match.</h3><div className="mt-7 flex gap-2"><span className="rounded-full border border-violet-200/25 bg-violet-300/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-violet-100">Publish</span><span className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-white/50">Compare</span></div></article>
                    </div>
                    <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]"><div className="rounded-2xl border border-white/10 bg-[#0B0A15]/55 p-5"><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet-100/60">Alur kerja</p><div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-4">{flowSteps.map((step) => <div key={step.id}><p className="font-mono text-[10px] tracking-[0.16em] text-violet-200/65">{step.id}</p><h4 className="mt-2 font-heading text-xl tracking-[-0.045em]">{step.title}</h4><p className="mt-2 text-xs leading-5 text-white/45">{step.copy}</p></div>)}</div></div>
                        <div className="relative overflow-hidden rounded-2xl border border-violet-200/20 bg-[radial-gradient(circle_at_80%_0%,rgba(167,139,250,0.2),transparent_50%),#18152A] p-5"><div className="flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet-100/60">Setelah tersambung</span><span className="font-mono text-[10px] text-white/35">0{activeOutcome + 1}/0{outcomes.length}</span></div><OutcomeIcon className="mt-10 h-6 w-6 text-violet-200" /><h3 className="mt-4 max-w-md font-heading text-3xl leading-[0.9] tracking-[-0.055em]">{outcome.title}</h3><p className="mt-4 max-w-lg text-sm leading-6 text-white/55">{outcome.copy}</p><div className="mt-8 flex items-center justify-between"><div className="flex gap-2">{outcomes.map((item, index) => <button key={item.label} type="button" aria-label={`Tampilkan ${item.label}`} onClick={() => setActiveOutcome(index)} className={`h-1.5 rounded-full transition-all duration-300 ${index === activeOutcome ? "w-12 bg-violet-300" : "w-5 bg-white/15 hover:bg-white/35"}`} />)}</div><div className="flex gap-2"><button type="button" onClick={previousOutcome} aria-label="Hasil sebelumnya" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 transition-colors hover:border-violet-200 hover:bg-violet-300/10"><ChevronLeftIcon className="h-4 w-4" /></button><button type="button" onClick={nextOutcome} aria-label="Hasil berikutnya" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 transition-colors hover:border-violet-200 hover:bg-violet-300/10"><ChevronRightIcon className="h-4 w-4" /></button></div></div></div></div>
                </div></div></section>

            <section className="how-manifesto border-y border-white/10 bg-[#0E0D19] px-5 py-32 sm:px-8 md:py-48"><p className="mx-auto max-w-6xl text-center font-heading text-[clamp(2.7rem,5.5vw,6.3rem)] leading-[0.95] tracking-[-0.06em]">{"GitHire tidak meminta kamu mengulang ceritamu. Kami membantu satu profil yang sama bekerja untuk karya dan peluangmu.".split(" ").map((word, index) => <span key={`${word}-${index}`} className="how-word mr-[0.22em] inline-block text-white/15">{word}</span>)}</p></section>

            <section className="px-5 pb-32 pt-32 sm:px-8 md:pb-48 md:pt-48"><div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-violet-200/20 bg-[radial-gradient(circle_at_70%_0%,rgba(167,139,250,0.24),transparent_46%),#151323] px-6 py-20 text-center sm:px-12 md:py-28"><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-100/70">Mulai dari apa yang sudah kamu punya</p><h2 className="mx-auto mt-6 max-w-5xl font-heading text-[clamp(3.3rem,6vw,6.9rem)] leading-[0.84] tracking-[-0.07em]">Buka portfolio. Baca peluang dengan konteks yang sama.</h2><div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/auth/sign-up" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-[#141321] transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.02]">Buat portfolio</Link><Link href="/dashboard/jobs" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-6 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:bg-violet-300/10">Cari lowongan</Link></div></div></section>
        </div>
    );
}
