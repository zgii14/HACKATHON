"use client";

import { useState } from "react";
import type { PortfolioContent } from "../../types";
import { EDITOR_SECTIONS, parseList } from "../editor-state";
import { Field, inputClass, SectionHeader, SectionToggle } from "../field";

const meta = EDITOR_SECTIONS.find((section) => section.slug === "skill")!;

type Props = { form: PortfolioContent; onChange: (next: PortfolioContent) => void };

export function SkillsSection({ form, onChange }: Props) {
    const [skillsText, setSkillsText] = useState(form.skills.join(", "));
    const [certText, setCertText] = useState(form.certifications.join(", "));
    return (
        <section>
            <SectionHeader title={meta.label} description={meta.description} />
            <div className="grid gap-8">
                <div className="grid gap-3">
                    <SectionToggle label="Tampilkan skill di portfolio" checked={form.sections.skills} onChange={(checked) => onChange({ ...form, sections: { ...form.sections, skills: checked } })} />
                    <Field label="Skill" hint="Contoh: Python, FastAPI, PostgreSQL">
                        <input className={inputClass} value={skillsText} onChange={(event) => {
                            setSkillsText(event.target.value);
                            onChange({ ...form, skills: parseList(event.target.value, 50) });
                        }} />
                    </Field>
                </div>
                <div className="grid gap-3">
                    <SectionToggle label="Tampilkan sertifikasi di portfolio" checked={form.sections.certifications} onChange={(checked) => onChange({ ...form, sections: { ...form.sections, certifications: checked } })} />
                    <Field label="Sertifikasi" hint="Contoh: AWS Cloud Practitioner, Dicoding Back-End Python">
                        <input className={inputClass} value={certText} onChange={(event) => {
                            setCertText(event.target.value);
                            onChange({ ...form, certifications: parseList(event.target.value, 30) });
                        }} />
                    </Field>
                </div>
            </div>
        </section>
    );
}
