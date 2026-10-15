"use client";

import type { PortfolioContent } from "../../types";
import { getPhotoUploadCopy } from "../../portfolio-editor-helpers";
import { EDITOR_SECTIONS } from "../editor-state";
import { Field, inputClass, SectionHeader } from "../field";

const meta = EDITOR_SECTIONS.find((section) => section.slug === "profil")!;

type Props = {
    form: PortfolioContent;
    onChange: (next: PortfolioContent) => void;
    hasPhoto: boolean;
    photoBusy: boolean;
    onUploadPhoto: (file: File) => void;
    onRemovePhoto: () => void;
};

export function ProfileSection({ form, onChange, hasPhoto, photoBusy, onUploadPhoto, onRemovePhoto }: Props) {
    const photo = getPhotoUploadCopy(hasPhoto);
    return (
        <section>
            <SectionHeader title={meta.label} description={meta.description} />
            <div className="grid gap-5">
                <Field label="Nama">
                    <input className={inputClass} value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} />
                </Field>
                <Field label="Headline" hint="Satu kalimat, mis. Backend Engineer, Python dan FastAPI.">
                    <input className={inputClass} value={form.headline} onChange={(event) => onChange({ ...form, headline: event.target.value })} />
                </Field>
                <Field label="Tentang saya">
                    <textarea rows={6} className={`${inputClass} resize-y`} value={form.bio} onChange={(event) => onChange({ ...form, bio: event.target.value })} />
                </Field>
                <div className="grid gap-2">
                    <Field label={photo.label} hint={photo.help}>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={photoBusy}
                            className="text-body file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-[13px] file:font-semibold"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) onUploadPhoto(file);
                                event.target.value = "";
                            }}
                        />
                    </Field>
                    {hasPhoto && (
                        <button type="button" disabled={photoBusy} onClick={onRemovePhoto} className="justify-self-start text-meta font-semibold text-destructive disabled:opacity-50">
                            Hapus foto
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}
