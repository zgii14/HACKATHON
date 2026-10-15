"use client";

import { useApi } from "@/hooks/use-api";
import { confirmDestructive } from "@/lib/confirm";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { canRestoreProject, createOneShotUndo, mergeAiCopy, restoreAt, transitionDraftRemoval } from "../portfolio-editor-helpers";
import type { PortfolioRecord } from "../types";
import { EditorBar } from "./editor-bar";
import { EditorNav } from "./editor-nav";
import { parseSection, publishState, sectionCompleteness, type SectionSlug } from "./editor-state";
import { AddressSection } from "./sections/address-section";
import { AppearanceSection } from "./sections/appearance-section";
import { ContactsSection } from "./sections/contacts-section";
import { EducationSection } from "./sections/education-section";
import { ExperienceSection } from "./sections/experience-section";
import { ProfileSection } from "./sections/profile-section";
import { ProjectsSection, type EditorRepo } from "./sections/projects-section";
import { SkillsSection } from "./sections/skills-section";
import { usePortfolioAutosave } from "./use-portfolio-autosave";

export type EditorProfile = { github_signals: { repos_detail?: EditorRepo[] } | null; github_username?: string | null };

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi.");

export function EditorWorkspace({ record, profile }: { record: PortfolioRecord; profile: EditorProfile }) {
    const { withAuth } = useApi();
    const queryClient = useQueryClient();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const section = parseSection(searchParams.get("bagian"));
    const { form, edit, replace, latest, flush, status, backup, restoreBackup, discardBackup } = usePortfolioAutosave(record);
    const [busy, setBusy] = useState<string | null>(null);
    const [photoChanged, setPhotoChanged] = useState(false);
    const state = publishState(record, { photoChanged });
    const repos = profile.github_signals?.repos_detail ?? [];

    const goTo = (slug: SectionSlug) => {
        void flush();
        router.replace(`${pathname}?bagian=${slug}`, { scroll: false });
    };

    /** Aksi eksplisit: simpan dulu perubahan tertunda, panggil API, lalu isi form dari server. */
    const act = async (key: string, request: () => Promise<PortfolioRecord>, success: string) => {
        setBusy(key);
        try {
            if (!(await flush())) {
                toast.error("Perubahan belum tersimpan. Perbaiki dulu, lalu coba lagi.");
                return null;
            }
            const result = await request();
            queryClient.setQueryData(["portfolio"], result);
            if (result.draft_content) replace(result.draft_content);
            toast.success(success);
            return result;
        } catch (error) {
            toast.error(errorText(error));
            return null;
        } finally {
            setBusy(null);
        }
    };

    const primary = async () => {
        const done = state === "draft"
            ? await act("publish", () => withAuth<PortfolioRecord>("/me/portfolio/publish", { method: "POST" }), "Portfolio dipublikasikan.")
            : await act("publish", () => withAuth<PortfolioRecord>("/me/portfolio", {
                method: "PATCH",
                body: JSON.stringify({ ...latest(), ai_enhanced: undefined, save_mode: "publish" }),
            }), "Portfolio publik diperbarui.");
        if (done) setPhotoChanged(false);
    };

    const uploadPhoto = async (file: File) => {
        const data = new FormData();
        data.append("photo", file);
        data.append("save_mode", "draft");
        if (await act("photo", () => withAuth<PortfolioRecord>("/me/portfolio/photo", { method: "POST", body: data }), "Foto tersimpan.")) setPhotoChanged(true);
    };

    const removePhoto = async () => {
        const confirmed = await confirmDestructive({ title: "Hapus foto?", text: "Foto perlu diunggah ulang jika ingin dipakai lagi.", confirmText: "Ya, hapus foto" });
        if (!confirmed) return;
        if (await act("photo", () => withAuth<PortfolioRecord>("/me/portfolio/photo", { method: "DELETE" }), "Foto dihapus.")) setPhotoChanged(true);
    };

    const unpublish = async () => {
        const confirmed = await confirmDestructive({
            title: "Sembunyikan portfolio dari publik?",
            text: "Portfolio tidak bisa dibuka publik sampai kamu mempublikasikannya lagi.",
            confirmText: "Ya, sembunyikan",
        });
        if (!confirmed) return;
        await act("unpublish", () => withAuth<PortfolioRecord>("/me/portfolio/unpublish", { method: "POST" }), "Portfolio disembunyikan dari publik.");
    };

    const rewriteWithAi = async () => {
        const confirmed = await confirmDestructive({
            title: "Tulis ulang dengan AI?",
            text: "Headline, tentang saya, dan deskripsi proyek diganti hasil AI terbaru. Tema, kontak, pengalaman, dan isian lain tetap.",
            confirmText: "Ya, tulis ulang",
        });
        if (!confirmed) return;
        setBusy("rewrite");
        try {
            if (!(await flush())) {
                toast.error("Perubahan belum tersimpan. Perbaiki dulu, lalu coba lagi.");
                return;
            }
            const current = latest();
            const generated = await withAuth<PortfolioRecord>("/me/portfolio/generate", {
                method: "POST",
                body: JSON.stringify({ language: current.language, repo_names: current.projects.map((project) => project.repo_name) }),
            });
            // Generate menimpa draft di server; simpan kembali draft user + copy AI (atau draft utuh jika AI gagal).
            const fresh = generated.draft_content;
            const aiEnhanced = Boolean(fresh?.ai_enhanced);
            const next = fresh && aiEnhanced ? mergeAiCopy(current, fresh) : current;
            const saved = await withAuth<PortfolioRecord>("/me/portfolio", {
                method: "PATCH",
                body: JSON.stringify({ ...next, ai_enhanced: undefined, save_mode: "draft" }),
            });
            queryClient.setQueryData(["portfolio"], saved);
            if (saved.draft_content) replace(saved.draft_content);
            if (aiEnhanced) toast.success("Teks AI diperbarui. Periksa sebelum dipublikasikan.");
            else toast.warn("AI sedang tidak tersedia. Draft tidak diubah.");
        } catch (error) {
            toast.error(errorText(error));
        } finally {
            setBusy(null);
        }
    };

    const showUndoToast = (message: string, undo: () => void) => {
        const toastId = "portfolio-editor-undo";
        toast.dismiss(toastId);
        toast.success(({ closeToast }) => (
            <div className="flex items-center justify-between gap-3">
                <span>{message}</span>
                <button type="button" className="font-semibold underline" onClick={() => { undo(); closeToast(); }}>Urungkan</button>
            </div>
        ), { toastId, autoClose: 5000, closeOnClick: false, closeButton: false, draggable: false });
    };

    const removeProject = (index: number) => {
        const current = latest();
        const removal = transitionDraftRemoval(current, "projects", index);
        if (!removal) return;
        const originalMatchingCount = current.projects.filter((project) => project.repo_name === removal.removed.repo_name).length;
        const claimUndo = createOneShotUndo();
        edit(removal.draft);
        showUndoToast("Proyek dihapus.", () => {
            if (!claimUndo()) return;
            const now = latest();
            if (!canRestoreProject(now.projects, removal.removed, originalMatchingCount)) return;
            edit({ ...now, projects: restoreAt(now.projects, removal.removed, removal.index) });
        });
    };

    const removeExperience = (index: number) => {
        const removal = transitionDraftRemoval(latest(), "experience", index);
        if (!removal) return;
        const claimUndo = createOneShotUndo();
        edit(removal.draft);
        showUndoToast("Pengalaman dihapus.", () => {
            if (!claimUndo()) return;
            const now = latest();
            edit({ ...now, experience: restoreAt(now.experience, removal.removed, removal.index) });
        });
    };

    const removeEducation = (index: number) => {
        const removal = transitionDraftRemoval(latest(), "education", index);
        if (!removal) return;
        const claimUndo = createOneShotUndo();
        edit(removal.draft);
        showUndoToast("Pendidikan dihapus.", () => {
            if (!claimUndo()) return;
            const now = latest();
            edit({ ...now, education: restoreAt(now.education, removal.removed, removal.index) });
        });
    };

    const content = (() => {
        switch (section) {
            case "proyek":
                return <ProjectsSection form={form} onChange={edit} repos={repos} onRemove={removeProject} />;
            case "skill":
                return <SkillsSection form={form} onChange={edit} />;
            case "pengalaman":
                return <ExperienceSection form={form} onChange={edit} onRemove={removeExperience} />;
            case "pendidikan":
                return <EducationSection form={form} onChange={edit} onRemove={removeEducation} />;
            case "kontak":
                return <ContactsSection form={form} onChange={edit} errorMessage={status.section === "kontak" ? status.message ?? null : null} />;
            case "tampilan":
                return <AppearanceSection form={form} onChange={edit} />;
            case "alamat":
                return <AddressSection record={record} suggestion={profile.github_username ?? null} busy={busy !== null} onUnpublish={unpublish} />;
            default:
                return <ProfileSection form={form} onChange={edit} hasPhoto={record.has_photo} photoBusy={busy === "photo"} onUploadPhoto={uploadPhoto} onRemovePhoto={removePhoto} />;
        }
    })();

    return (
        <div className="w-full" onBlurCapture={() => void flush()}>
            <EditorBar
                record={record}
                state={state}
                status={status}
                busy={busy}
                canRewrite={form.projects.length > 0}
                onPrimary={primary}
                onRewrite={rewriteWithAi}
                onRetry={() => void flush()}
            />
            {backup && (
                <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-body">
                    <span>Ada perubahan yang belum tersimpan dari sesi sebelumnya.</span>
                    <span className="flex gap-3">
                        <button type="button" className="font-semibold text-primary" onClick={restoreBackup}>Pulihkan</button>
                        <button type="button" className="font-semibold text-muted-foreground" onClick={discardBackup}>Buang</button>
                    </span>
                </div>
            )}
            <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
                <EditorNav active={section} completeness={sectionCompleteness(form)} errorSection={status.section} onSelect={goTo} />
                <div className="min-w-0 max-w-3xl">{content}</div>
            </div>
        </div>
    );
}
