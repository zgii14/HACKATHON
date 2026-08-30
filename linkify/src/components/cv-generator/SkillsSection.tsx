"use client";

import { Reveal, SecTitle } from "@/components/dashboard/ui";

type Props = {
    softSkills: string;
    hardSkills: string;
    languages: string;
    onSoftSkillsChange: (v: string) => void;
    onHardSkillsChange: (v: string) => void;
    onLanguagesChange: (v: string) => void;
};

export function SkillsSection({
    softSkills,
    hardSkills,
    languages,
    onSoftSkillsChange,
    onHardSkillsChange,
    onLanguagesChange,
}: Props) {
    return (
        <Reveal delay={0.61} className="pt-8">
            <section>
                <SecTitle title="7. Keahlian & Bahasa" />
                <div className="space-y-4 py-4">
                    <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                            Soft Skills (Pisahkan dengan koma)
                        </label>
                        <input
                            value={softSkills}
                            onChange={(e) => onSoftSkillsChange(e.target.value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                            placeholder="Contoh: Manajemen Waktu, Berpikir Kritis, Komunikasi"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                            Hard Skills (Pisahkan dengan koma)
                        </label>
                        <input
                            value={hardSkills}
                            onChange={(e) => onHardSkillsChange(e.target.value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                            placeholder="Contoh: Python, Machine Learning, Figma"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                            Bahasa (Pisahkan dengan koma)
                        </label>
                        <input
                            value={languages}
                            onChange={(e) => onLanguagesChange(e.target.value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                            placeholder="Contoh: Bahasa Indonesia (Native), English (Intermediate)"
                        />
                    </div>
                </div>
            </section>
        </Reveal>
    );
}
