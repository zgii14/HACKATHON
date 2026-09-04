import { AnimationContainer, MaxWidthWrapper, SmoothScrollLink } from "@/components";
import { BarFill, CountUp, Spotlight } from "@/components/dashboard/ui";
import { LandingOrb } from "@/components/landing/landing-scroll-effects";
import dynamic from "next/dynamic";

const LogoNetwork = dynamic(() => import("@/components/landing/logo-network").then((m) => m.LogoNetwork), {
    ssr: false,
    loading: () => (
        <svg viewBox="0 0 600 420" className="h-auto w-full" fill="none" aria-hidden="true">
            <ellipse cx="300" cy="210" rx="210" ry="160" fill="url(#logo-glow)" opacity="0.9" />
            <defs>
                <radialGradient id="logo-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.25" />
                    <stop offset="60%" stopColor="#a78bfa" stopOpacity="0.06" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                </radialGradient>
            </defs>
        </svg>
    ),
});
import { currentUser } from "@clerk/nextjs/server";
import {
    ArrowRightIcon,
    BrainCircuitIcon,
    CheckCircle2Icon,
    FileTextIcon,
    GithubIcon,
    SearchIcon,
    SparklesIcon,
    StarIcon,
    TrendingUpIcon,
    ZapIcon,
} from "lucide-react";
import Link from "next/link";

/* ── Palette: dark editorial, token gelap GitHire (violet tetap accent) ── */
const CANVAS = "bg-[hsl(224_71.4%_4.1%)]";
const FG = "text-[hsl(210_20%_98%)]";
const MUTED = "text-[hsl(217.9_10.6%_64.9%)]";
const BORDER = "border-[hsl(215_27.9%_16.9%)]";
const SURFACE = "bg-[hsl(215_27.9%_16.9%)]/30";

const MARQUEE_ITEMS = [
    "GitHub signal",
    "CV ATS",
    "Match score jujur",
    "Skill gap",
    "Roadmap AI",
    "Kuis evaluasi",
    "Portal recruiter",
    "Undangan interview",
    "Cover letter AI",
];

const PILLARS = [
    {
        icon: GithubIcon,
        no: "01",
        title: "Profil kandidat dari kode nyata",
        description: "Analisis otomatis repository, bahasa, dan topics GitHub-mu — digabung dengan CV lewat AI. Bukan klaim, tapi bukti.",
        points: ["Sync GitHub", "Parse CV PDF", "Merged skill profile"],
        cta: { label: "Mulai dari profil", href: "/dashboard/profile" },
    },
    {
        icon: BrainCircuitIcon,
        no: "02",
        title: "AI yang jujur soal kecocokan",
        description: "Match score transparan berbasis Jaccard, skill gap yang spesifik, dan roadmap belajar per lowongan dengan kuis AI.",
        points: ["Match score", "Skill gap", "Roadmap + kuis"],
        cta: { label: "Lihat rekomendasi", href: "/dashboard/jobs/recommended" },
    },
    {
        icon: SearchIcon,
        no: "03",
        title: "Terhubung ke recruiter yang tepat",
        description: "Lamaranmu langsung sampai ke recruiter yang memang mencari skill sepertimu, tanpa harus menebak-nebak lowongan mana yang cocok.",
        points: ["Rekomendasi lowongan", "Undangan interview", "Cover letter AI"],
        cta: { label: "Lihat lowongan", href: "/dashboard/jobs" },
    },
];

const STATS = [
    { value: "100+", label: "Lowongan IT aktif" },
    { value: "2", label: "Sumber data digabung" },
    { value: "6", label: "Fitur AI terintegrasi" },
    { value: "<60s", label: "Profil siap dinilai" },
];

const STEPS = [
    {
        no: "01",
        title: "Sync",
        description: "Hubungkan GitHub dan unggah CV. AI menyatukan semuanya ke satu profil kandidat.",
        point: "Analisis otomatis",
    },
    {
        no: "02",
        title: "Match",
        description: "Dapatkan skor kecocokan dan lihat celah keahlianmu.",
        point: "Skor kecocokan",
    },
    {
        no: "03",
        title: "Improve",
        description: "Ikuti roadmap belajar personal per lowongan.",
        point: "Roadmap belajar",
    },
    {
        no: "04",
        title: "Apply",
        description: "Unduh CV berstandar ATS, lamar, atau terima undangan interview langsung.",
        point: "End-to-end hiring",
    },
];

const MOCK_MATCHES = [
    { title: "Junior ML Engineer", company: "AI Nusantara", score: 83, salary: "Rp 8-12jt", skills: ["Python", "TensorFlow", "PyTorch"] },
    { title: "Junior Backend Dev", company: "StartupID", score: 67, salary: "Rp 6-10jt", skills: ["Node.js", "PostgreSQL", "Docker"] },
    { title: "Data Analyst", company: "FinTech.id", score: 45, salary: "Rp 5-8jt", skills: ["SQL", "Python", "Tableau"] },
];

/* Orb dipindah ke client component biar bisa animasi framer-motion */


const HomePage = async () => {
    const user = await currentUser();
    const ctaHref = user ? "/dashboard" : "/auth/sign-in";
    const ctaLabel = user ? "Buka Dashboard" : "Mulai Gratis";

    return (
        <div className={`relative size-full overflow-x-hidden scrollbar-hide ${CANVAS} ${FG}`}>

            {/* ── Hero: satu layar, editorial ── */}
            <MaxWidthWrapper>
                <section className="grid gap-6 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8 lg:py-16">
                    <div>
                        <AnimationContainer delay={0.08}>
                            <h1 className="font-heading text-6xl font-medium leading-[0.95] tracking-[-0.03em] sm:text-7xl lg:text-[104px]">
                                From code,{" "}
                                <span className="font-serif italic">
                                    to{" "}
                                    <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                                        career.
                                    </span>
                                </span>
                            </h1>
                        </AnimationContainer>

                        <AnimationContainer delay={0.16}>
                            <p className={`mt-8 max-w-md text-lg leading-relaxed ${MUTED}`}>
                                Satu platform untuk menilai kesiapan Anda, menemukan lowongan yang tepat, dan membangun karir pertama Anda.
                            </p>
                        </AnimationContainer>

                        <AnimationContainer delay={0.24}>
                            <div className="mt-11 flex flex-wrap items-center gap-3">
                                <Link
                                    href={ctaHref}
                                    className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition hover:bg-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                                >
                                    {ctaLabel}
                                    <ArrowRightIcon className="h-4 w-4" />
                                </Link>
                                <SmoothScrollLink
                                    href="#how-it-works"
                                    className={`inline-flex items-center gap-2 rounded-full border ${BORDER} px-6 py-3 text-sm font-semibold transition hover:border-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400`}
                                >
                                    Cara Kerja
                                </SmoothScrollLink>
                            </div>
                            <p className={`mt-8 font-mono text-[12px] uppercase tracking-[0.08em] ${MUTED}`}>
                                GitHub signal · CV ATS · Match score · Roadmap AI
                            </p>
                        </AnimationContainer>
                    </div>

                    <AnimationContainer delay={0.2}>
                        <div className="relative">
                            <div className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/25 blur-[8rem]" aria-hidden="true" />
                            <LandingOrb>
                                <div className="relative">
                                    <LogoNetwork />
                                </div>
                            </LandingOrb>
                            <div className={`mt-6 flex items-center justify-between border-t ${BORDER} pt-5 font-mono text-[11px] uppercase tracking-[0.07em] ${MUTED}`}>
                                <span>code</span>
                                <span className="text-violet-400">→ match</span>
                                <span>→ career</span>
                            </div>
                        </div>
                    </AnimationContainer>
                </section>
            </MaxWidthWrapper>

            {/* ── Marquee ── */}
            <div className={`overflow-hidden border-y ${BORDER} py-3`}>
                <div className="flex w-max animate-marquee items-center gap-8 [--duration:30s] [--gap:2rem]">
                    {[0, 1].map((copy) => (
                        <div key={copy} className="flex items-center gap-8" aria-hidden={copy === 1}>
                            {MARQUEE_ITEMS.map((item, i) => (
                                <span key={item} className={`flex items-center gap-8 font-mono text-lg uppercase tracking-[0.12em] ${i % 2 === 0 ? "text-[hsl(210_20%_98%)]" : MUTED}`}>
                                    {item}
                                    <span className="text-violet-400">✦</span>
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Stats band ── */}
            <MaxWidthWrapper>
                <div className={`grid grid-cols-2 gap-y-12 border-b ${BORDER} py-20 md:grid-cols-4 md:py-28`}>
                    {STATS.map((s, i) => {
                        const dir = (i === 0 ? "left" : i === 3 ? "right" : "up") as "left" | "right" | "up";
                        return (
                            <AnimationContainer key={s.label} delay={0.1 * (i + 1)} direction={dir}>
                                <div className="flex flex-col items-start gap-2 md:items-center md:text-center">
                                    <p className="font-heading text-5xl font-medium tracking-[-0.03em] md:text-6xl">{s.value}</p>
                                    <p className={`font-mono text-[11px] uppercase tracking-[0.08em] ${MUTED}`}>{s.label}</p>
                                </div>
                            </AnimationContainer>
                        );
                    })}
                </div>
            </MaxWidthWrapper>

            {/* ── (01) Tiga pilar ── */}
            <MaxWidthWrapper>
                <section id="features" className="grid gap-12 py-16 md:grid-cols-[240px_1fr] md:gap-24 md:py-24">
                    <div>
                        <AnimationContainer>
                            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-violet-400">(01) Yang kami bangun</p>
                        </AnimationContainer>
                        <AnimationContainer delay={0.1}>
                            <h2 className="font-heading mt-5 text-3xl font-medium leading-tight tracking-[-0.02em] md:text-4xl">
                                Satu platform, dua sisi pasar.
                            </h2>
                        </AnimationContainer>
                    </div>
                    <div className={`border-t ${BORDER}`}>
                        {PILLARS.map((p, i) => (
                            <AnimationContainer key={p.no} delay={0.1 * (i + 1)} direction={i % 2 === 0 ? "left" : "right"}>
                                <Spotlight>
                                    <div className={`group grid gap-5 border-b ${BORDER} py-10 md:grid-cols-[64px_1fr_auto] md:gap-10 md:py-12`}>
                                    <span className={`font-mono text-sm ${MUTED}`}>{p.no}</span>
                                    <div>
                                        <div className="flex items-start gap-3">
                                            <p.icon className="mt-1 h-5 w-5 shrink-0 text-violet-400" strokeWidth={1.5} />
                                            <h3 className="font-heading text-2xl font-medium tracking-[-0.02em] md:text-3xl">{p.title}</h3>
                                        </div>
                                        <p className={`mt-4 max-w-xl text-[15px] leading-relaxed ${MUTED}`}>{p.description}</p>
                                        <div className="mt-5 flex flex-wrap gap-2">
                                            {p.points.map((pt) => (
                                                <span key={pt} className={`rounded-full border ${BORDER} ${SURFACE} px-3 py-1 font-mono text-[11px] uppercase tracking-[0.06em] ${MUTED}`}>
                                                    {pt}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-start md:justify-end">
                                        <Link
                                            href={p.cta.href}
                                            className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-400 transition-opacity group-hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                                        >
                                            {p.cta.label}
                                            <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                                        </Link>
                                    </div>
                                </div>
                                </Spotlight>
                            </AnimationContainer>
                        ))}
                    </div>
                </section>
            </MaxWidthWrapper>

            {/* ── (02) Showcase: match score ── */}
            <MaxWidthWrapper>
                <section className="grid items-center gap-16 py-16 md:grid-cols-2 md:gap-24 md:py-24">
                    <div>
                        <AnimationContainer>
                            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-violet-400">(02) Hasilnya</p>
                        </AnimationContainer>
                        <AnimationContainer delay={0.08}>
                            <h2 className="font-heading mt-5 text-4xl font-medium leading-tight tracking-[-0.02em] md:text-6xl">
                                Match score yang{" "}
                                <span className="font-serif italic">
                                    jujur,
                                </span>{" "}
                                bukan perkiraan.
                            </h2>
                        </AnimationContainer>
                        <AnimationContainer delay={0.16}>
                            <p className={`mt-6 max-w-md text-[15px] leading-relaxed ${MUTED}`}>
                                Setiap skor dijelaskan lewat skill mana yang sudah kamu penuhi dan mana yang masih kurang, jadi kamu tahu persis alasan di baliknya, lengkap dengan skill yang perlu dipelajari selanjutnya.
                            </p>
                        </AnimationContainer>
                        <AnimationContainer delay={0.24}>
                            <div className="mt-8 flex flex-col gap-3">
                                {["Transparan", "Berdasarkan data nyata", "Lanjut ke roadmap"].map((t) => (
                                    <span key={t} className={`flex items-center gap-3 font-mono text-[13px] ${FG}`}>
                                        <CheckCircle2Icon className="h-4 w-4 text-violet-400" />
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </AnimationContainer>
                    </div>

                    <div className={`border ${BORDER} ${SURFACE}`}>
                        {MOCK_MATCHES.map((job, i) => (
                            <AnimationContainer key={job.title} delay={0.1 * (i + 1)} direction={i % 2 === 0 ? "left" : "right"}>
                                <Spotlight>
                                    <div className={`px-6 py-6 md:px-8 ${i === MOCK_MATCHES.length - 1 ? "" : `border-b ${BORDER}`}`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="truncate text-[15px] font-semibold">{job.title}</p>
                                                <p className={`mt-0.5 text-[13px] ${MUTED}`}>{job.company}</p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="font-mono text-2xl font-bold tracking-tight text-violet-400">
                                                    <CountUp value={job.score} />%
                                                </p>
                                                <p className={`font-mono text-[10px] uppercase tracking-[0.08em] ${MUTED}`}>match</p>
                                            </div>
                                        </div>
                                        <div className="mt-3">
                                            <BarFill pct={job.score} tone={job.score > 70 ? "success" : job.score > 50 ? "warning" : "primary"} />
                                        </div>
                                    <div className="mt-4 flex flex-wrap items-center gap-3">
                                        <span className={`font-mono text-[12px] ${MUTED}`}>{job.salary}</span>
                                        <span className={`font-mono text-[12px] ${MUTED}`}>Remote</span>
                                        <span className="ml-auto flex gap-1.5">
                                            {job.skills.map((s) => (
                                                <span key={s} className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-0.5 text-[11px] text-violet-300">
                                                    {s}
                                                </span>
                                            ))}
                                        </span>
                                    </div>
                                </div>
                                </Spotlight>
                            </AnimationContainer>
                        ))}
                        <AnimationContainer delay={0.1 * (MOCK_MATCHES.length + 1)}>
                            <div className="flex items-center gap-4 border-l-2 border-violet-400 px-6 py-6 md:px-8">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-400/10">
                                    <TrendingUpIcon className="h-4 w-4 text-violet-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[14px] font-semibold">Skill gap terdeteksi</p>
                                    <p className={`mt-0.5 text-[13px] ${MUTED}`}>Pelajari Docker & Kubernetes — jalan pintas menaikkan skor 20% → 65%</p>
                                </div>
                                <ArrowRightIcon className="h-4 w-4 shrink-0 text-violet-400" />
                            </div>
                        </AnimationContainer>
                    </div>
                </section>
            </MaxWidthWrapper>

            {/* ── (03) Cara kerja ── */}
            <MaxWidthWrapper>
                <section id="how-it-works" className="grid gap-12 py-16 md:grid-cols-[240px_1fr] md:gap-24 md:py-24">
                    <div>
                        <AnimationContainer>
                            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-violet-400">(03) Cara kerja</p>
                        </AnimationContainer>
                        <AnimationContainer delay={0.1}>
                            <h2 className="font-heading mt-5 text-3xl font-medium leading-tight tracking-[-0.02em] md:text-4xl">
                                Dari profil ke lamaran, kurang dari lima menit.
                            </h2>
                        </AnimationContainer>
                        <AnimationContainer delay={0.2}>
                            <Link
                                href={ctaHref}
                                className={`mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400`}
                            >
                                {ctaLabel}
                                <ArrowRightIcon className="h-4 w-4" />
                            </Link>
                        </AnimationContainer>
                    </div>
                    <div className={`border-t ${BORDER}`}>
                        {STEPS.map((s, i) => (
                            <AnimationContainer key={s.no} delay={0.1 * (i + 1)} direction={i % 2 === 0 ? "right" : "left"}>
                                <div className={`grid gap-3 border-b ${BORDER} py-8 md:grid-cols-[64px_160px_1fr_auto] md:gap-10`}>
                                    <span className={`font-mono text-sm ${MUTED}`}>{s.no}</span>
                                    <h3 className="font-heading text-2xl font-medium tracking-[-0.02em]">{s.title}</h3>
                                    <p className={`max-w-md text-[15px] leading-relaxed ${MUTED}`}>{s.description}</p>
                                    <span className={`hidden font-mono text-[11px] uppercase tracking-[0.08em] text-violet-400 md:block`}>{s.point}</span>
                                </div>
                            </AnimationContainer>
                        ))}
                    </div>
                </section>
            </MaxWidthWrapper>

            {/* ── (04) Testimoni: satu kutipan besar ── */}
            <MaxWidthWrapper>
                <section className="border-t py-20 md:py-32">
                    <div className="mx-auto max-w-3xl text-center">
                        <AnimationContainer>
                            <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-violet-400">(04) Bukti pengguna</p>
                        </AnimationContainer>
                        <AnimationContainer delay={0.1} direction="scale">
                            <blockquote className="font-heading mt-8 text-2xl font-medium leading-snug tracking-[-0.01em] md:text-4xl">
                                &quot;Akhirnya ada platform yang bisa bantu aku tahu kenapa lamaran sering ditolak.{" "}
                                <span className="font-serif italic">Ternyata skill gap-ku di Docker dan Kubernetes.</span>{" "}
                                Roadmap AI-nya sangat membantu!&quot;
                            </blockquote>
                        </AnimationContainer>
                        <AnimationContainer delay={0.2}>
                            <div className="mt-10 flex flex-col items-center gap-3">
                                <div className="flex gap-1">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <AnimationContainer key={i} delay={0.2 + i * 0.05} direction="scale">
                                            <StarIcon className="h-4 w-4 fill-violet-400 text-violet-400" />
                                        </AnimationContainer>
                                    ))}
                                </div>
                                <p className="text-sm font-semibold">Rizky Pratama</p>
                                <p className={`font-mono text-[11px] uppercase tracking-[0.08em] ${MUTED}`}>Fresh Graduate, Universitas Indonesia</p>
                            </div>
                        </AnimationContainer>
                    </div>
                </section>
            </MaxWidthWrapper>

            {/* ── CTA akhir: closing statement ── */}
            <MaxWidthWrapper>
                <section className="border-t py-20 text-center md:py-32">
                    <AnimationContainer>
                        <h2 className="font-heading mx-auto max-w-3xl text-5xl font-medium leading-[0.95] tracking-[-0.03em] md:text-7xl">
                            Dari kode,{" "}
                            <span className="font-serif italic">
                                jadi{" "}
                                <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                                    karier.
                                </span>
                            </span>
                        </h2>
                    </AnimationContainer>
                    <AnimationContainer delay={0.1}>
                        <p className={`mx-auto mt-7 max-w-md text-lg leading-relaxed ${MUTED}`}>
                            Mulai dengan menghubungkan GitHub dan CV-mu. Dalam hitungan menit, kamu tahu posisi apa yang paling cocok — dan apa yang harus dipelajari.
                        </p>
                    </AnimationContainer>
                    <AnimationContainer delay={0.2}>
                        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                            <Link
                                href={ctaHref}
                                className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition-all hover:bg-violet-500 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                            >
                                {ctaLabel}
                                <ArrowRightIcon className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/dashboard/jobs"
                                className={`inline-flex items-center gap-2 rounded-full border ${BORDER} px-7 py-3.5 text-sm font-semibold transition-all hover:border-white/30 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400`}
                            >
                                Lihat 100+ Lowongan
                            </Link>
                        </div>
                    </AnimationContainer>
                    <div className={`mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-mono text-[11px] uppercase tracking-[0.08em] ${MUTED}`}>
                        <AnimationContainer delay={0.3}>
                            <span className="flex items-center gap-1.5"><SparklesIcon className="h-3 w-3 text-violet-400" /> AI Gemini</span>
                        </AnimationContainer>
                        <AnimationContainer delay={0.35}>
                            <span className="flex items-center gap-1.5"><GithubIcon className="h-3 w-3 text-violet-400" /> GitHub integration</span>
                        </AnimationContainer>
                        <AnimationContainer delay={0.4}>
                            <span className="flex items-center gap-1.5"><FileTextIcon className="h-3 w-3 text-violet-400" /> CV ATS</span>
                        </AnimationContainer>
                    </div>
                    {/* Hidden recruiter link — footer */}
                    <div className="mt-16 flex flex-col items-center gap-2 border-t border-white/[0.06] pt-6">
                        <p className="font-mono text-[11px] text-white/25">© 2026 GitHire · From Code to Career</p>
                        <Link href="/recruiter/apply" className="font-mono text-[11px] text-white/30 hover:text-white/60 transition-colors underline-offset-4 hover:underline">
                            Daftar sebagai Recruiter →
                        </Link>
                    </div>
                </section>
            </MaxWidthWrapper>

        </div>
    );
};

export default HomePage;
