import { AnimationContainer, MaxWidthWrapper } from "@/components";
import MagicBadge from "@/components/ui/magic-badge";
import {
    BriefcaseIcon,
    FileTextIcon,
    GithubIcon,
    SparklesIcon,
    ArrowRightIcon,
} from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Cara Kerja — GitHire",
    description: "Lihat bagaimana GitHire mencocokkan Anda dengan pekerjaan yang tepat menggunakan aktivitas GitHub dan CV dalam 4 langkah mudah.",
};

const steps = [
    {
        number: "01",
        icon: GithubIcon,
        title: "Hubungkan GitHub Anda",
        description:
            "Hubungkan akun GitHub Anda hanya dengan satu klik. GitHire membaca repositori publik, riwayat kontribusi, bahasa yang digunakan, dan aktivitas proyek Anda. Tidak perlu input manual.",
        color: "from-violet-500 to-purple-600",
        glow: "shadow-violet-500/30",
        highlights: ["Repositori publik dianalisis", "Kemampuan bahasa pemrograman terdeteksi", "Streak kontribusi terlacak"],
    },
    {
        number: "02",
        icon: FileTextIcon,
        title: "Unggah CV Anda",
        description:
            "Unggah CV atau resume Anda. AI kami mengekstrak pengalaman, pendidikan, dan keahlian Anda untuk membangun profil kandidat yang lengkap. Data tersebut dikombinasikan dengan aktivitas GitHub untuk gambaran yang lebih utuh.",
        color: "from-indigo-500 to-blue-600",
        glow: "shadow-indigo-500/30",
        highlights: ["Hanya format PDF", "Keahlian diekstrak otomatis", "Riwayat pengalaman tersusun rapi"],
    },
    {
        number: "03",
        icon: SparklesIcon,
        title: "AI Menganalisis & Mencocokkan",
        description:
            "Mesin AI kami menilai lowongan pekerjaan berdasarkan profil unik Anda. Anda mendapatkan persentase kecocokan yang transparan, rincian tumpang tindih keahlian, dan analisis kesenjangan skill. Sehingga Anda tahu persis mengapa setiap pekerjaan direkomendasikan.",
        color: "from-blue-500 to-cyan-600",
        glow: "shadow-blue-500/30",
        highlights: ["Skor kecocokan per lowongan", "Rincian tumpang tindih keahlian", "Analisis skill gap disertakan"],
    },
    {
        number: "04",
        icon: BriefcaseIcon,
        title: "Lamar dengan Surat Lamaran AI",
        description:
            "Menemukan lowongan yang cocok? Buat surat lamaran yang disesuaikan dan profesional dalam hitungan detik. AI kami menyusunnya berdasarkan persyaratan pekerjaan spesifik dan pengalaman nyata Anda, siap untuk dikirim.",
        color: "from-emerald-500 to-teal-600",
        glow: "shadow-emerald-500/30",
        highlights: ["Disesuaikan untuk setiap lowongan", "Nada profesional dan formal", "Siap dalam hitungan detik"],
    },
];

const HowItWorksPage = () => {
    return (
        <MaxWidthWrapper className="py-20 mb-20">
            {/* Header */}
            <AnimationContainer delay={0.1}>
                <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto mb-20">
                    <MagicBadge title="Cara Kerja" />
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-semibold font-heading mt-6 !leading-tight">
                        From GitHub to{" "}
                        <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                            Dream Job
                        </span>{" "}
                        in 4 Steps
                    </h1>
                    <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed">
                        GitHire menggabungkan aktivitas GitHub nyata Anda dengan AI untuk mencocokkan Anda dengan pekerjaan yang benar-benar sesuai kualifikasi. Platform ini juga membantu Anda tampil menonjol dengan lamaran yang dipersonalisasi.
                    </p>
                </div>
            </AnimationContainer>

            {/* Steps */}
            <div className="relative">
                {/* Vertical connector line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-violet-500/0 via-violet-500/30 to-violet-500/0 hidden lg:block -translate-x-1/2" />

                <div className="flex flex-col gap-16">
                    {steps.map((step, index) => {
                        const isEven = index % 2 === 0;
                        const Icon = step.icon;

                        return (
                            <AnimationContainer key={step.number} delay={0.1 * (index + 2)}>
                                <div className={`flex flex-col lg:flex-row items-center gap-8 lg:gap-16 ${isEven ? "" : "lg:flex-row-reverse"}`}>

                                    {/* Text side */}
                                    <div className="flex-1 space-y-5">
                                        <div className="flex items-center gap-3">
                                            <span className="text-5xl font-bold text-white/[0.06] font-heading select-none">
                                                {step.number}
                                            </span>
                                            <div className={`h-px flex-1 bg-gradient-to-r ${isEven ? "from-white/10 to-transparent" : "from-transparent to-white/10"}`} />
                                        </div>
                                        <h2 className="text-2xl md:text-3xl font-semibold text-white">
                                            {step.title}
                                        </h2>
                                        <p className="text-neutral-400 leading-relaxed text-base">
                                            {step.description}
                                        </p>
                                        <ul className="space-y-2">
                                            {step.highlights.map((point) => (
                                                <li key={point} className="flex items-center gap-2 text-sm text-neutral-300">
                                                    <ArrowRightIcon className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                                                    {point}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Icon card side */}
                                    <div className="flex-shrink-0 flex items-center justify-center">
                                        <div className="relative group">
                                            {/* Glow */}
                                            <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${step.color} opacity-20 blur-2xl group-hover:opacity-30 transition-opacity duration-500`} />
                                            {/* Card */}
                                            <div className="relative w-48 h-48 rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm flex items-center justify-center">
                                                <div className={`flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${step.color} shadow-xl ${step.glow}`}>
                                                    <Icon className="h-9 w-9 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </AnimationContainer>
                        );
                    })}
                </div>
            </div>

            {/* CTA */}
            <AnimationContainer delay={0.7}>
                <div className="mt-24 flex flex-col items-center justify-center text-center gap-6 p-10 rounded-3xl border border-white/[0.08] bg-white/[0.02]"
                    style={{ background: "radial-gradient(ellipse at top, rgba(124,58,237,0.08) 0%, transparent 70%)" }}>
                    <h2 className="text-2xl md:text-3xl font-semibold text-white">
                        Siap menemukan peluang karir berikutnya?
                    </h2>
                    <p className="text-neutral-400 max-w-md">
                        Bergabunglah dengan ribuan developer yang membiarkan GitHub mereka berbicara untuk mereka.
                    </p>
                    <a
                        href="/auth/sign-up"
                        className="relative inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white overflow-hidden group"
                        style={{
                            background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
                            boxShadow: "0 0 24px rgba(124,58,237,0.4), 0 4px 16px rgba(0,0,0,0.3)"
                        }}
                    >
                        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                        <SparklesIcon className="relative h-4 w-4" />
                        <span className="relative">Mulai Gratis</span>
                    </a>
                </div>
            </AnimationContainer>
        </MaxWidthWrapper>
    );
};

export default HowItWorksPage;
