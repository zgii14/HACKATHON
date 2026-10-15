"use client";

import { Switch } from "@/components/ui/switch";
import type { PortfolioContacts, PortfolioContent } from "../../types";
import { contactErrorKey, EDITOR_SECTIONS } from "../editor-state";
import { inputClass, SectionHeader } from "../field";

const meta = EDITOR_SECTIONS.find((section) => section.slug === "kontak")!;

const CONTACTS: Array<{ key: keyof PortfolioContacts; label: string; placeholder: string }> = [
    { key: "github", label: "GitHub", placeholder: "https://github.com/username" },
    { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/username" },
    { key: "email", label: "Email", placeholder: "nama@email.com" },
    { key: "whatsapp", label: "WhatsApp", placeholder: "628123456789" },
    { key: "website", label: "Website", placeholder: "https://namamu.dev" },
];

type Props = { form: PortfolioContent; onChange: (next: PortfolioContent) => void; errorMessage: string | null };

export function ContactsSection({ form, onChange, errorMessage }: Props) {
    const errorKey = contactErrorKey(errorMessage);
    const update = (key: keyof PortfolioContacts, patch: Partial<PortfolioContacts[keyof PortfolioContacts]>) => onChange({
        ...form,
        contacts: { ...form.contacts, [key]: { ...form.contacts[key], ...patch } },
    });
    return (
        <section>
            <SectionHeader title={meta.label} description={meta.description} />
            <div className="grid gap-5">
                {CONTACTS.map(({ key, label, placeholder }) => {
                    const invalid = errorKey === key;
                    return (
                        <div key={key} className="grid gap-1.5">
                            <div className="flex items-center justify-between gap-3">
                                <label htmlFor={`contact-${key}`} className="text-[13px] font-semibold">{label}</label>
                                <label className="flex items-center gap-2 text-meta text-muted-foreground">
                                    <Switch checked={form.contacts[key].enabled} onCheckedChange={(checked) => update(key, { enabled: checked })} aria-label={`Tampilkan ${label}`} />
                                    Tampilkan
                                </label>
                            </div>
                            <input
                                id={`contact-${key}`}
                                aria-invalid={invalid}
                                className={inputClass}
                                placeholder={placeholder}
                                value={form.contacts[key].value}
                                onChange={(event) => update(key, { value: event.target.value })}
                            />
                            {invalid && <span role="alert" className="text-meta text-destructive">{label} tidak valid. Contoh: {placeholder}</span>}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
