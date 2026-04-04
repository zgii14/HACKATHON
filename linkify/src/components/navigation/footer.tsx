import Link from 'next/link';
import { AnimationContainer } from "@/components"
import { TextHoverEffect } from "@/components/ui/text-hover-effect"

const Footer = () => {
    return (
        <footer className="flex flex-col relative items-center justify-center border-t border-border pt-16 pb-8 md:pb-0 px-6 lg:px-8 w-full max-w-6xl mx-auto lg:pt-32 bg-[radial-gradient(35%_128px_at_50%_0%,theme(backgroundColor.white/8%),transparent)]">

            <div className="absolute top-0 left-1/2 right-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1.5 bg-foreground rounded-full"></div>

            <div className="grid gap-8 xl:grid-cols-3 xl:gap-8 w-full">

                {/* Brand */}
                <AnimationContainer delay={0.1}>
                    <div className="flex flex-col items-start justify-start md:max-w-[220px]">
                        <Link href="/" className="flex items-center">
                            <svg width="110" height="30" viewBox="0 0 180 60" xmlns="http://www.w3.org/2000/svg" aria-label="GitHire">
                                <circle cx="16" cy="16" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                                <circle cx="16" cy="44" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                                <circle cx="34" cy="30" r="6" fill="#6d28d9" />
                                <line x1="16" y1="22" x2="16" y2="38" stroke="currentColor" strokeWidth="2" />
                                <line x1="20" y1="18" x2="30" y2="26" stroke="currentColor" strokeWidth="2" />
                                <text x="50" y="30" fontFamily="system-ui,sans-serif" fontSize="22" fontWeight="700" fill="currentColor" dominantBaseline="central">
                                    Git<tspan fill="#8b5cf6">Hire</tspan>
                                </text>
                            </svg>
                        </Link>
                        <p className="text-muted-foreground mt-4 text-sm text-start leading-relaxed">
                            Platform karir berbasis AI untuk fresh graduate dan developer Indonesia.
                        </p>
                        <span className="mt-4 text-neutral-200 text-sm flex items-center">
                            Dibuat oleh <span className="font-semibold ml-1 bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Tim GitHire</span>
                        </span>
                    </div>
                </AnimationContainer>

                <div className="grid-cols-2 gap-8 grid mt-16 xl:col-span-2 xl:mt-0">
                    <div className="md:grid md:grid-cols-2 md:gap-8">
                        {/* Platform */}
                        <AnimationContainer delay={0.2}>
                            <div>
                                <h3 className="text-base font-medium text-white">Platform</h3>
                                <ul className="mt-4 text-sm text-muted-foreground space-y-2">
                                    <li>
                                        <Link href="/#features" className="hover:text-foreground transition-all duration-300">
                                            Fitur
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/how-it-works" className="hover:text-foreground transition-all duration-300">
                                            Cara Kerja
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/auth/sign-in" className="hover:text-foreground transition-all duration-300">
                                            Masuk
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/auth/sign-up" className="hover:text-foreground transition-all duration-300">
                                            Daftar Gratis
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </AnimationContainer>

                        {/* Dashboard */}
                        <AnimationContainer delay={0.3}>
                            <div className="mt-10 md:mt-0 flex flex-col">
                                <h3 className="text-base font-medium text-white">Dashboard</h3>
                                <ul className="mt-4 text-sm text-muted-foreground space-y-2">
                                    <li>
                                        <Link href="/dashboard/jobs" className="hover:text-foreground transition-all duration-300">
                                            Lowongan
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/dashboard/skill-gap" className="hover:text-foreground transition-all duration-300">
                                            Skill Gap
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/dashboard/roadmap" className="hover:text-foreground transition-all duration-300">
                                            Roadmap
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/dashboard/onboarding" className="hover:text-foreground transition-all duration-300">
                                            Sync Profil
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </AnimationContainer>
                    </div>

                    <div className="md:grid md:grid-cols-2 md:gap-8">
                        {/* Company */}
                        <AnimationContainer delay={0.4}>
                            <div>
                                <h3 className="text-base font-medium text-white">Perusahaan</h3>
                                <ul className="mt-4 text-sm text-muted-foreground space-y-2">
                                    <li>
                                        <Link href="/about" className="hover:text-foreground transition-all duration-300">
                                            Tentang Kami
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/privacy" className="hover:text-foreground transition-all duration-300">
                                            Kebijakan Privasi
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href="/terms" className="hover:text-foreground transition-all duration-300">
                                            Syarat & Ketentuan
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                        </AnimationContainer>

                        {/* Tech Stack */}
                        <AnimationContainer delay={0.5}>
                            <div className="mt-10 md:mt-0 flex flex-col">
                                <h3 className="text-base font-medium text-white">Teknologi</h3>
                                <ul className="mt-4 text-sm text-muted-foreground space-y-2">
                                    <li className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                        Next.js
                                    </li>
                                    <li className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        FastAPI
                                    </li>
                                    <li className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Gemini AI
                                    </li>
                                    <li className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                        GitHub API
                                    </li>
                                </ul>
                            </div>
                        </AnimationContainer>
                    </div>
                </div>

            </div>

            <div className="mt-8 border-t border-border/40 pt-4 md:pt-8 md:flex md:items-center md:justify-between w-full">
                <AnimationContainer delay={0.6}>
                    <p className="text-sm text-muted-foreground mt-8 md:mt-0">
                        &copy; {new Date().getFullYear()} GitHire. All rights reserved.
                    </p>
                </AnimationContainer>
            </div>

            <div className="h-[20rem] lg:h-[20rem] hidden md:flex items-center justify-center">
                <TextHoverEffect text="GitHire" />
            </div>
        </footer>
    )
}

export default Footer
