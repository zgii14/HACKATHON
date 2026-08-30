"use client";

import { Reveal, SecTitle } from "@/components/dashboard/ui";
import Link from "next/link";

type Props = {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    linkedin: string;
    githubUsername: string | null;
    githubUrl: string;
    bioBirthPlace: string;
    bioBirthDate: string;
    bioComplete?: boolean;
    onFullNameChange: (v: string) => void;
    onPhoneChange: (v: string) => void;
    onEmailChange: (v: string) => void;
    onAddressChange: (v: string) => void;
    onLinkedinChange: (v: string) => void;
};

export function ContactSection({
    fullName,
    phone,
    email,
    address,
    linkedin,
    githubUsername,
    githubUrl,
    bioBirthPlace,
    bioBirthDate,
    bioComplete,
    onFullNameChange,
    onPhoneChange,
    onEmailChange,
    onAddressChange,
    onLinkedinChange,
}: Props) {
    return (
        <Reveal delay={0.19} className="pt-8">
            <section id="cv-contact" className="scroll-mt-20">
                <SecTitle
                    title="1. Informasi Kontak"
                    meta={
                        !bioComplete ? (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500">
                                wajib
                            </span>
                        ) : undefined
                    }
                />
                <div className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                            Nama Lengkap
                        </label>
                        <input
                            id="cv-fullname"
                            value={fullName}
                            onChange={(e) => onFullNameChange(e.target.value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-[13px] transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                            placeholder="Masukkan nama..."
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                            Nomor Telepon
                        </label>
                        <input
                            id="cv-phone"
                            value={phone}
                            onChange={(e) => onPhoneChange(e.target.value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-[13px] transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                            placeholder="Contoh: +628..."
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                            Email
                        </label>
                        <input
                            id="cv-email"
                            value={email}
                            onChange={(e) => onEmailChange(e.target.value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-[13px] transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                            placeholder="nama@email.com"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                            URL LinkedIn
                        </label>
                        <input
                            value={linkedin}
                            onChange={(e) => onLinkedinChange(e.target.value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-[13px] transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                            placeholder="www.linkedin.com/in/username"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                            GitHub
                        </label>
                        {githubUsername ? (
                            <a
                                href={githubUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/20 px-3 py-2.5 text-[13px] font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
                            >
                                <span className="truncate">github.com/{githubUsername}</span>
                                <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                                    read-only · kelola di onboarding
                                </span>
                            </a>
                        ) : (
                            <p className="rounded-md border border-dashed border-border bg-muted/10 px-3 py-2.5 text-xs text-muted-foreground">
                                Belum terhubung — hubungkan GitHub di onboarding untuk menampilkan profil.
                            </p>
                        )}
                    </div>
                    <div className="md:col-span-2">
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                            Alamat Domisili
                        </label>
                        <input
                            id="cv-address"
                            value={address}
                            onChange={(e) => onAddressChange(e.target.value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-[13px] transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                            placeholder="Tulis alamat singkat..."
                        />
                    </div>
                </div>

                {/* unify bio_birth_place / bio_birth_date → link to account */}
                <div className="grid grid-cols-1 gap-4 border-t border-border/60 pt-4 md:grid-cols-2">
                    <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                            Tempat Lahir
                        </label>
                        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/10 px-3 py-2.5">
                            <span className="flex-1 truncate text-[13px] text-muted-foreground">
                                {bioBirthPlace?.trim() ? bioBirthPlace : "— belum diisi"}
                            </span>
                            <Link
                                href="/dashboard/account"
                                className="shrink-0 text-[11.5px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                Atur di Akun →
                            </Link>
                        </div>
                    </div>
                    <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                            Tanggal Lahir
                        </label>
                        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/10 px-3 py-2.5">
                            <span className="flex-1 truncate text-[13px] text-muted-foreground">
                                {bioBirthDate?.trim() ? bioBirthDate : "— belum diisi"}
                            </span>
                            <Link
                                href="/dashboard/account"
                                className="shrink-0 text-[11.5px] font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                Atur di Akun →
                            </Link>
                        </div>
                    </div>
                </div>
                <p className="pt-2 text-[11px] leading-relaxed text-muted-foreground">
                    Tempat & tanggal lahir dikelola terpusat di{" "}
                    <Link href="/dashboard/account" className="font-semibold text-primary hover:underline">
                        /dashboard/account
                    </Link>{" "}
                    agar konsisten untuk surat lamaran & CV.
                </p>
            </section>
        </Reveal>
    );
}
