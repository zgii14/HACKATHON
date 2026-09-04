"use client";

import { Check, FileText, PanelsTopLeft, UserRound } from "lucide-react";
import type { PortfolioContent, PortfolioTheme } from "./types";
import { getThemePreviewData } from "./theme-preview-data";

const themeMeta: Record<PortfolioTheme, { label: string; detail: string }> = {
    editorial: { label: "Editorial", detail: "Cerita dan personal brand" },
    developer: { label: "Developer", detail: "Visual gelap dan project-first" },
    professional: { label: "Professional", detail: "Ringkas dan mudah dipindai" },
};

type ThemePreviewCardsProps = {
    content: PortfolioContent;
    onSelect: (theme: PortfolioTheme) => void;
};

function SelectedMark({ selected }: { selected: boolean }) {
    return selected ? <span className="flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground"><Check className="size-3" aria-hidden="true" /></span> : null;
}

function EditorialPreview({ name, headline, projectName }: ReturnType<typeof getThemePreviewData>) {
    return (
        <div className="h-28 overflow-hidden bg-[#F8F3EA] p-3 text-[#1E1B18]" aria-hidden="true">
            <div className="flex items-center justify-between font-mono text-[6px] uppercase tracking-[0.16em] text-[#B45309]"><span>Selected work</span><span>01</span></div>
            <div className="mt-2 h-px bg-[#1E1B18]/30" />
            <p className="mt-2 truncate font-heading text-[11px] font-semibold leading-[0.95]">{headline}</p>
            <div className="mt-3 flex items-end justify-between gap-2 border-t border-[#1E1B18]/15 pt-2">
                <span className="truncate text-[7px] font-medium">{name}</span>
                <span className="max-w-[48%] truncate font-mono text-[6px] text-[#7C3AED]">{projectName}</span>
            </div>
        </div>
    );
}

function DeveloperPreview({ name, headline, projectName }: ReturnType<typeof getThemePreviewData>) {
    return (
        <div className="h-28 overflow-hidden bg-[#0A0A0B] p-2.5 text-[#F5F5F0]" aria-hidden="true">
            <div className="flex items-center justify-between text-[5px] text-[#6C6C7A]"><span className="flex items-center gap-1"><span className="size-2 rounded-full border border-[#2E2E38] bg-[#141415]" /><span className="max-w-16 truncate">{name}</span></span><span>●</span></div>
            <p className="mt-3 line-clamp-2 font-heading text-[13px] font-medium leading-[0.92] tracking-[-0.04em]">{headline}</p>
            <div className="mt-2 grid grid-cols-2 gap-1">
                <div className="relative h-10 overflow-hidden rounded-[4px] bg-gradient-to-br from-[#9B999B] via-[#35383F] to-[#0A0A0B]"><span className="absolute -bottom-2 left-1/2 size-8 -translate-x-1/2 rounded-full border-[3px] border-[#FF4D2E] bg-[#141415] shadow-[0_0_8px_#FF4D2E]" /></div>
                <div className="flex h-10 flex-col justify-end overflow-hidden rounded-[4px] bg-gradient-to-br from-[#DCDAD9] via-[#555A61] to-[#141415] p-1"><span className="truncate rounded-sm bg-[#141415] px-1 py-0.5 text-[5px]">{projectName}</span></div>
            </div>
        </div>
    );
}

function ProfessionalPreview({ name, headline, experienceRole }: ReturnType<typeof getThemePreviewData>) {
    return (
        <div className="h-28 overflow-hidden bg-[#F8FAFC] p-3 text-[#132238]" aria-hidden="true">
            <div className="flex items-start gap-2"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[7px] font-bold text-white">{name.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="truncate text-[8px] font-bold">{name}</p><p className="mt-0.5 truncate text-[6px] text-[#64748B]">{headline}</p></div></div>
            <div className="mt-3 border-t border-[#D8E0EA] pt-2"><p className="font-mono text-[6px] uppercase tracking-wide text-[#64748B]">Experience</p><div className="mt-1 flex items-center justify-between gap-2"><span className="truncate text-[7px] font-semibold">{experienceRole}</span><span className="h-1 w-8 shrink-0 bg-[#2563EB]/30" /></div></div>
        </div>
    );
}

function ThemeArt({ theme, data }: { theme: PortfolioTheme; data: ReturnType<typeof getThemePreviewData> }) {
    if (theme === "editorial") return <EditorialPreview {...data} />;
    if (theme === "developer") return <DeveloperPreview {...data} />;
    return <ProfessionalPreview {...data} />;
}

const themeIcons = { editorial: FileText, developer: PanelsTopLeft, professional: UserRound } as const;

export function ThemePreviewCards({ content, onSelect }: ThemePreviewCardsProps) {
    const data = getThemePreviewData(content);

    return (
        <div className="mt-3 grid gap-3" role="group" aria-label="Pilih tema portfolio">
            {(Object.keys(themeMeta) as PortfolioTheme[]).map((theme) => {
                const selected = content.theme === theme;
                const Icon = themeIcons[theme];
                const meta = themeMeta[theme];
                return (
                    <button
                        key={theme}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`Pilih tema ${meta.label}: ${meta.detail}`}
                        onClick={() => onSelect(theme)}
                        className={`overflow-hidden border text-left outline-none transition-colors duration-200 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${selected ? "border-primary bg-primary/[0.04] shadow-[inset_3px_0_0_hsl(var(--primary))]" : "border-border hover:border-primary/50"}`}
                    >
                        <ThemeArt theme={theme} data={data} />
                        <span className="flex items-center gap-2 px-3 py-2.5">
                            <Icon className="size-3.5 text-primary" aria-hidden="true" />
                            <span className="min-w-0 flex-1"><span className="block text-xs font-bold">{meta.label}</span><span className="block truncate text-[11px] text-muted-foreground">{meta.detail}</span></span>
                            <SelectedMark selected={selected} />
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
