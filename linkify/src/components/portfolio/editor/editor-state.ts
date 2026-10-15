import type { PortfolioContent, PortfolioRecord } from "../types";

export const EDITOR_SECTIONS = [
    { slug: "profil", label: "Profil", description: "Nama dan perkenalan singkat yang pertama dibaca recruiter.", counted: true },
    { slug: "proyek", label: "Proyek", description: "Repository GitHub yang kamu tampilkan, dengan deskripsi singkat.", counted: true },
    { slug: "skill", label: "Skill & sertifikasi", description: "Pisahkan dengan koma. Label terverifikasi ditentukan dari commit.", counted: true },
    { slug: "pengalaman", label: "Pengalaman", description: "Pekerjaan, magang, atau organisasi yang relevan.", counted: true },
    { slug: "pendidikan", label: "Pendidikan", description: "Sekolah atau kampus terakhir.", counted: true },
    { slug: "kontak", label: "Kontak", description: "Hanya kontak yang dinyalakan yang tampil di portfolio publik.", counted: true },
    { slug: "tampilan", label: "Tampilan", description: "Tema dan bahasa portfolio publikmu.", counted: false },
    { slug: "alamat", label: "Alamat & publikasi", description: "Alamat yang kamu bagikan, dan kontrol publikasi.", counted: false },
] as const;

export type SectionSlug = (typeof EDITOR_SECTIONS)[number]["slug"];
export type CountedSlug = "profil" | "proyek" | "skill" | "pengalaman" | "pendidikan" | "kontak";
export type PublishState = "draft" | "up_to_date" | "changed";

export function parseSection(value: string | null | undefined): SectionSlug {
    return EDITOR_SECTIONS.find((section) => section.slug === value)?.slug ?? "profil";
}

const filled = (value?: string | null) => Boolean(value && value.trim());

export function sectionCompleteness(form: PortfolioContent): Record<CountedSlug, boolean> {
    return {
        profil: filled(form.name) && filled(form.headline) && filled(form.bio),
        proyek: form.projects.length > 0,
        skill: form.skills.length > 0,
        pengalaman: !form.sections.experience || form.experience.some((item) => filled(item.role) && filled(item.company)),
        pendidikan: !form.sections.education || form.education.some((item) => filled(item.institution)),
        kontak: Object.values(form.contacts).some((item) => item.enabled && filled(item.value)),
    };
}

/** JSON dengan key terurut; `ai_enhanced` dan nilai undefined diabaikan (bukan bagian isi portfolio). */
export function stableStringify(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([key, item]) => key !== "ai_enhanced" && item !== undefined)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
        return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
    }
    return JSON.stringify(value ?? null);
}

export function publishState(
    record: Pick<PortfolioRecord, "status" | "draft_content" | "published_content">,
    options: { photoChanged: boolean },
): PublishState {
    if (record.status !== "published") return "draft";
    if (options.photoChanged) return "changed";
    return stableStringify(record.draft_content) === stableStringify(record.published_content) ? "up_to_date" : "changed";
}

/** Bagian yang menyebabkan error simpan, dari pesan backend (mis. "Kontak github tidak valid."). */
export function errorSection(message: string | null | undefined): SectionSlug | null {
    return message?.startsWith("Kontak ") ? "kontak" : null;
}

export function contactErrorKey(message: string | null | undefined): string | null {
    return message?.match(/^Kontak (\w+)/)?.[1] ?? null;
}

export function parseList(raw: string, max: number): string[] {
    return raw.split(",").map((item) => item.trim()).filter(Boolean).slice(0, max);
}
