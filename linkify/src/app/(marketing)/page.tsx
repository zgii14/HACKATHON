import { AnimationContainer, MaxWidthWrapper } from "@/components";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { LampContainer } from "@/components/ui/lamp";
import MagicBadge from "@/components/ui/magic-badge";
import MagicCard from "@/components/ui/magic-card";
import { currentUser } from "@clerk/nextjs/server";
import {
    ArrowRightIcon,
    BookOpenIcon,
    BrainCircuitIcon,
    BriefcaseIcon,
    CheckCircle2Icon,
    CodeIcon,
    FileTextIcon,
    GithubIcon,
    MapPinIcon,
    SearchIcon,
    SparklesIcon,
    StarIcon,
    TargetIcon,
    TrendingUpIcon,
    WalletIcon,
    ZapIcon,
} from "lucide-react";
import Link from "next/link";

const FEATURES = [
    {
        icon: GithubIcon,
        title: "Sync GitHub Profil",
        description: "Analisis bahasa, repository, dan topics GitHub-mu secara otomatis. Skill nyata dari kode, bukan dari CV yang dilebih-lebihkan.",
        color: "text-violet-400",
        bg: "bg-violet-500/10",
        badge: "Smart Detection",
    },
    {
        icon: FileTextIcon,
        title: "Upload CV PDF",
        description: "AI kami mengekstraksi skill dari CV-mu dan menggabungkannya dengan data GitHub dalam satu profil terpadu dan akurat.",
        color: "text-blue-400",
        bg: "bg-blue-500/10",
        badge: "AI Powered",
    },
    {
        icon: BookOpenIcon,
        title: "ATS Resume Builder",
        description: "Bangun CV profesional berbasis standar ATS dan unduh secara instan dalam format Word (.docx) untuk melamar kerja.",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        badge: "ATS CV Generator",
    },
    {
        icon: BrainCircuitIcon,
        title: "Roadmap & Kuis AI",
        description: "Dapatkan roadmap belajar personal per lowongan, lengkap dengan kuis interaktif 3 soal bertenaga Gemini AI untuk menguji keahlianmu.",
        color: "text-fuchsia-400",
        bg: "bg-fuchsia-500/10",
        badge: "Interactive Learning",
    },
    {
        icon: SearchIcon,
        title: "Portal & Database Recruiter",
        description: "Halaman khusus recruiter untuk mencari kandidat terbaik, memfilter keahlian, melihat skor kecocokan, dan melacak pelamar.",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        badge: "Recruiter Workspace",
    },
    {
        icon: ZapIcon,
        title: "Undangan Interview Instan",
        description: "Kirim undangan wawancara langsung ke kandidat pilihan lewat template otomatis WhatsApp dan Email beserta detail jadwal.",
        color: "text-rose-400",
        bg: "bg-rose-500/10",
        badge: "Direct Hiring",
    },
    {
        icon: TrendingUpIcon,
        title: "Match Score Transparan",
        description: "Skor kecocokan jujur berdasarkan Jaccard similarity antara keahlian kandidat dengan kebutuhan spesifik lowongan pekerjaan.",
        color: "text-green-400",
        bg: "bg-green-500/10",
        badge: "Jaccard Index",
    },
    {
        icon: BriefcaseIcon,
        title: "100+ Lowongan IT Terkini",
        description: "Pilihan lowongan fresh graduate dan magang IT terlengkap dengan info gaji transparan, kualifikasi, dan lokasi kerja.",
        color: "text-indigo-400",
        bg: "bg-indigo-500/10",
        badge: "Real-time Jobs",
    },
];

const STEPS = [
    {
        icon: GithubIcon,
        step: "01",
        title: "Hubungkan Profil & CV",
        description: "Sync GitHub dan unggah CV PDF. AI menyatukan keahlian Anda ke dalam profil kandidat yang tervalidasi atau login sebagai Recruiter.",
        detail: "Proses cepat < 60 detik",
    },
    {
        icon: SparklesIcon,
        step: "02",
        title: "Evaluasi & Pelajari",
        description: "Lihat kecocokan skor dengan lowongan kerja, cari celah keahlian (skill gap), isi kuis evaluasi AI, dan ikuti roadmap belajar personal.",
        detail: "Kuis & Roadmap AI Terpadu",
    },
    {
        icon: BookOpenIcon,
        step: "03",
        title: "Unduh CV ATS & Wawancara",
        description: "Unduh Word CV berstandar ATS, lamar lowongan, atau terima undangan interview langsung dari recruiter pilihan.",
        detail: "End-to-end Hiring",
    },
];

const TESTIMONIALS = [
    {
        name: "Rizky Pratama",
        role: "Fresh Graduate, Universitas Indonesia",
        review: "Akhirnya ada platform yang bisa bantu aku tahu kenapa lamaran sering ditolak. Ternyata skill gap-ku di Docker dan Kubernetes. Roadmap AI-nya sangat membantu!",
        rating: 5,
        avatar: "R",
        color: "bg-violet-500",
    },
    {
        name: "Siti Nurhaliza",
        role: "Mahasiswa Tingkat Akhir, ITS",
        review: "Match score 83% untuk posisi Machine Learning Engineer. Aku jadi tahu persis harus belajar apa lagi sebelum apply. Fitur roadmap per-job ini keren banget.",
        rating: 5,
        avatar: "S",
        color: "bg-blue-500",
    },
    {
        name: "Budi Santoso",
        role: "Junior Developer, Bandung",
        review: "GitHub saya ternyata sudah cukup bagus, tapi CV saya tidak mencerminkan skill yang ada. Setelah sync keduanya, match score naik dari 20% jadi 65%!",
        rating: 5,
        avatar: "B",
        color: "bg-emerald-500",
    },
    {
        name: "Dewi Anggraini",
        role: "Bootcamp Graduate",
        review: "Cover letter AI-nya luar biasa! Dalam 30 detik langsung dapat surat lamaran yang formal dan disesuaikan dengan posisi yang diincar. Hemat waktu banget.",
        rating: 5,
        avatar: "D",
        color: "bg-pink-500",
    },
    {
        name: "Aldi Firmansyah",
        role: "CS Student, Universitas Brawijaya",
        review: "Roadmap belajarnya dalam Bahasa Indonesia dan actionable banget. Ada nama resource-nya juga. Ini yang selama ini aku cari!",
        rating: 5,
        avatar: "A",
        color: "bg-orange-500",
    },
    {
        name: "Nadia Putri",
        role: "Data Science Enthusiast",
        review: "Platform ini jujur soal skill gap. Tidak ada gimmick. Langsung bilang 'kamu kurang TensorFlow dan Pandas', dan langsung kasih roadmapnya.",
        rating: 5,
        avatar: "N",
        color: "bg-cyan-500",
    },
];

const STATS = [
    { value: "100+", label: "Lowongan IT Aktif", icon: BriefcaseIcon },
    { value: "6", label: "Fitur AI Terintegrasi", icon: SparklesIcon },
    { value: "AI", label: "Ditenagai Kecerdasan Buatan", icon: BrainCircuitIcon },
    { value: "Mulai", label: "Gratis", icon: ZapIcon },
];

const COMPARISON = [
    { feature: "Job listing & Filter", glints: true, githire: true },
    { feature: "Info gaji transparan", glints: true, githire: true },
    { feature: "Match score personal", glints: false, githire: true },
    { feature: "Analisis skill gap industri", glints: false, githire: true },
    { feature: "Roadmap belajar AI per lowongan", glints: false, githire: true },
    { feature: "Kuis evaluasi belajar AI", glints: false, githire: true },
    { feature: "GitHub skill extraction otomatis", glints: false, githire: true },
    { feature: "ATS Resume Builder (.docx)", glints: false, githire: true },
    { feature: "Portal & Database Recruiter", glints: false, githire: true },
    { feature: "Penjadwalan & Tiket Interview", glints: false, githire: true },
];

const HomePage = async () => {
    const user = await currentUser();

    return (
        <div className="overflow-x-hidden scrollbar-hide size-full">

            {/* ── Hero ── */}
            <MaxWidthWrapper>
                <div className="flex flex-col items-center justify-center w-full text-center bg-gradient-to-t from-background">
                    <AnimationContainer className="flex flex-col items-center justify-center w-full text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-sm mb-6">
                            <ZapIcon className="w-3.5 h-3.5" />
                            <span>Platform karir berbasis AI untuk fresh graduate IT Indonesia</span>
                        </div>

                        <h1 className="text-foreground text-center py-6 text-5xl font-medium tracking-normal text-balance sm:text-6xl md:text-7xl lg:text-8xl !leading-[1.15] w-full font-heading">
                            GitHire —{" "}
                            <br className="hidden sm:block" />
                            From code to{" "}
                            <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text">
                                career.
                            </span>
                        </h1>

                        <p className="mb-8 text-lg tracking-tight text-muted-foreground md:text-xl text-balance max-w-xl">
                            Satu platform untuk menilai kesiapan Anda, menemukan lowongan yang tepat, dan membangun karir pertama Anda.
                        </p>

                        <div className="flex items-center gap-3 flex-wrap justify-center">
                            <Button asChild size="lg" className="gap-2 shadow-lg shadow-violet-500/25">
                                <Link href={user ? "/dashboard" : "/auth/sign-in"}>
                                    {user ? "Buka Dashboard" : "Mulai Gratis"}
                                    <ArrowRightIcon className="w-4 h-4" />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <Link href="#how-it-works">Cara Kerja</Link>
                            </Button>
                        </div>



                        {/* Stats row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 md:gap-x-8 gap-y-5 mt-12 w-full max-w-xs md:max-w-xl mx-auto">
                            {STATS.map((s) => (
                                <div key={s.label} className="flex flex-col items-center text-center">
                                    <p className="text-2xl font-bold text-foreground">{s.value}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                                </div>
                            ))}
                        </div>
                    </AnimationContainer>

                    {/* Hero visual — mock dashboard */}
                    <AnimationContainer delay={0.2} className="relative pt-16 pb-12 px-2 w-full">
                        <div className="absolute md:top-[10%] left-1/2 -translate-x-1/2 w-3/4 h-1/3 inset-0 blur-[5rem] animate-image-glow bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 rounded-full" />
                        <div className="-m-2 rounded-2xl p-2 ring-1 ring-inset ring-foreground/20 max-w-4xl mx-auto bg-opacity-50 backdrop-blur-3xl">
                            <BorderBeam size={250} duration={12} delay={9} />
                            <div className="rounded-xl bg-black/60 border border-white/10 p-5 min-h-[360px] flex flex-col gap-4">
                                {/* Mock header */}
                                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-xs text-muted-foreground">GitHire Dashboard</div>
                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-[10px]">
                                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                                            Live
                                        </div>
                                    </div>
                                </div>

                                {/* Stat cards */}
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { label: "Skills Detected", value: "27", color: "text-violet-400", sub: "from GitHub + CV" },
                                        { label: "Skill Gap", value: "11", color: "text-amber-400", sub: "need to learn" },
                                        { label: "Best Match", value: "83%", color: "text-green-400", sub: "ML Engineer" },
                                        { label: "Roadmap", value: "3/8", color: "text-blue-400", sub: "steps done" },
                                    ].map((stat) => (
                                        <div key={stat.label} className="bg-white/5 rounded-lg p-2.5 text-center border border-white/5">
                                            <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                                            <div className="text-[9px] text-muted-foreground">{stat.label}</div>
                                            <div className={`text-[9px] mt-0.5 ${stat.color} opacity-70`}>{stat.sub}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Job matches */}
                                <div className="grid grid-cols-3 gap-2 mt-1">
                                    {[
                                        { title: "Junior ML Engineer", company: "AI Nusantara", score: 83, salary: "Rp 8-12jt", color: "bg-green-500", tag: "✓ Cocok" },
                                        { title: "Junior Backend Dev", company: "StartupID", score: 67, salary: "Rp 6-10jt", color: "bg-amber-500", tag: "~ Cukup Cocok" },
                                        { title: "Data Analyst", company: "FinTech.id", score: 45, salary: "Rp 5-8jt", color: "bg-rose-500", tag: "✗ Gap Besar" },
                                    ].map((job) => (
                                        <div key={job.title} className="bg-white/5 rounded-lg p-2.5 border border-white/5">
                                            <div className="flex items-start gap-2 mb-2">
                                                <div className={`w-1 h-full min-h-[2rem] rounded-full ${job.color} opacity-70 shrink-0`} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] font-semibold text-foreground/90 truncate">{job.title}</div>
                                                    <div className="text-[9px] text-muted-foreground">{job.company}</div>
                                                </div>
                                                <div className="text-xs font-bold text-green-400 shrink-0">{job.score}%</div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <WalletIcon className="w-2.5 h-2.5 text-emerald-500" />
                                                <span className="text-[9px] text-emerald-400">{job.salary}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Cover letter preview */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-white/5 rounded-lg p-2.5 border border-white/5 flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                                            <BrainCircuitIcon className="w-3.5 h-3.5 text-violet-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[9px] font-medium text-foreground/80">Roadmap: Belajar TensorFlow</div>
                                            <div className="h-1 bg-white/10 rounded-full mt-1">
                                                <div className="h-full w-2/5 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full" />
                                            </div>
                                        </div>
                                        <span className="text-[9px] text-violet-400">40%</span>
                                    </div>
                                    <div className="bg-white/5 rounded-lg p-2.5 border border-white/5 flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-rose-500/20 flex items-center justify-center shrink-0">
                                            <SparklesIcon className="w-3.5 h-3.5 text-rose-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[9px] font-medium text-foreground/80">Cover Letter Generated</div>
                                            <div className="text-[9px] text-muted-foreground">Junior ML Engineer · AI Nusantara</div>
                                        </div>
                                        <CheckCircle2Icon className="w-3.5 h-3.5 text-green-400 shrink-0" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AnimationContainer>
                </div>
            </MaxWidthWrapper>

            {/* ── GitHire vs Job Board (new section) ── */}
            <MaxWidthWrapper className="py-16">
                <AnimationContainer delay={0.1}>
                    <div className="flex flex-col items-center justify-center w-full py-8 max-w-xl mx-auto">
                        <MagicBadge title="Perbandingan" />
                        <h2 className="text-center text-3xl md:text-5xl !leading-[1.1] font-medium font-heading text-foreground mt-6">
                            Lebih dari sekadar{" "}
                            <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text">
                                papan lowongan
                            </span>
                        </h2>
                        <p className="mt-4 text-center text-base text-muted-foreground max-w-lg">
                            Platform lowongan biasa menampilkan pekerjaan. GitHire mempersiapkan Anda untuk mendapatkannya.
                        </p>
                    </div>
                </AnimationContainer>

                <AnimationContainer delay={0.2}>
                    <div className="max-w-2xl mx-auto mt-4">
                        <div className="rounded-2xl border border-border overflow-hidden">
                            {/* Header */}
                            <div className="grid grid-cols-3 bg-muted/50 border-b border-border">
                                <div className="py-3 px-4 text-sm font-medium text-muted-foreground">Fitur</div>
                                <div className="py-3 px-4 text-sm font-medium text-center text-muted-foreground">Job Board Biasa</div>
                                <div className="py-3 px-4 text-sm font-bold text-center text-violet-400">GitHire ✨</div>
                            </div>
                            {/* Rows */}
                            {COMPARISON.map((row, i) => (
                                <div key={i} className={`grid grid-cols-3 border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                                    <div className="py-3 px-4 text-sm text-foreground/80">{row.feature}</div>
                                    <div className="py-3 px-4 text-center">
                                        {row.glints
                                            ? <CheckCircle2Icon className="w-4 h-4 text-green-500 mx-auto" />
                                            : <span className="text-muted-foreground text-lg leading-none">—</span>
                                        }
                                    </div>
                                    <div className="py-3 px-4 text-center">
                                        <CheckCircle2Icon className="w-4 h-4 text-violet-500 mx-auto" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnimationContainer>
            </MaxWidthWrapper>

            {/* ── Features ── */}
            <MaxWidthWrapper className="py-16">
                <div id="features">
                    <AnimationContainer delay={0.1}>
                        <div className="flex flex-col w-full items-center justify-center py-8">
                            <MagicBadge title="Fitur Platform" />
                            <h2 className="text-center text-3xl md:text-5xl !leading-[1.1] font-medium font-heading text-foreground mt-6">
                                Semua yang Anda butuhkan untuk
                                <br className="hidden md:block" />
                                <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text">
                                    memulai karir profesional
                                </span>
                            </h2>
                            <p className="mt-4 text-center text-lg text-muted-foreground max-w-lg">
                                Semua fitur utama dapat Anda mulai secara gratis, mulai dari analisis keahlian otomatis hingga pencarian lowongan kerja.
                            </p>
                        </div>
                    </AnimationContainer>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-8">
                        {FEATURES.map((feature, i) => (
                            <AnimationContainer delay={0.08 * i} key={i}>
                                <MagicCard className="group p-5 h-full flex flex-col">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`w-9 h-9 rounded-lg ${feature.bg} flex items-center justify-center shrink-0`}>
                                            <feature.icon className={`w-4.5 h-4.5 ${feature.color}`} strokeWidth={1.5} />
                                        </div>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${feature.bg} ${feature.color}`}>
                                            {feature.badge}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-sm mb-1.5">{feature.title}</h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                                </MagicCard>
                            </AnimationContainer>
                        ))}
                    </div>
                </div>
            </MaxWidthWrapper>

            {/* ── How it works ── */}
            <MaxWidthWrapper className="py-16">
                <div id="how-it-works">
                    <AnimationContainer delay={0.1}>
                        <div className="flex flex-col items-center justify-center w-full py-8 max-w-xl mx-auto">
                            <MagicBadge title="Cara Kerja" />
                            <h2 className="text-center text-3xl md:text-5xl !leading-[1.1] font-medium font-heading text-foreground mt-6">
                                Tiga langkah menuju karir impian Anda
                            </h2>
                            <p className="mt-4 text-center text-lg text-muted-foreground max-w-lg">
                                Dari sinkronisasi profil hingga pengiriman lamaran, seluruh proses membutuhkan kurang dari lima menit.
                            </p>
                        </div>
                    </AnimationContainer>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
                        {STEPS.map((step, i) => (
                            <AnimationContainer delay={0.15 * i} key={i}>
                                <MagicCard className="group p-6 md:py-8 relative h-full flex flex-col">
                                    <span className="absolute top-4 right-4 text-4xl font-bold text-muted-foreground/10 font-heading">
                                        {step.step}
                                    </span>
                                    <step.icon strokeWidth={1.5} className="w-10 h-10 text-primary mb-4" />
                                    <h3 className="text-base font-semibold mb-2">{step.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">{step.description}</p>
                                    <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border">
                                        <ZapIcon className="w-3 h-3 text-primary" />
                                        <span className="text-xs text-primary font-medium">{step.detail}</span>
                                    </div>
                                </MagicCard>
                            </AnimationContainer>
                        ))}
                    </div>
                </div>
            </MaxWidthWrapper>

            {/* ── Job Preview Banner ── */}
            <MaxWidthWrapper className="py-8">
                <AnimationContainer delay={0.1}>
                    <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 p-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
                            <div>
                                <p className="text-xs text-violet-400 font-medium mb-1">📊 Contoh Data Lowongan</p>
                                <h3 className="font-semibold text-lg">Lowongan dengan informasi lengkap</h3>
                            </div>
                            <Button asChild size="sm" variant="outline" className="border-violet-500/30 text-violet-400 shrink-0">
                                <Link href={user ? "/dashboard/jobs" : "/auth/sign-in"}>
                                    Lihat Semua 100+ Lowongan <ArrowRightIcon className="w-3.5 h-3.5 ml-1.5" />
                                </Link>
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {[
                                {
                                    title: "Junior Frontend Developer",
                                    company: "StartupID",
                                    location: "Jakarta",
                                    salary: "Rp 6jt-10jt",
                                    exp: "0-1 tahun",
                                    edu: "Min. D3",
                                    skills: ["React", "TypeScript", "CSS"],
                                    score: 78,
                                },
                                {
                                    title: "Junior Data Analyst",
                                    company: "FinTech Indonesia",
                                    location: "Bandung",
                                    salary: "Rp 5jt-8jt",
                                    exp: "Fresh Graduate",
                                    edu: "Min. S1",
                                    skills: ["Python", "SQL", "Tableau"],
                                    score: 62,
                                },
                                {
                                    title: "Mobile Developer Flutter",
                                    company: "AppStudio.id",
                                    location: "Remote",
                                    salary: "Rp 7jt-12jt",
                                    exp: "1-2 tahun",
                                    edu: "Min. S1",
                                    skills: ["Flutter", "Dart", "Firebase"],
                                    score: 55,
                                },
                            ].map((job) => (
                                <div key={job.title} className="bg-background/60 rounded-xl border border-border p-4 flex flex-col gap-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm truncate">{job.title}</p>
                                            <p className="text-xs text-muted-foreground">{job.company}</p>
                                        </div>
                                        <span className={`text-xs font-bold shrink-0 ${job.score >= 65 ? "text-green-500" : "text-amber-500"}`}>
                                            {job.score}%
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                                            <WalletIcon className="w-3 h-3" />{job.salary}
                                        </span>
                                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                            <MapPinIcon className="w-3 h-3" />{job.location}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                        <span className="px-1.5 py-0.5 bg-muted rounded-md">{job.exp}</span>
                                        <span className="px-1.5 py-0.5 bg-muted rounded-md">{job.edu}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {job.skills.map((s) => (
                                            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20">
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </AnimationContainer>
            </MaxWidthWrapper>

            {/* ── Testimonials ── */}
            <MaxWidthWrapper className="py-16">
                <AnimationContainer delay={0.1}>
                    <div className="flex flex-col items-center justify-center w-full py-8 max-w-xl mx-auto">
                        <MagicBadge title="Testimoni Pengguna" />
                        <h2 className="text-center text-3xl md:text-5xl !leading-[1.1] font-medium font-heading text-foreground mt-6">
                            Dipercaya oleh fresh graduate IT Indonesia
                        </h2>
                        <p className="mt-4 text-center text-lg text-muted-foreground max-w-lg">
                            Mahasiswa dan fresh graduate yang telah merasakan perbedaannya.
                        </p>
                    </div>
                </AnimationContainer>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
                    {TESTIMONIALS.map((t, i) => (
                        <AnimationContainer delay={0.1 * i} key={i}>
                            <MagicCard className="p-5 h-full flex flex-col">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-9 h-9 rounded-full ${t.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                                        {t.avatar}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">{t.name}</p>
                                        <p className="text-xs text-muted-foreground">{t.role}</p>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-3 flex-1">&quot;{t.review}&quot;</p>
                                <div className="flex gap-0.5 mt-auto">
                                    {Array.from({ length: t.rating }).map((_, j) => (
                                        <StarIcon key={j} className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                                    ))}
                                </div>
                            </MagicCard>
                        </AnimationContainer>
                    ))}
                </div>
            </MaxWidthWrapper>

            {/* ── Free Badge ── */}
            <MaxWidthWrapper className="py-8">
                <AnimationContainer delay={0.1}>
                    <div className="flex flex-wrap gap-6 justify-center items-center py-6 border-y border-border">
                        {[
                            { icon: ZapIcon, text: "Mulai Gratis" },
                            { icon: CodeIcon, text: "Sumber Terbuka" },
                            { icon: GithubIcon, text: "Integrasi GitHub" },
                            { icon: BrainCircuitIcon, text: "Ditenagai AI Gemini" },
                            { icon: FileTextIcon, text: "ATS CV Builder" },
                            { icon: SearchIcon, text: "Portal Recruiter & Kandidat" },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2 text-muted-foreground text-sm">
                                <item.icon className="w-4 h-4 text-primary" />
                                {item.text}
                            </div>
                        ))}
                    </div>
                </AnimationContainer>
            </MaxWidthWrapper>

            {/* ── CTA ── */}
            <MaxWidthWrapper className="mt-12 max-w-[100vw] overflow-x-hidden">
                <AnimationContainer delay={0.1}>
                    <LampContainer>
                        <div className="flex flex-col items-center justify-center relative w-full text-center">
                            <h2 className="bg-gradient-to-b from-neutral-200 to-neutral-400 py-4 bg-clip-text text-center text-4xl md:text-7xl !leading-[1.15] font-medium font-heading tracking-tight text-transparent mt-8">
                                Siap melangkah menuju <br /> karir yang Anda inginkan?
                            </h2>
                            <p className="text-muted-foreground mt-6 max-w-md mx-auto">
                                Mulai dengan menghubungkan profil GitHub dan menggunggah CV Anda. Platform kami akan menganalisis keahlian Anda dan menampilkan peluang kerja yang paling relevan.
                            </p>
                            <div className="mt-6 flex gap-3 flex-wrap justify-center">
                                <Button asChild size="lg" className="shadow-lg shadow-violet-500/25">
                                    <Link href={user ? "/dashboard" : "/auth/sign-in"}>
                                        {user ? "Buka Dashboard" : "Mulai Sekarang, Gratis"}
                                        <ArrowRightIcon className="w-4 h-4 ml-2" />
                                    </Link>
                                </Button>
                            </div>

                        </div>
                    </LampContainer>
                </AnimationContainer>
            </MaxWidthWrapper>

        </div>
    );
};

export default HomePage;
