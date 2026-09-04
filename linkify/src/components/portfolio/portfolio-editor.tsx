"use client";

import { EmptyState, PageHeader, SecTitle } from "@/components/dashboard/ui";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApi } from "@/hooks/use-api";
import { confirmDestructive } from "@/lib/confirm";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import type {
    PortfolioContent,
    PortfolioLanguage,
    PortfolioRecord,
} from "./types";
import { ThemePreviewCards } from "./theme-preview-cards";
import { appendRepositoriesToProjects, canRestoreProject, createEmptyEducation, createEmptyExperience, createOneShotUndo, getEligibleRepositories, getPhotoUploadCopy, getProjectSlots, MAX_PORTFOLIO_PROJECTS, restoreAt, transitionDraftRemoval } from "./portfolio-editor-helpers";

type Repo = {
    name: string;
    html_url: string;
    stars?: number;
    own_commits?: number;
    languages?: Record<string, number>;
};

type Profile = {
    cv_data: Record<string, unknown> | null;
    github_signals: { repos_detail?: Repo[] } | null;
};

const contactLabels = {
    github: "GitHub",
    linkedin: "LinkedIn",
    email: "Email",
    whatsapp: "WhatsApp",
    website: "Website",
} as const;

const inputClass = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";
const buttonClass = "rounded-md border border-border px-3 py-2 text-xs font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

export function PortfolioEditor() {
    const { withAuth, authReady } = useApi();
    const queryClient = useQueryClient();
    const [form, setForm] = useState<PortfolioContent | null>(null);
    const formRef = useRef<PortfolioContent | null>(null);
    const [language, setLanguage] = useState<PortfolioLanguage>("id");
    const [repoNames, setRepoNames] = useState<string[]>([]);
    const [busy, setBusy] = useState<string | null>(null);
    const [projectPickerOpen, setProjectPickerOpen] = useState(false);
    const [pendingProjectNames, setPendingProjectNames] = useState<string[]>([]);

    const showUndoToast = (message: string, undo: () => void) => {
        const toastId = "portfolio-editor-undo";
        toast.dismiss(toastId);
        toast.success(({ closeToast }) => (
            <div className="flex items-center justify-between gap-3">
                <span>{message}</span>
                <button
                    type="button"
                    className="font-semibold underline"
                    onClick={() => {
                        undo();
                        closeToast();
                    }}
                >
                    Urungkan
                </button>
            </div>
        ), { toastId, autoClose: 5000, closeOnClick: false, closeButton: false, draggable: false });
    };

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: () => withAuth<Profile | null>("/me/profile"),
        enabled: authReady,
    });
    const { data: portfolio, isLoading: portfolioLoading } = useQuery({
        queryKey: ["portfolio"],
        queryFn: () => withAuth<PortfolioRecord | null>("/me/portfolio"),
        enabled: authReady,
    });

    const repos = useMemo(() => profile?.github_signals?.repos_detail ?? [], [profile]);
    const projectSlots = form ? getProjectSlots(form.projects) : 0;
    const eligibleRepositories = form ? getEligibleRepositories(repos, form.projects) : [];
    const pendingRepositories = eligibleRepositories.filter((repo) => pendingProjectNames.includes(repo.name));
    const photoUploadCopy = getPhotoUploadCopy(Boolean(portfolio?.has_photo));

    useEffect(() => {
        if (portfolio?.draft_content) setForm(portfolio.draft_content);
    }, [portfolio]);

    useEffect(() => {
        formRef.current = form;
    }, [form]);

    useEffect(() => {
        if (!repoNames.length && repos.length) setRepoNames(repos.slice(0, 6).map((repo) => repo.name));
    }, [repoNames.length, repos]);

    const run = async (key: string, action: () => Promise<PortfolioRecord>, success: string): Promise<PortfolioRecord | null> => {
        setBusy(key);
        try {
            const result = await action();
            setForm(result.draft_content);
            queryClient.setQueryData(["portfolio"], result);
            toast.success(success);
            return result;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi.");
            return null;
        } finally {
            setBusy(null);
        }
    };

    const generate = () => run(
        "generate",
        () => withAuth<PortfolioRecord>("/me/portfolio/generate", {
            method: "POST",
            body: JSON.stringify({ language, repo_names: repoNames }),
        }),
        "Draft portfolio berhasil dibuat.",
    );

    const save = (saveMode: "draft" | "publish"): Promise<PortfolioRecord | null> => {
        if (!form) return Promise.resolve(null);
        return run(
            saveMode,
            () => withAuth<PortfolioRecord>("/me/portfolio", {
                method: "PATCH",
                body: JSON.stringify({ ...form, ai_enhanced: undefined, save_mode: saveMode }),
            }),
            saveMode === "publish" ? "Portfolio publik berhasil diperbarui." : "Draft berhasil disimpan.",
        );
    };

    const publish = () => run(
        "publish",
        () => withAuth<PortfolioRecord>("/me/portfolio/publish", { method: "POST" }),
        "Portfolio berhasil dipublish.",
    );

    const unpublish = async () => {
        const confirmed = await confirmDestructive({
            title: "Sembunyikan portfolio publik?",
            text: "Portfolio tidak dapat dibuka publik sampai dipublish kembali.",
            confirmText: "Ya, unpublish",
        });
        if (!confirmed) return null;
        return run(
            "unpublish",
            () => withAuth<PortfolioRecord>("/me/portfolio/unpublish", { method: "POST" }),
            "Portfolio sudah tidak dapat diakses publik.",
        );
    };

    const uploadPhoto = async (file: File | null) => {
        if (!file) return;
        const data = new FormData();
        data.append("photo", file);
        data.append("save_mode", "draft");
        await run(
            "photo",
            () => withAuth<PortfolioRecord>("/me/portfolio/photo", { method: "POST", body: data }),
            "Foto portfolio tersimpan di draft.",
        );
    };

    const removePhoto = async () => {
        const confirmed = await confirmDestructive({
            title: "Hapus foto dari draft?",
            text: "Foto perlu diunggah ulang jika ingin digunakan kembali.",
            confirmText: "Ya, hapus foto",
        });
        if (!confirmed) return null;
        return run(
            "photo",
            () => withAuth<PortfolioRecord>("/me/portfolio/photo", { method: "DELETE" }),
            "Foto dihapus dari draft.",
        );
    };

    const updateLocalForm = (next: PortfolioContent) => {
        formRef.current = next;
        setForm(next);
    };

    const removeProject = (index: number) => {
        const current = formRef.current;
        if (!current) return;
        const removal = transitionDraftRemoval(current, "projects", index);
        if (!removal) return;
        const originalMatchingCount = current.projects.filter((project) => project.repo_name === removal.removed.repo_name).length;
        const claimUndo = createOneShotUndo();
        updateLocalForm(removal.draft);
        showUndoToast("Proyek dihapus.", () => {
            if (!claimUndo()) return;
            const latest = formRef.current;
            if (!latest || !canRestoreProject(latest.projects, removal.removed, originalMatchingCount)) return;
            updateLocalForm({ ...latest, projects: restoreAt(latest.projects, removal.removed, removal.index) });
        });
    };

    const removeExperience = (index: number) => {
        const current = formRef.current;
        if (!current) return;
        const removal = transitionDraftRemoval(current, "experience", index);
        if (!removal) return;
        const claimUndo = createOneShotUndo();
        updateLocalForm(removal.draft);
        showUndoToast("Pengalaman dihapus.", () => {
            if (!claimUndo()) return;
            const latest = formRef.current;
            if (!latest) return;
            updateLocalForm({ ...latest, experience: restoreAt(latest.experience, removal.removed, removal.index) });
        });
    };

    const removeEducation = (index: number) => {
        const current = formRef.current;
        if (!current) return;
        const removal = transitionDraftRemoval(current, "education", index);
        if (!removal) return;
        const claimUndo = createOneShotUndo();
        updateLocalForm(removal.draft);
        showUndoToast("Pendidikan dihapus.", () => {
            if (!claimUndo()) return;
            const latest = formRef.current;
            if (!latest) return;
            updateLocalForm({ ...latest, education: restoreAt(latest.education, removal.removed, removal.index) });
        });
    };

    const copyLink = async () => {
        if (!portfolio) return;
        const url = `${window.location.origin}${portfolio.public_url}`;
        await navigator.clipboard.writeText(url);
        toast.success("Link portfolio disalin.");
    };

    const toggleRepo = (name: string) => {
        setRepoNames((current) => current.includes(name)
            ? current.filter((item) => item !== name)
            : current.length < 6 ? [...current, name] : current);
    };

    const closeProjectPicker = () => {
        setPendingProjectNames([]);
        setProjectPickerOpen(false);
    };

    const togglePendingProject = (name: string) => {
        setPendingProjectNames((current) => {
            if (current.includes(name)) return current.filter((item) => item !== name);
            return current.length < projectSlots ? [...current, name] : current;
        });
    };

    const addPendingProjects = () => {
        if (!form || pendingRepositories.length === 0) return;
        setForm({ ...form, projects: appendRepositoriesToProjects(form.projects, pendingRepositories) });
        closeProjectPicker();
    };

    if (profileLoading || portfolioLoading) {
        return <div className="h-48 animate-pulse rounded-md bg-muted/40" />;
    }

    if (!profile?.cv_data || !profile.github_signals) {
        return (
            <div className="w-full">
                <PageHeader crumb="dasbor / portfolio" title="Portfolio saya" />
                <div className="pt-8">
                    <EmptyState title="CV dan GitHub belum lengkap">
                        Sync CV dan GitHub terlebih dahulu. <Link className="font-semibold text-primary hover:underline" href="/dashboard/onboarding">Buka onboarding →</Link>
                    </EmptyState>
                </div>
            </div>
        );
    }

    if (!form) {
        return (
            <div className="w-full max-w-3xl">
                <PageHeader crumb="dasbor / portfolio" title="Buat portfolio publik" sub="Pilih bahasa dan maksimal enam repository. AI menyiapkan draft yang wajib kamu review sebelum publish." />
                <section className="pt-8">
                    <SecTitle title="Bahasa portfolio" />
                    <div className="mt-3 flex gap-2">
                        {(["id", "en"] as PortfolioLanguage[]).map((value) => (
                            <button key={value} onClick={() => setLanguage(value)} className={`${buttonClass} ${language === value ? "border-primary bg-primary/10 text-primary" : ""}`}>
                                {value === "id" ? "Bahasa Indonesia" : "English"}
                            </button>
                        ))}
                    </div>
                </section>
                <section className="pt-8">
                    <SecTitle title="Proyek unggulan" meta={`${repoNames.length}/6 dipilih`} />
                    <div className="mt-3 divide-y divide-border border-y border-border">
                        {repos.map((repo) => (
                            <label key={repo.name} className="flex cursor-pointer items-center gap-3 py-3 text-sm">
                                <input type="checkbox" checked={repoNames.includes(repo.name)} onChange={() => toggleRepo(repo.name)} disabled={!repoNames.includes(repo.name) && repoNames.length >= 6} />
                                <span className="min-w-0 flex-1 truncate font-medium">{repo.name}</span>
                                <span className="font-mono text-[11px] text-muted-foreground">★ {repo.stars ?? 0} · {repo.own_commits ?? 0} commits</span>
                            </label>
                        ))}
                    </div>
                    <button className="mt-6 rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50" disabled={busy !== null || repoNames.length === 0} onClick={generate}>
                        {busy === "generate" ? "Menyusun draft…" : "Generate portfolio"}
                    </button>
                </section>
            </div>
        );
    }

    return (
        <div className="w-full">
            <PageHeader
                crumb="dasbor / portfolio / editor"
                title="Editor portfolio"
                sub={`Status: ${portfolio?.status === "published" ? "Published" : "Draft"} · perubahan baru tetap privat sampai kamu memilih Update public portfolio.`}
                right={portfolio?.status === "published" ? (
                    <div className="flex items-center gap-3">
                        <button className={buttonClass} onClick={copyLink}>Salin link</button>
                        <Link className="text-xs font-semibold text-primary hover:underline" href={portfolio.public_url} target="_blank">Lihat publik ↗</Link>
                    </div>
                ) : undefined}
            />

            <div className="grid gap-10 pt-8 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-10">
                    <section>
                        <SecTitle title="Identitas" meta={form.ai_enhanced ? "AI-enhanced · tetap review" : "fallback draft"} />
                        <div className="mt-4 grid gap-4">
                            <label className="text-xs font-semibold">Nama<input className={`${inputClass} mt-1`} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
                            <label className="text-xs font-semibold">Headline<input className={`${inputClass} mt-1`} value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} /></label>
                            <label className="text-xs font-semibold">Tentang saya<textarea rows={5} className={`${inputClass} mt-1 resize-y`} value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} /></label>
                            <div>
                                <label className="text-xs font-semibold">
                                    {photoUploadCopy.label}
                                    <input
                                        className="mt-1 block text-xs"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        aria-describedby="portfolio-photo-help"
                                        onChange={(event) => uploadPhoto(event.target.files?.[0] ?? null)}
                                    />
                                </label>
                                <p id="portfolio-photo-help" role="status" className="mt-1 text-xs text-muted-foreground">{photoUploadCopy.help}</p>
                                {portfolio?.has_photo && <button type="button" onClick={removePhoto} className="mt-2 text-xs text-destructive">Hapus foto dari draft</button>}
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="flex items-end justify-between gap-3">
                            <SecTitle title="Proyek GitHub" meta={`${form.projects.length}/${MAX_PORTFOLIO_PROJECTS}`} />
                            {projectSlots > 0 && <button type="button" className={buttonClass} onClick={() => setProjectPickerOpen(true)}>+ Tambah proyek dari GitHub</button>}
                        </div>
                        <div className="mt-3 divide-y divide-border border-y border-border">
                            {form.projects.map((project, index) => (
                                <div key={project.repo_name} className="py-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <a href={project.url} target="_blank" rel="noreferrer" className="font-semibold hover:text-primary">{project.repo_name} ↗</a>
                                        <button type="button" className="text-xs text-destructive" onClick={() => removeProject(index)}>Hapus</button>
                                    </div>
                                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">{project.tech_stack.join(" · ")} · ★ {project.stars} · {project.own_commits} commits</p>
                                    <textarea className={`${inputClass} mt-3 resize-y`} rows={3} value={project.description} onChange={(event) => setForm({ ...form, projects: form.projects.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item) })} />
                                </div>
                            ))}
                        </div>

                        <Dialog open={projectPickerOpen} onOpenChange={(open) => open ? setProjectPickerOpen(true) : closeProjectPicker()}>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Tambah proyek dari GitHub</DialogTitle>
                                    <DialogDescription>Tersisa {projectSlots} dari {MAX_PORTFOLIO_PROJECTS} slot</DialogDescription>
                                </DialogHeader>
                                {eligibleRepositories.length === 0 ? (
                                    <p className="py-4 text-sm text-muted-foreground">Semua repository yang tersedia sudah ditambahkan ke portfolio.</p>
                                ) : (
                                    <div className="max-h-80 divide-y divide-border overflow-y-auto border-y border-border">
                                        {eligibleRepositories.map((repo) => {
                                            const selected = pendingProjectNames.includes(repo.name);
                                            const disabled = !selected && pendingProjectNames.length >= projectSlots;
                                            const languages = Object.keys(repo.languages ?? {});
                                            return (
                                                <label key={repo.name} className={`flex items-start gap-3 py-3 text-sm ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                                                    <input type="checkbox" className="mt-0.5" checked={selected} disabled={disabled} onChange={() => togglePendingProject(repo.name)} />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate font-medium">{repo.name}</span>
                                                        <span className="mt-1 block text-xs text-muted-foreground">{languages.length ? languages.join(" · ") : "Bahasa tidak terdeteksi"} · ★ {repo.stars ?? 0} · {repo.own_commits ?? 0} commits</span>
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                                <DialogFooter>
                                    <button type="button" className={buttonClass} onClick={closeProjectPicker}>Batal</button>
                                    <button type="button" className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50" disabled={pendingRepositories.length === 0} onClick={addPendingProjects}>Tambah {pendingRepositories.length} proyek</button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </section>

                    <section>
                        <SecTitle title="Skills" meta="badge verified ditentukan sistem" />
                        <input className={`${inputClass} mt-3`} value={form.skills.join(", ")} onChange={(event) => setForm({ ...form, skills: event.target.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 50) })} />
                    </section>

                    <section>
                        <SecTitle title="Sertifikasi" />
                        <input className={`${inputClass} mt-3`} placeholder="Pisahkan dengan koma" value={form.certifications.join(", ")} onChange={(event) => setForm({ ...form, certifications: event.target.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 30) })} />
                    </section>

                    <section>
                        <div className="flex items-end justify-between gap-3">
                            <SecTitle title="Pengalaman" />
                            <button type="button" className={buttonClass} onClick={() => setForm({ ...form, experience: [...form.experience, createEmptyExperience()] })}>+ Tambah pengalaman</button>
                        </div>
                        <div className="mt-3 space-y-4">
                            {form.experience.map((item, index) => (
                                <div key={`${item.company}-${index}`} className="grid gap-2 border-b border-border pb-4 sm:grid-cols-2">
                                    <input className={inputClass} placeholder="Peran" value={item.role ?? ""} onChange={(event) => setForm({ ...form, experience: form.experience.map((entry, itemIndex) => itemIndex === index ? { ...entry, role: event.target.value } : entry) })} />
                                    <input className={inputClass} placeholder="Perusahaan" value={item.company ?? ""} onChange={(event) => setForm({ ...form, experience: form.experience.map((entry, itemIndex) => itemIndex === index ? { ...entry, company: event.target.value } : entry) })} />
                                    <input className={inputClass} placeholder="Periode" value={item.period ?? ""} onChange={(event) => setForm({ ...form, experience: form.experience.map((entry, itemIndex) => itemIndex === index ? { ...entry, period: event.target.value } : entry) })} />
                                    <button type="button" className="justify-self-start text-xs text-destructive" onClick={() => removeExperience(index)}>Hapus pengalaman</button>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <div className="flex items-end justify-between gap-3">
                            <SecTitle title="Pendidikan" />
                            <button type="button" className={buttonClass} onClick={() => setForm({ ...form, education: [...form.education, createEmptyEducation()] })}>+ Tambah pendidikan</button>
                        </div>
                        <div className="mt-3 space-y-4">
                            {form.education.map((item, index) => (
                                <div key={`${item.institution}-${index}`} className="grid gap-2 border-b border-border pb-4 sm:grid-cols-2">
                                    <input className={inputClass} placeholder="Institusi" value={item.institution ?? ""} onChange={(event) => setForm({ ...form, education: form.education.map((entry, itemIndex) => itemIndex === index ? { ...entry, institution: event.target.value } : entry) })} />
                                    <input className={inputClass} placeholder="Gelar" value={item.degree ?? ""} onChange={(event) => setForm({ ...form, education: form.education.map((entry, itemIndex) => itemIndex === index ? { ...entry, degree: event.target.value } : entry) })} />
                                    <input className={inputClass} placeholder="Jurusan" value={item.major ?? ""} onChange={(event) => setForm({ ...form, education: form.education.map((entry, itemIndex) => itemIndex === index ? { ...entry, major: event.target.value } : entry) })} />
                                    <button type="button" className="justify-self-start text-xs text-destructive" onClick={() => removeEducation(index)}>Hapus pendidikan</button>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <SecTitle title="Kontak publik" meta="semua opt-in" />
                        <div className="mt-3 space-y-3">
                            {(Object.keys(contactLabels) as Array<keyof typeof contactLabels>).map((key) => (
                                <div key={key} className="grid gap-2 sm:grid-cols-[110px_1fr_auto] sm:items-center">
                                    <span className="text-xs font-semibold">{contactLabels[key]}</span>
                                    <input className={inputClass} value={form.contacts[key].value} onChange={(event) => setForm({ ...form, contacts: { ...form.contacts, [key]: { ...form.contacts[key], value: event.target.value } } })} />
                                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.contacts[key].enabled} onChange={(event) => setForm({ ...form, contacts: { ...form.contacts, [key]: { ...form.contacts[key], enabled: event.target.checked } } })} /> Tampilkan</label>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
                    <section className="border border-border p-4">
                        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Pilih presentasi</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">Lihat struktur portfolio sebelum kamu memilih tema.</p>
                        <ThemePreviewCards content={form} onSelect={(theme) => setForm({ ...form, theme })} />
                    </section>
                    <section className="border border-border p-4">
                        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Section tampil</p>
                        <div className="mt-3 space-y-2">
                            {(Object.keys(form.sections) as Array<keyof typeof form.sections>).map((key) => (
                                <label key={key} className="flex items-center justify-between gap-3 text-xs capitalize"><span>{key}</span><input type="checkbox" checked={form.sections[key]} onChange={(event) => setForm({ ...form, sections: { ...form.sections, [key]: event.target.checked } })} /></label>
                            ))}
                        </div>
                    </section>
                    <div className="grid gap-2">
                        <button className={buttonClass} disabled={busy !== null} onClick={() => save("draft")}>{busy === "draft" ? "Menyimpan…" : "Save draft"}</button>
                        {portfolio?.status === "published" ? (
                            <>
                                <button className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50" disabled={busy !== null} onClick={() => save("publish")}>Update public portfolio</button>
                                <button className={`${buttonClass} text-destructive`} disabled={busy !== null} onClick={unpublish}>Unpublish</button>
                            </>
                        ) : (
                            <button className="rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50" disabled={busy !== null} onClick={async () => {
                                const saved = await save("draft");
                                if (saved) await publish();
                            }}>Publish portfolio</button>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}
