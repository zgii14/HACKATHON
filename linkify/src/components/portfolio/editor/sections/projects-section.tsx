"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import type { PortfolioContent } from "../../types";
import { appendRepositoriesToProjects, getEligibleRepositories, getProjectSlots, MAX_PORTFOLIO_PROJECTS } from "../../portfolio-editor-helpers";
import { EDITOR_SECTIONS } from "../editor-state";
import { inputClass, SectionHeader, SectionToggle } from "../field";

const meta = EDITOR_SECTIONS.find((section) => section.slug === "proyek")!;

export type EditorRepo = {
    name: string;
    html_url: string;
    stars?: number;
    own_commits?: number;
    languages?: Record<string, number>;
};

type Props = {
    form: PortfolioContent;
    onChange: (next: PortfolioContent) => void;
    repos: EditorRepo[];
    onRemove: (index: number) => void;
};

const secondary = "rounded-lg border border-border px-3 py-2 text-[13px] font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

export function ProjectsSection({ form, onChange, repos, onRemove }: Props) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pending, setPending] = useState<string[]>([]);
    const slots = getProjectSlots(form.projects);
    const eligible = getEligibleRepositories(repos, form.projects);
    const pendingRepos = eligible.filter((repo) => pending.includes(repo.name));

    const close = () => {
        setPending([]);
        setPickerOpen(false);
    };
    const toggle = (name: string) => setPending((current) => {
        if (current.includes(name)) return current.filter((item) => item !== name);
        return current.length < slots ? [...current, name] : current;
    });
    const add = () => {
        if (pendingRepos.length === 0) return;
        onChange({ ...form, projects: appendRepositoriesToProjects(form.projects, pendingRepos) });
        close();
    };

    return (
        <section>
            <SectionHeader title={meta.label} description={meta.description}>
                <SectionToggle label="Tampilkan di portfolio" checked={form.sections.projects} onChange={(checked) => onChange({ ...form, sections: { ...form.sections, projects: checked } })} />
            </SectionHeader>
            <div className="grid gap-4">
                {form.projects.map((project, index) => (
                    <div key={project.repo_name} className="rounded-xl border border-border p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <a href={project.url} target="_blank" rel="noreferrer" className="font-semibold hover:text-primary">{project.repo_name} ↗</a>
                                <p className="mt-0.5 text-meta text-muted-foreground">
                                    {[project.tech_stack.slice(0, 4).join(", "), `★ ${project.stars}`, `${project.own_commits} commit`].filter(Boolean).join(" · ")}
                                </p>
                            </div>
                            <button type="button" className="shrink-0 text-meta font-semibold text-destructive" onClick={() => onRemove(index)}>Hapus</button>
                        </div>
                        <textarea
                            rows={3}
                            aria-label={`Deskripsi ${project.repo_name}`}
                            className={`${inputClass} mt-3 resize-y`}
                            value={project.description}
                            onChange={(event) => onChange({
                                ...form,
                                projects: form.projects.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item),
                            })}
                        />
                    </div>
                ))}
                {form.projects.length === 0 && <p className="text-body text-muted-foreground">Belum ada proyek. Tambahkan dari repository GitHub-mu.</p>}
            </div>
            <div className="mt-4 flex items-center gap-3">
                <button type="button" className={secondary} disabled={slots === 0} onClick={() => setPickerOpen(true)}>+ Tambah proyek dari GitHub</button>
                <span className="text-meta text-muted-foreground">{form.projects.length} dari {MAX_PORTFOLIO_PROJECTS}</span>
            </div>

            <Dialog open={pickerOpen} onOpenChange={(open) => (open ? setPickerOpen(true) : close())}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tambah proyek dari GitHub</DialogTitle>
                        <DialogDescription>Tersisa {slots} dari {MAX_PORTFOLIO_PROJECTS} slot</DialogDescription>
                    </DialogHeader>
                    {eligible.length === 0 ? (
                        <p className="py-4 text-sm text-muted-foreground">Semua repository yang tersedia sudah ditambahkan ke portfolio.</p>
                    ) : (
                        <div className="max-h-80 divide-y divide-border overflow-y-auto border-y border-border">
                            {eligible.map((repo) => {
                                const selected = pending.includes(repo.name);
                                const disabled = !selected && pending.length >= slots;
                                const languages = Object.keys(repo.languages ?? {});
                                return (
                                    <label key={repo.name} className={`flex items-start gap-3 py-3 text-sm ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                                        <input type="checkbox" className="mt-0.5" checked={selected} disabled={disabled} onChange={() => toggle(repo.name)} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-medium">{repo.name}</span>
                                            <span className="mt-1 block text-xs text-muted-foreground">{languages.length ? languages.join(", ") : "Bahasa tidak terdeteksi"} · ★ {repo.stars ?? 0} · {repo.own_commits ?? 0} commit</span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                    <DialogFooter>
                        <button type="button" className={secondary} onClick={close}>Batal</button>
                        <button type="button" className="rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50" disabled={pendingRepos.length === 0} onClick={add}>
                            Tambah {pendingRepos.length} proyek
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
