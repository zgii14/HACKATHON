"use client";

import type { PortfolioContent, PortfolioExperience } from "../../types";
import { createEmptyExperience } from "../../portfolio-editor-helpers";
import { EDITOR_SECTIONS } from "../editor-state";
import { Field, inputClass, SectionHeader, SectionToggle } from "../field";

const meta = EDITOR_SECTIONS.find((section) => section.slug === "pengalaman")!;

type Props = { form: PortfolioContent; onChange: (next: PortfolioContent) => void; onRemove: (index: number) => void };

export function ExperienceSection({ form, onChange, onRemove }: Props) {
    const update = (index: number, patch: Partial<PortfolioExperience>) => onChange({
        ...form,
        experience: form.experience.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    });
    return (
        <section>
            <SectionHeader title={meta.label} description={meta.description}>
                <SectionToggle label="Tampilkan di portfolio" checked={form.sections.experience} onChange={(checked) => onChange({ ...form, sections: { ...form.sections, experience: checked } })} />
            </SectionHeader>
            <div className="grid gap-4">
                {form.experience.map((item, index) => (
                    <div key={index} className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
                        <Field label="Peran"><input className={inputClass} value={item.role ?? ""} onChange={(event) => update(index, { role: event.target.value })} /></Field>
                        <Field label="Perusahaan atau organisasi"><input className={inputClass} value={item.company ?? ""} onChange={(event) => update(index, { company: event.target.value })} /></Field>
                        <Field label="Periode" hint="Contoh: Jan 2026 - sekarang"><input className={inputClass} value={item.period ?? ""} onChange={(event) => update(index, { period: event.target.value })} /></Field>
                        <div className="flex items-end justify-end">
                            <button type="button" className="text-meta font-semibold text-destructive" onClick={() => onRemove(index)}>Hapus pengalaman</button>
                        </div>
                    </div>
                ))}
                {form.experience.length === 0 && <p className="text-body text-muted-foreground">Belum ada pengalaman. Boleh dikosongkan dan disembunyikan.</p>}
            </div>
            <button type="button" className="mt-4 rounded-lg border border-border px-3 py-2 text-[13px] font-semibold transition hover:bg-muted" onClick={() => onChange({ ...form, experience: [...form.experience, createEmptyExperience()] })}>
                + Tambah pengalaman
            </button>
        </section>
    );
}
