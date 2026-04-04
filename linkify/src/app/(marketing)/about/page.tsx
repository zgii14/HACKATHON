import { AnimationContainer, MaxWidthWrapper } from "@/components";
import MagicBadge from "@/components/ui/magic-badge";
import {
    LinkedinIcon,
    SparklesIcon,
    TargetIcon,
    HeartIcon,
    CodeIcon,
    BrainCircuitIcon,
    RocketIcon,
    UsersIcon,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Tentang Kami — GitHire",
    description: "GitHire adalah platform rekrutmen berbasis AI yang mencocokkan developer dengan pekerjaan terbaik menggunakan analisis GitHub dan CV.",
};

const team = [
    {
        name: "Muhammad Rozagi",
        role: "Fullstack Developer",
        note: "Team Lead",
        linkedin: "https://www.linkedin.com/in/muhammadrozagi/",
        avatar: "MR",
        color: "from-violet-500 to-purple-600",
        highlight: true,
    },
    {
        name: "Regina Adelisa",
        role: "Data Analyst & Research",
        note: null,
        linkedin: null,
        avatar: "RA",
        color: "from-indigo-500 to-blue-600",
        highlight: false,
    },
    {
        name: "Ahmad Zul Zhafran",
        role: "Frontend Developer",
        note: null,
        linkedin: null,
        avatar: "AZ",
        color: "from-blue-500 to-cyan-600",
        highlight: false,
    },
    {
        name: "Salsadilla Azizi Firda",
        role: "UI/UX Designer",
        note: null,
        linkedin: null,
        avatar: "SA",
        color: "from-rose-500 to-pink-600",
        highlight: false,
    },
];

const techStack = [
    { name: "Next.js 14", category: "Frontend", color: "bg-white/[0.06] text-white" },
    { name: "TypeScript", category: "Frontend", color: "bg-blue-500/10 text-blue-400" },
    { name: "Tailwind CSS", category: "Frontend", color: "bg-cyan-500/10 text-cyan-400" },
    { name: "FastAPI", category: "Backend", color: "bg-emerald-500/10 text-emerald-400" },
    { name: "Python", category: "Backend", color: "bg-yellow-500/10 text-yellow-400" },
    { name: "PostgreSQL", category: "Database", color: "bg-blue-400/10 text-blue-300" },
    { name: "Google Gemini AI", category: "AI", color: "bg-violet-500/10 text-violet-400" },
    { name: "GitHub API", category: "Integrasi", color: "bg-neutral-500/10 text-neutral-300" },
    { name: "Clerk Auth", category: "Auth", color: "bg-orange-500/10 text-orange-400" },
];

const values = [
    {
        icon: BrainCircuitIcon,
        title: "AI yang Transparan",
        desc: "Kami percaya AI harus dapat dijelaskan. Setiap skor kecocokan dilengkapi alasan yang jelas.",
        color: "from-violet-500 to-purple-600",
    },
    {
        icon: CodeIcon,
        title: "Developer First",
        desc: "Dibangun oleh developer, untuk developer. Kami memahami bahwa GitHub adalah CV terbaik Anda.",
        color: "from-indigo-500 to-blue-600",
    },
    {
        icon: TargetIcon,
        title: "Relevansi di Atas Kuantitas",
        desc: "Lebih baik 5 rekomendasi yang tepat daripada 100 lowongan yang tidak cocok.",
        color: "from-blue-500 to-cyan-500",
    },
    {
        icon: HeartIcon,
        title: "Dampak Nyata",
        desc: "Tujuan kami sederhana: membantu developer Indonesia mendapatkan pekerjaan yang mereka layak dapatkan.",
        color: "from-rose-500 to-pink-600",
    },
];

const AboutPage = () => {
    return (
        <MaxWidthWrapper className="py-20 mb-20 space-y-28">

            {/* Hero */}
            <AnimationContainer delay={0.1}>
                <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto">
                    <MagicBadge title="Tentang GitHire" />
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-semibold font-heading mt-6 !leading-tight">
                        Building the bridge between{" "}
                        <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                            developers
                        </span>{" "}
                        and opportunity
                    </h1>
                    <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
                        Kami membangun GitHire untuk membantu developer Indonesia menemukan pekerjaan yang benar-benar sesuai kemampuan mereka, bukan sekadar mengirim lamaran ke mana-mana.
                    </p>
                </div>
            </AnimationContainer>

            {/* Mission */}
            <AnimationContainer delay={0.2}>
                <div className="relative rounded-3xl border border-white/[0.08] p-10 md:p-16 overflow-hidden"
                    style={{ background: "radial-gradient(ellipse at top left, rgba(124,58,237,0.10) 0%, transparent 60%)" }}>
                    <div className="absolute top-6 right-6 opacity-5">
                        <RocketIcon className="h-40 w-40 text-violet-400" />
                    </div>
                    <div className="relative max-w-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
                                <RocketIcon className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-sm font-medium text-violet-400 uppercase tracking-wider">Misi Kami</span>
                        </div>
                        <h2 className="text-2xl md:text-4xl font-semibold text-white leading-snug">
                            Membantu setiap developer Indonesia mendapat kesempatan kerja yang adil
                        </h2>
                        <p className="mt-6 text-neutral-400 leading-relaxed">
                            GitHire menilai kandidat berdasarkan kemampuan nyata dari GitHub dan CV, bukan koneksi atau nama universitas.
                        </p>
                    </div>
                </div>
            </AnimationContainer>

            {/* Values */}
            <AnimationContainer delay={0.3}>
                <div>
                    <div className="text-center mb-12">
                        <h2 className="text-2xl md:text-4xl font-semibold text-white">Nilai-Nilai Kami</h2>
                        <p className="mt-4 text-neutral-400">Prinsip yang mendasari setiap keputusan yang kami buat</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {values.map((val) => {
                            const Icon = val.icon;
                            return (
                                <div key={val.title}
                                    className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300">
                                    <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${val.color} mb-4 shadow-lg`}>
                                        <Icon className="h-5 w-5 text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">{val.title}</h3>
                                    <p className="text-neutral-400 text-sm leading-relaxed">{val.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </AnimationContainer>

            {/* Team */}
            <AnimationContainer delay={0.4}>
                <div>
                    <div className="text-center mb-12">
                        <h2 className="text-2xl md:text-4xl font-semibold text-white">Tim Kami</h2>
                        <p className="mt-4 text-neutral-400 max-w-lg mx-auto">
                            Tim empat orang yang bersama-sama membangun solusi nyata untuk rekrutmen developer Indonesia.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {team.map((member) => (
                            <div key={member.name}
                                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 flex flex-col items-center text-center hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300">
                                {/* Avatar */}
                                <div className="relative mb-4 mt-2">
                                    <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${member.color} opacity-30 blur-xl`} />
                                    <div className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center text-lg font-bold text-white shadow-xl`}>
                                        {member.avatar}
                                    </div>
                                </div>
                                <h3 className="text-base font-semibold text-white leading-tight">{member.name}</h3>
                                <p className="text-xs text-neutral-400 mt-1">{member.role}</p>
                                {member.note && (
                                    <p className="text-xs text-violet-400 mt-1 italic">{member.note}</p>
                                )}
                                {member.linkedin && (
                                    <Link
                                        href={member.linkedin}
                                        target="_blank"
                                        className="mt-3 inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-blue-400 transition-colors"
                                    >
                                        <LinkedinIcon className="h-3.5 w-3.5" />
                                        LinkedIn
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </AnimationContainer>

            {/* Tech Stack */}
            <AnimationContainer delay={0.5}>
                <div>
                    <div className="text-center mb-10">
                        <h2 className="text-2xl md:text-4xl font-semibold text-white">Tech Stack</h2>
                        <p className="mt-4 text-neutral-400">Teknologi yang kami gunakan untuk membangun GitHire</p>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center">
                        {techStack.map((tech) => (
                            <div key={tech.name}
                                className={`inline-flex flex-col items-center gap-1 px-4 py-2.5 rounded-xl border border-white/[0.06] ${tech.color} transition-all duration-200 hover:border-white/[0.14]`}>
                                <span className="text-sm font-medium">{tech.name}</span>
                                <span className="text-[10px] opacity-60">{tech.category}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </AnimationContainer>

            {/* CTA */}
            <AnimationContainer delay={0.6}>
                <div className="flex flex-col items-center justify-center text-center gap-6 p-10 rounded-3xl border border-white/[0.08]"
                    style={{ background: "radial-gradient(ellipse at top, rgba(124,58,237,0.08) 0%, transparent 70%)" }}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/30">
                        <SparklesIcon className="h-7 w-7 text-white" />
                    </div>
                    <h2 className="text-2xl md:text-3xl font-semibold text-white">
                        Coba GitHire sekarang
                    </h2>
                    <p className="text-neutral-400 max-w-md">
                        Hubungkan GitHub Anda dan temukan pekerjaan yang benar-benar sesuai dengan kemampuan Anda.
                    </p>
                    <Link
                        href="/auth/sign-up"
                        className="relative inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white overflow-hidden group"
                        style={{
                            background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                            boxShadow: "0 0 24px rgba(124,58,237,0.4), 0 4px 16px rgba(0,0,0,0.3)"
                        }}
                    >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <span className="relative">Mulai Gratis</span>
                    </Link>
                </div>
            </AnimationContainer>

        </MaxWidthWrapper>
    );
};

export default AboutPage;
