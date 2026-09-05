"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowDownRightIcon, ArrowRightIcon, BrainCircuitIcon, ChevronLeftIcon, ChevronRightIcon, CodeIcon, HeartIcon, LinkedinIcon, RocketIcon, TargetIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

gsap.registerPlugin(ScrollTrigger);

const values = [
    { title: "Bukti sebelum asumsi", copy: "Project, kontribusi, dan pengalaman memberi konteks yang lebih kuat daripada daftar keyword saja.", icon: CodeIcon, className: "md:col-span-7", accent: "from-violet-500/35" },
    { title: "AI yang bisa dibaca", copy: "Kecocokan tidak berhenti pada angka. GitHire membantu menunjukkan skill yang sudah dekat dan yang perlu dibangun.", icon: BrainCircuitIcon, className: "md:col-span-5", accent: "from-fuchsia-500/30" },
    { title: "Relevansi di atas volume", copy: "Kami memilih membantu kandidat memahami peluang yang tepat, bukan sekadar mengejar daftar lowongan yang panjang.", icon: TargetIcon, className: "md:col-span-5", accent: "from-indigo-500/35" },
    { title: "Karier yang lebih adil", copy: "Developer Indonesia berhak mendapat ruang untuk menunjukkan pekerjaan nyata dan tumbuh menuju kesempatan berikutnya.", icon: HeartIcon, className: "md:col-span-7", accent: "from-violet-400/30" },
];

const team = [
    { initials: "MR", name: "Muhammad Rozagi", role: "Fullstack Developer · Team Lead", linkedin: "https://www.linkedin.com/in/muhammadrozagi/", tint: "from-violet-500/50 to-indigo-500/15" },
    { initials: "RA", name: "Regina Adelisa", role: "Data Analyst & Research", tint: "from-fuchsia-500/45 to-violet-500/10" },
    { initials: "AZ", name: "Ahmad Zul Zhafran", role: "Frontend Developer", tint: "from-indigo-500/45 to-blue-500/10" },
    { initials: "SA", name: "Salsadilla Azizi Firda", role: "UI/UX Designer", tint: "from-violet-400/40 to-fuchsia-500/10" },
];

const principles = [
    { title: "Portfolio bukan halaman tambahan.", copy: "Ia memberi recruiter konteks sebelum membuka lamaran dan memberi kandidat satu tempat untuk merangkai karya yang ingin ditunjukkan." },
    { title: "Job matching bukan tebakan.", copy: "Profil dari CV dan GitHub menjadi dasar untuk membaca requirement, menjelaskan kecocokan, dan menentukan gap yang perlu dikerjakan." },
    { title: "Satu profil, beberapa keputusan.", copy: "Kandidat dapat mempublikasikan karya, mencari peluang, serta membangun roadmap tanpa harus mengulang data yang sama." },
];

export default function AboutRedesign() {
    const root = useRef<HTMLDivElement>(null);
    const [activePrinciple, setActivePrinciple] = useState(0);
    const principle = principles[activePrinciple];

    useGSAP(() => {
        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
        intro.from(".about-hero-copy", { autoAlpha: 0, x: -32, duration: 0.85, stagger: 0.1 }).from(".about-hero-art", { autoAlpha: 0, y: 28, scale: 0.88, duration: 1 }, "-=0.72");
        gsap.to(".about-evidence-node", { scale: 1.12, transformOrigin: "50% 50%", duration: 1.7, stagger: 0.16, repeat: -1, yoyo: true, ease: "sine.inOut" });
        gsap.to(gsap.utils.toArray<HTMLElement>(".about-word"), { color: "rgb(250 250 250)", opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: ".about-manifesto", start: "top 77%", end: "bottom 53%", scrub: 0.55 } });
        gsap.utils.toArray<HTMLElement>(".about-value-card").forEach((card) => {
            gsap.fromTo(card, { autoAlpha: 0.22, scale: 0.84 }, { autoAlpha: 1, scale: 1, ease: "none", scrollTrigger: { trigger: card, start: "top 82%", end: "top 45%", scrub: 0.55 } });
        });
    }, { scope: root });

    const showPreviousPrinciple = () => setActivePrinciple((current) => (current - 1 + principles.length) % principles.length);
    const showNextPrinciple = () => setActivePrinciple((current) => (current + 1) % principles.length);

    return (
        <div ref={root} className="landing-satoshi relative -mt-20 w-full max-w-full overflow-x-hidden bg-[#080811] text-[#F7F5FF]">
            <section className="relative isolate overflow-hidden px-5 pb-32 pt-28 sm:px-8 md:pb-48 md:pt-40">
                <div className="absolute inset-0 -z-10 opacity-55 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:54px_54px]" />
                <div className="absolute right-[-12rem] top-[-16rem] -z-10 h-[43rem] w-[43rem] rounded-full bg-violet-600/25 blur-[10rem]" />
                <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.06fr_0.94fr] lg:items-end lg:gap-20">
                    <div className="max-w-5xl">
                        <p className="about-hero-copy font-mono text-[11px] uppercase tracking-[0.22em] text-violet-200/70">Tentang GitHire</p>
                        <h1 className="about-hero-copy mt-6 max-w-5xl font-heading text-[clamp(3.9rem,7vw,7.8rem)] leading-[0.84] tracking-[-0.07em]">Proyekmu layak <span className="bg-gradient-to-r from-violet-200 via-fuchsia-300 to-violet-400 bg-clip-text text-transparent">dilihat.</span></h1>
                        <p className="about-hero-copy mt-8 max-w-xl text-base leading-7 text-white/60 md:text-lg">GitHire menyusun GitHub, CV, dan proyek ke dalam portfolio yang jelas, lalu menggunakannya untuk membaca lowongan yang relevan.</p>
                    </div>
                    <div className="about-hero-art relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#141224]/80 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.42)] sm:p-8">
                        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-violet-400/25 blur-3xl" />
                        <div className="relative flex items-center justify-between border-b border-white/10 pb-5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45"><span>Portfolio builder</span><span className="text-violet-200">Public view</span></div>
                        <div className="relative grid gap-6 py-8 sm:grid-cols-[0.78fr_1.22fr] sm:items-center">
                            <div className="relative space-y-3 border-l border-violet-200/20 pl-5 before:absolute before:-left-px before:top-0 before:h-10 before:w-px before:bg-violet-200">
                                <div className="relative flex items-center gap-3"><span className="about-evidence-node h-2.5 w-2.5 rounded-full bg-violet-200 shadow-[0_0_14px_rgba(196,181,253,0.9)]" /><span className="text-sm text-white/70">GitHub</span></div>
                                <div className="relative flex items-center gap-3"><span className="about-evidence-node h-2.5 w-2.5 rounded-full bg-fuchsia-300 shadow-[0_0_14px_rgba(232,121,249,0.7)]" /><span className="text-sm text-white/70">CV</span></div>
                                <div className="relative flex items-center gap-3"><span className="about-evidence-node h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.55)]" /><span className="text-sm text-white/70">Proyek</span></div>
                            </div>
                            <div className="relative overflow-hidden rounded-2xl border border-violet-200/25 bg-violet-300/10 p-5"><div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-300/20 blur-2xl" /><p className="relative font-mono text-[10px] uppercase tracking-[0.16em] text-violet-100/65">Output</p><p className="relative mt-7 font-heading text-[clamp(2.25rem,3.4vw,3.7rem)] leading-[0.88] tracking-[-0.06em]">Dari proyek ke portfolio.</p><p className="relative mt-4 text-sm leading-6 text-violet-100/65">Satu halaman untuk menunjukkan proyek, pengalaman, dan skill yang ingin kamu tampilkan.</p></div>
                        </div>
                        <p className="relative border-t border-white/10 pt-5 text-sm leading-6 text-white/50">Bagikan portfolio saat siap, lalu gunakan profil yang sama untuk menemukan posisi yang cocok.</p>
                    </div>
                </div>
            </section>

            <section className="about-manifesto border-y border-white/10 bg-[#0E0D19] px-5 py-32 sm:px-8 md:py-48"><p className="mx-auto max-w-6xl text-center font-heading text-[clamp(2.7rem,5.5vw,6.3rem)] leading-[0.95] tracking-[-0.06em]">{"Kami percaya developer perlu ruang untuk menjelaskan apa yang mereka buat, bukan hanya tempat untuk mengisi keyword.".split(" ").map((word, index) => <span key={`${word}-${index}`} className="about-word mr-[0.22em] inline-block text-white/15">{word}</span>)}</p></section>

            <section className="px-5 py-32 sm:px-8 md:py-48"><div className="mx-auto max-w-7xl"><div className="mb-14 grid gap-7 md:grid-cols-[1fr_auto] md:items-end"><h2 className="max-w-3xl font-heading text-[clamp(3rem,5.4vw,6.1rem)] leading-[0.88] tracking-[-0.065em]">Prinsip yang membentuk GitHire.</h2><p className="max-w-sm text-base leading-7 text-white/55">Kami mendesain produk ini untuk membuat keputusan karier terasa lebih jelas dan dapat dijelaskan.</p></div><div className="grid grid-flow-dense gap-3 md:grid-cols-12">{values.map((value) => { const Icon = value.icon; return <article key={value.title} className={`about-value-card group relative min-h-[18rem] overflow-hidden rounded-2xl border border-white/10 bg-[#151421] p-6 transition-[transform,border-color,background-color] duration-500 hover:-translate-y-1 hover:border-violet-200/35 hover:bg-[#1A182A] md:min-h-[22rem] md:p-8 ${value.className}`}><div className={`absolute inset-0 bg-gradient-to-br ${value.accent} via-transparent to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100`} /><div className="relative flex h-full flex-col"><div className="flex items-center justify-between"><Icon className="h-6 w-6 text-violet-200 transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110" /><span className="h-2 w-2 rounded-full bg-violet-300/70" /></div><h3 className="mt-auto max-w-xl font-heading text-[clamp(2.3rem,3.8vw,4.5rem)] leading-[0.88] tracking-[-0.06em]">{value.title}</h3><p className="mt-5 max-w-lg text-sm leading-6 text-white/55">{value.copy}</p></div></article>; })}</div></div></section>

            <section className="border-y border-white/10 bg-[#0E0D19] px-5 py-32 sm:px-8 md:py-48"><div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[0.76fr_1.24fr] lg:gap-24"><div><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-200/70">Perspektif produk</p><h2 className="mt-5 max-w-xl font-heading text-[clamp(3rem,5vw,5.8rem)] leading-[0.88] tracking-[-0.065em]">Produk yang tidak memisahkan karya dari peluang.</h2><div className="mt-9 flex gap-3"><button type="button" onClick={showPreviousPrinciple} aria-label="Prinsip sebelumnya" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:bg-violet-300/10"><ChevronLeftIcon className="h-4 w-4" /></button><button type="button" onClick={showNextPrinciple} aria-label="Prinsip berikutnya" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:bg-violet-300/10"><ChevronRightIcon className="h-4 w-4" /></button></div></div><div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#151421] p-7 shadow-[0_30px_90px_rgba(0,0,0,0.3)] sm:p-10"><span className="font-mono text-[11px] tracking-[0.18em] text-violet-200/70">0{activePrinciple + 1} / 0{principles.length}</span><h3 className="mt-16 max-w-2xl font-heading text-[clamp(2.8rem,4.6vw,5.2rem)] leading-[0.88] tracking-[-0.065em]">{principle.title}</h3><p className="mt-6 max-w-xl text-base leading-7 text-white/58">{principle.copy}</p><div className="mt-14 flex gap-2">{principles.map((item, index) => <button key={item.title} type="button" aria-label={`Tampilkan prinsip ${index + 1}`} onClick={() => setActivePrinciple(index)} className={`h-1.5 rounded-full transition-all duration-300 ${index === activePrinciple ? "w-14 bg-violet-300" : "w-5 bg-white/15 hover:bg-white/35"}`} />)}</div></div></div></section>

            <section className="px-5 py-32 sm:px-8 md:py-48"><div className="mx-auto max-w-7xl"><div className="mb-14 max-w-3xl"><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-200/70">Tim GitHire</p><h2 className="mt-5 font-heading text-[clamp(3rem,5.4vw,6.1rem)] leading-[0.88] tracking-[-0.065em]">Empat sudut pandang, satu produk.</h2></div><div className="flex flex-col gap-3 md:h-[30rem] md:flex-row">{team.map((member) => <article key={member.name} className={`group relative min-h-[13rem] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${member.tint} p-6 transition-[flex,transform,border-color] duration-700 ease-out hover:border-violet-200/40 md:min-h-0 md:flex-[0.9] md:hover:flex-[2.35]`}><div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl transition-transform duration-700 group-hover:scale-150" /><div className="relative flex h-full flex-col justify-between"><span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-[#0B0A15]/45 font-heading text-lg tracking-[-0.05em] text-violet-100 transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">{member.initials}</span><div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-violet-100/60">{member.role}</p><h3 className="mt-3 font-heading text-3xl leading-[0.9] tracking-[-0.055em] md:text-4xl">{member.name}</h3>{member.linkedin && <Link href={member.linkedin} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm text-violet-100/0 transition-colors duration-300 md:group-hover:text-violet-100">LinkedIn <LinkedinIcon className="h-4 w-4" /></Link>}</div></div></article>)}</div></div></section>

            <section className="px-5 pb-32 sm:px-8 md:pb-48"><div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-violet-200/20 bg-[radial-gradient(circle_at_70%_0%,rgba(167,139,250,0.24),transparent_46%),#151323] px-6 py-20 text-center sm:px-12 md:py-28"><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-100/70">Mulai dari bukti yang kamu punya</p><h2 className="mx-auto mt-6 max-w-5xl font-heading text-[clamp(3.3rem,6vw,6.9rem)] leading-[0.84] tracking-[-0.07em]">Susun karya. Temukan arah kariermu.</h2><div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/auth/sign-up" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#141321] transition-transform duration-300 hover:-translate-y-1 hover:scale-[1.02]">Mulai sekarang <ArrowDownRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5" /></Link><Link href="/dashboard/jobs" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/25 px-6 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:bg-violet-300/10">Cari lowongan <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></Link></div></div></section>
        </div>
    );
}
