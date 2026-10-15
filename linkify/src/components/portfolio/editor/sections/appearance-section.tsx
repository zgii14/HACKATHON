"use client";

import { cn } from "@/utils";
import { ThemePreviewCards } from "../../theme-preview-cards";
import type { PortfolioContent, PortfolioLanguage } from "../../types";
import { EDITOR_SECTIONS } from "../editor-state";
import { SectionHeader } from "../field";

const meta = EDITOR_SECTIONS.find((section) => section.slug === "tampilan")!;
const LANGUAGES: Array<{ value: PortfolioLanguage; label: string }> = [
    { value: "id", label: "Bahasa Indonesia" },
    { value: "en", label: "English" },
];

type Props = { form: PortfolioContent; onChange: (next: PortfolioContent) => void };

export function AppearanceSection({ form, onChange }: Props) {
    return (
        <section>
            <SectionHeader title={meta.label} description={meta.description} />
            <div className="grid gap-8">
                <div>
                    <p className="text-[13px] font-semibold">Tema</p>
                    <ThemePreviewCards content={form} onSelect={(theme) => onChange({ ...form, theme })} />
                </div>
                <div>
                    <p className="text-[13px] font-semibold">Bahasa label portfolio</p>
                    <div role="radiogroup" aria-label="Bahasa portfolio" className="mt-2 inline-flex rounded-full border border-border bg-muted/50 p-1">
                        {LANGUAGES.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                role="radio"
                                aria-checked={form.language === item.value}
                                onClick={() => onChange({ ...form, language: item.value })}
                                className={cn("rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors", form.language === item.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
