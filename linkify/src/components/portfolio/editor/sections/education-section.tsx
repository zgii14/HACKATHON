"use client";

import type { PortfolioContent, PortfolioEducation } from "../../types";
import { createEmptyEducation } from "../../portfolio-editor-helpers";
import { EDITOR_SECTIONS } from "../editor-state";
import { Field, inputClass, SectionHeader, SectionToggle } from "../field";

const meta = EDITOR_SECTIONS.find((section) => section.slug === "pendidikan")!;

type Props = { form: PortfolioContent; onChange: (next: PortfolioContent) => void; onRemove: (index: number) => void };

export function EducationSection({ form, onChange, onRemove }: Props) {
    const update = (index: number, patch: Partial<PortfolioEducation>) => onChange({
        ...form,
        education: form.education.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    });
    return (
        <section>
            <SectionHeader title={meta.label} description={meta.description}>
                <SectionToggle label="Tampilkan di portfolio" checked={form.sections.education} onChange={(checked) => onChange({ ...form, sections: { ...form.sections, education: checked } })} />
            </SectionHeader>
            <div className="grid gap-4">
                {form.education.map((item, index) => (
                    <div key={index} className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
                        <Field label="Institusi"><input className={inputClass} value={item.institution ?? ""} onChange={(event) => update(index, { institution: event.target.value })} /></Field>
                        <Field label="Gelar atau jenjang"><input className={inputClass} value={item.degree ?? ""} onChange={(event) => update(index, { degree: event.target.value })} /></Field>
                        <Field label="Jurusan"><input className={inputClass} value={item.major ?? ""} onChange={(event) => update(index, { major: event.target.value })} /></Field>
                        <div className="flex items-end justify-end">
                            <button type="button" className="text-meta font-semibold text-destructive" onClick={() => onRemove(index)}>Hapus pendidikan</button>
                        </div>
                    </div>
                ))}
                {form.education.length === 0 && <p className="text-body text-muted-foreground">Belum ada pendidikan.</p>}
            </div>
            <button type="button" className="mt-4 rounded-lg border border-border px-3 py-2 text-[13px] font-semibold transition hover:bg-muted" onClick={() => onChange({ ...form, education: [...form.education, createEmptyEducation()] })}>
                + Tambah pendidikan
            </button>
        </section>
    );
}
