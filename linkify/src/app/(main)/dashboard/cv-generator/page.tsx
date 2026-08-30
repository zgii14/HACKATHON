"use client";

import { EmptyState, PageHeader, Reveal, SecTitle, Spotlight } from "@/components/dashboard/ui";
import { CertsSection } from "@/components/cv-generator/CertsSection";
import { ContactSection } from "@/components/cv-generator/ContactSection";
import { EducationSection } from "@/components/cv-generator/EducationSection";
import { OrgSection } from "@/components/cv-generator/OrgSection";
import { SkillsSection } from "@/components/cv-generator/SkillsSection";
import { TrainingSection } from "@/components/cv-generator/TrainingSection";
import { WorkSection } from "@/components/cv-generator/WorkSection";
import { useApi } from "@/hooks/use-api";
import { useCvForm } from "@/hooks/useCvForm";
import { generateWordCV } from "@/lib/cv/docx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Save } from "lucide-react";
import { toast } from "react-toastify";

type Profile = {
    github_username: string | null;
    bio_full_name: string | null;
    bio_birth_place: string | null;
    bio_birth_date: string | null;
    bio_address: string | null;
    bio_phone: string | null;
    cv_skills: string[] | null;
    merged_skills: string[] | null;
    cv_data: any | null;
    cv_filename: string | null;
    cv_uploaded_at: string | null;
    cv_preference: "form" | "original" | null;
};

export default function CVGeneratorPage() {
    const { withAuth, withAuthBlob, authReady } = useApi();
    const qc = useQueryClient();
    const { data: profile, isLoading, isError, error, refetch } = useQuery({
        queryKey: ["profile"],
        queryFn: () => withAuth<Profile | null>("/me/profile"),
        enabled: authReady,
        staleTime: 5 * 60 * 1000,
    });
    const form = useCvForm(profile as any);
    const saveMutation = useMutation({
        mutationFn: async () => {
            await withAuth("/me/profile/cv-data", { method: "PUT", body: JSON.stringify(form.getPayload()) });
            try {
                await withAuth("/me/biodata", { method: "PATCH", body: JSON.stringify(form.getBiodataPayload()) });
            } catch (err: any) {
                throw new Error(err?.message ? `CV tersimpan tetapi biodata gagal: ${err.message} — silakan coba simpan ulang.` : "CV tersimpan tetapi biodata gagal disimpan — silakan coba lagi.");
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["profile"] });
            qc.invalidateQueries({ queryKey: ["biodata"] });
            qc.invalidateQueries({ queryKey: ["skill-gap"] });
            toast.success("Riwayat CV berhasil disimpan ke database!");
        },
        onError: (err: any) => toast.error(err.message || "Gagal menyimpan data."),
    });
    const cvPref = profile?.cv_preference ?? "form";
    const prefMutation = useMutation({
        mutationFn: (preference: "form" | "original") => withAuth("/me/cv-preference", { method: "PATCH", body: JSON.stringify({ preference }) }),
        onSuccess: (_d, preference) => {
            qc.invalidateQueries({ queryKey: ["profile"] });
            toast.success(preference === "form" ? "Recruiter akan menerima CV versi form (ATS)." : "Recruiter akan menerima PDF asli yang kamu upload.");
        },
        onError: (err: any) => toast.error(err.message || "Gagal mengubah preferensi."),
    });
    const previewSentCV = async () => {
        if (!authReady) return toast.error("Auth belum siap — silakan tunggu sebentar.");
        try {
            const blob = await withAuthBlob("/me/cv/download");
            const url = URL.createObjectURL(blob);
            const win = window.open(url, "_blank", "noopener");
            if (!win) { URL.revokeObjectURL(url); return toast.error("Pop-up diblokir — izinkan pop-up untuk melihat preview."); }
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch (err: any) { toast.error(err?.message || "Gagal membuka preview CV."); }
    };
    const gotoBio = () => {
        document.getElementById("cv-contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
        const firstEmpty = form.bioFields.find(([, v]) => !v.trim());
        if (firstEmpty) setTimeout(() => document.getElementById(firstEmpty[0])?.focus(), 420);
    };
    const handleDownload = async () => {
        await generateWordCV({
            fullName: form.fullName,
            phone: form.phone,
            email: form.email,
            address: form.address,
            linkedin: form.linkedin,
            githubUrl: form.githubUrl,
            summary: form.summary,
            education: form.education,
            workExperience: form.workExperience.map((w) => ({
                company: w.company,
                role: w.role,
                location: w.location,
                period: w.period,
                bullets: w.bullets.map((b) => b.text),
            })),
            orgExperience: form.orgExperience.map((o) => ({
                organization: o.organization,
                role: o.role,
                location: o.location,
                period: o.period,
                bullets: o.bullets.map((b) => b.text),
            })),
            training: form.training.map((t) => ({
                title: t.title,
                provider: t.provider,
                location: t.location,
                period: t.period,
                bullets: t.bullets.map((b) => b.text),
            })),
            softSkills: form.softSkills,
            hardSkills: form.hardSkills,
            languages: form.languages,
            certifications: form.certifications.map((c) => c.value),
        });
    };
    if (isLoading) return <div className="max-w-3xl space-y-4"><div className="h-8 w-48 rounded-md bg-muted" /><div className="h-64 rounded-md border bg-muted/20" /></div>;
    if (isError) return (
        <div className="w-full max-w-3xl">
            <PageHeader crumb="dasbor / profil / cv generator" title="AI CV Generator" sub="Tinjau, lengkapi, dan unduh CV profesional yang ATS-friendly (Harvard CV Style)." />
            <div className="pt-8">
                <EmptyState title="Gagal memuat profil">{(error as any)?.message || "Terjadi kesalahan saat memuat data."}</EmptyState>
                <div className="mt-4 flex justify-center">
                    <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[12.5px] font-bold text-primary-foreground transition hover:brightness-110">Coba lagi</button>
                </div>
            </div>
        </div>
    );
    return (
        <div className="w-full max-w-3xl pb-16">
            <PageHeader
                crumb="dasbor / profil / cv generator"
                title="AI CV Generator"
                sub="Tinjau, lengkapi, dan unduh CV profesional yang ATS-friendly (Harvard CV Style)."
                right={
                    <div className="flex items-center gap-3">
                        {form.highlightSave ? (
                            <Spotlight className="inline-block rounded-md">
                                <button
                                    onClick={() => saveMutation.mutate()}
                                    disabled={!authReady || saveMutation.isPending}
                                    title="Data diri belum disimpan — klik untuk menyimpan"
                                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-[12.5px] font-bold text-primary-foreground shadow-sm ring-2 ring-primary/30 transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                                >
                                    {saveMutation.isPending ? "Menyimpan…" : <><Save className="size-3.5" /> Simpan data diri</>}
                                </button>
                            </Spotlight>
                        ) : (
                            <button
                                onClick={() => saveMutation.mutate()}
                                disabled={!authReady || saveMutation.isPending}
                                className="text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {saveMutation.isPending ? "Menyimpan…" : "Simpan riwayat"}
                            </button>
                        )}
                        <button
                            onClick={handleDownload}
                            disabled={!authReady || !form.bioComplete}
                            title={!authReady ? "Auth belum siap" : !form.bioComplete ? "Lengkapi data diri dulu" : undefined}
                            className="rounded-md bg-primary px-4 py-2 text-[12.5px] font-bold text-primary-foreground transition hover:brightness-110 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
                        >
                            Unduh CV (.docx)
                        </button>
                    </div>
                }
            />
            {!form.bioComplete && (
                <Reveal delay={0.05} className="pt-6">
                    <p className="border-l-2 border-primary bg-primary/[0.05] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground">Lengkapi data diri dulu — {form.bioFilledCount}/{form.bioFields.length} terisi.</span> Nama, telepon, email, dan alamat dipakai di CV dan saat kamu melamar. Isi dulu sebelum mengunduh atau memilih versi CV.{" "}
                        <button
                            onClick={gotoBio}
                            className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            Isi sekarang →
                        </button>
                    </p>
                </Reveal>
            )}
            <Reveal delay={0.12} className="pt-8">
                <section>
                    <SecTitle
                        title="CV yang dikirim saat melamar"
                        meta={
                            <button
                                onClick={previewSentCV}
                                disabled={!authReady || !form.bioComplete}
                                title={!authReady ? "Auth belum siap" : !form.bioComplete ? "Lengkapi data diri dulu" : undefined}
                                className="shrink-0 rounded-md border border-border px-3 py-1.5 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Preview CV terkirim
                            </button>
                        }
                    />
                    <p className="pt-3 text-xs text-muted-foreground">Pilih versi CV yang akan diterima recruiter ketika kamu melamar lowongan.</p>
                    <div className="grid gap-4 pt-4 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => prefMutation.mutate("form")}
                            disabled={prefMutation.isPending || !authReady}
                            className={`rounded-md border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${cvPref === "form" ? "border-primary/60 bg-primary/[0.05]" : "border-border hover:border-muted-foreground"}`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[12.5px] font-bold">Versi form (ATS)</span>
                                <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-primary">disarankan</span>
                            </div>
                            <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                                CV terstruktur ramah ATS dari data di bawah. <span className="text-amber-600 dark:text-amber-500">Pastikan sudah kamu cek</span> — hasil ekstraksi AI bisa keliru.
                            </p>
                        </button>
                        <button
                            type="button"
                            onClick={() => prefMutation.mutate("original")}
                            disabled={prefMutation.isPending || !authReady || !profile?.cv_filename}
                            title={!authReady ? "Auth belum siap" : !profile?.cv_filename ? "Upload CV terlebih dahulu" : undefined}
                            className={`rounded-md border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${cvPref === "original" ? "border-primary/60 bg-primary/[0.05]" : "border-border hover:border-muted-foreground"}`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[12.5px] font-bold">CV asli saya</span>
                                {cvPref === "original" && <CheckCircle2 className="size-3.5 text-primary" />}
                            </div>
                            <p className="mt-1 truncate text-[11.5px] leading-relaxed text-muted-foreground">
                                {profile?.cv_filename ? `PDF asli: ${profile.cv_filename}` : "Belum ada PDF asli — upload CV dulu di onboarding."}
                            </p>
                        </button>
                    </div>
                    <div className="space-y-2 pt-3">
                        {!profile?.cv_filename && (
                            <p className="border-l-2 border-primary bg-primary/[0.05] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                                <span className="font-semibold text-foreground">Butuh PDF asli</span> — upload CV di onboarding untuk mengaktifkan opsi &quot;CV asli saya&quot;.
                            </p>
                        )}
                        {!form.bioComplete && (
                            <p className="border-l-2 border-primary bg-primary/[0.05] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                                <span className="font-semibold text-foreground">Data diri belum lengkap — {form.bioFilledCount}/{form.bioFields.length} terisi.</span> Lengkapi nama, telepon, email, dan alamat agar CV yang dikirim akurat.
                            </p>
                        )}
                    </div>
                </section>
            </Reveal>
            <ContactSection
                fullName={form.fullName}
                phone={form.phone}
                email={form.email}
                address={form.address}
                linkedin={form.linkedin}
                githubUsername={form.githubUsername}
                githubUrl={form.githubUrl}
                bioBirthPlace={form.bioBirthPlace}
                bioBirthDate={form.bioBirthDate}
                bioComplete={form.bioComplete}
                onFullNameChange={form.setFullName}
                onPhoneChange={form.setPhone}
                onEmailChange={form.setEmail}
                onAddressChange={form.setAddress}
                onLinkedinChange={form.setLinkedin}
            />
            <Reveal delay={0.26} className="pt-8">
                <section>
                    <SecTitle title="2. Ringkasan Profesional (Summary)" />
                    <div className="py-4">
                        <textarea
                            value={form.summary}
                            onChange={(e) => form.setSummary(e.target.value)}
                            rows={4}
                            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm leading-relaxed transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                            placeholder="Tulis ringkasan singkat profil Anda..."
                        />
                    </div>
                </section>
            </Reveal>
            <EducationSection education={form.education} setEducation={form.setEducation} />
            <WorkSection workExperience={form.workExperience} setWorkExperience={form.setWorkExperience} />
            <OrgSection orgExperience={form.orgExperience} setOrgExperience={form.setOrgExperience} />
            <TrainingSection training={form.training} setTraining={form.setTraining} />
            <SkillsSection
                softSkills={form.softSkills}
                hardSkills={form.hardSkills}
                languages={form.languages}
                onSoftSkillsChange={form.setSoftSkills}
                onHardSkillsChange={form.setHardSkills}
                onLanguagesChange={form.setLanguages}
            />
            <CertsSection certifications={form.certifications} setCertifications={form.setCertifications} />
            {profile?.cv_data && (
                <Reveal delay={0.75} className="pt-8">
                    <p className="border-l-2 border-primary bg-primary/[0.05] px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground">CV terisi otomatis.</span> Jika kamu sudah upload CV PDF di onboarding, sistem telah mengisi sebagian field via AI — tinjau dan lengkapi yang masih kosong.
                    </p>
                </Reveal>
            )}
        </div>
    );
}
