"use client";

import { Check, FileText, Gamepad2, PanelsTopLeft, Smartphone, Sparkles, UserRound } from "lucide-react";
import type { PortfolioContent, PortfolioTheme } from "./types";
import { getThemePreviewData } from "./theme-preview-data";

const themeMeta: Record<PortfolioTheme, { label: string; detail: string }> = {
    editorial: { label: "Editorial", detail: "Cerita dan personal brand" },
    developer: { label: "Developer", detail: "Visual gelap dan project-first" },
    professional: { label: "Professional", detail: "Ringkas dan mudah dipindai" },
    maestro: { label: "Maestro", detail: "Sinematik, editorial, dan immersive" },
    arcade: { label: "Arcade", detail: "Retro hologram ala game" },
    fold: { label: "Fold", detail: "HP lipat, huruf raksasa" },
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

function MaestroPreview({ name, headline, projectName }: ReturnType<typeof getThemePreviewData>) {
    return (
        <div className="relative h-28 overflow-hidden bg-[#DFE5D7] p-3 text-[#151B13]" aria-hidden="true">
            <div className="flex items-center justify-between text-[5px]"><span>✦ {name}</span><span>Work · About</span></div>
            <p className="mx-auto mt-3 max-w-[90%] truncate text-center font-serif text-[14px] italic leading-[0.9] tracking-[-0.04em]">{headline}</p>
            <div className="absolute inset-x-2 bottom-2 h-11 overflow-hidden rounded-t-[10px] bg-[#20281E] px-2.5 py-2 text-[#F2F4D9]">
                <div className="flex items-end justify-between gap-2"><span className="max-w-[70%] truncate font-serif text-[8px] italic">{projectName}</span><span className="rounded-full border border-[#F2F4D9]/30 px-1.5 py-0.5 font-mono text-[4px]">001</span></div>
                <div className="mt-1.5 flex gap-1"><span className="h-4 flex-1 rounded-[3px] bg-[#B1C6C0]" /><span className="h-4 w-6 -rotate-6 rounded-[3px] bg-[#829791]" /><span className="h-4 w-7 rotate-3 rounded-[3px] bg-[#D4DDC8]" /></div>
            </div>
        </div>
    );
}

const ARCADE_HOLO = "linear-gradient(90deg, #5EEAD4 0%, #A78BFA 38%, #F0ABFC 70%, #FDE68A 100%)";

function ArcadePreview({ name, headline, projectName }: ReturnType<typeof getThemePreviewData>) {
    return (
        <div className="relative h-28 overflow-hidden bg-[#0B0D17] p-2.5 text-[#F5F3EE]" style={{ backgroundImage: "radial-gradient(#2A2F55 0.8px, transparent 1px)", backgroundSize: "8px 8px" }} aria-hidden="true">
            <div className="p-[1.5px]" style={{ backgroundImage: ARCADE_HOLO }}>
                <div className="flex h-2 items-center gap-0.5 px-1">{[0, 1, 2].map((item) => <span key={item} className="size-1 border border-[#0B0D17]" />)}</div>
                <div className="bg-[#0B0D17] px-2 py-1.5">
                    <p className="truncate bg-clip-text text-[11px] font-extrabold uppercase leading-none tracking-[-0.03em] text-transparent" style={{ backgroundImage: ARCADE_HOLO }}>{name}</p>
                    <p className="mt-1 truncate font-mono text-[5.5px] text-[#FDE68A]">{headline}</p>
                </div>
            </div>
            <div className="absolute bottom-2 left-2.5 w-[58%] border-[1.5px] border-[#5B3FD9]">
                <div className="flex h-1.5 items-center gap-0.5 bg-[#5B3FD9] px-0.5">{[0, 1, 2].map((item) => <span key={item} className="size-[3px] border-[0.5px] border-[#0B0D17]" />)}</div>
                <p className="truncate bg-[#0B0D17] px-1 py-1 font-mono text-[5px] text-[#5EEAD4]">$ cd {projectName}</p>
            </div>
            <span className="absolute bottom-3 right-3 size-0 border-x-[9px] border-b-[15px] border-x-transparent border-b-[#5B3FD9]/60" />
        </div>
    );
}

function FoldPreview({ name, headline, projectName }: ReturnType<typeof getThemePreviewData>) {
    return (
        <div className="relative flex h-28 items-center justify-center overflow-hidden bg-[#F5F4F2] text-[#111111]" aria-hidden="true">
            <p className="absolute inset-x-0 top-1/2 truncate px-1 text-center text-[34px] font-black uppercase leading-none tracking-[-0.06em] [transform:translateY(-50%)_scaleX(0.62)]">{name}</p>
            <div className="relative h-[92px] w-[64px] rounded-[12px] bg-[#D9D6D0] p-[3px] shadow-[0_8px_16px_-8px_rgba(0,0,0,0.45)]">
                <div className="flex size-full flex-col rounded-[9px] bg-gradient-to-b from-white to-[#CFC9BE] px-1.5 pb-1.5 pt-2">
                    <p className="text-center text-[15px] font-black leading-none tracking-[-0.04em] [transform:scaleX(0.7)]">09:41</p>
                    <p className="mt-0.5 truncate text-center text-[4.5px] font-medium">{headline}</p>
                    <div className="mt-auto flex items-center gap-1 rounded-[4px] bg-white/80 p-[3px]">
                        <span className="size-2 shrink-0 rounded-[2px] bg-[#2F5BD3]" />
                        <span className="truncate text-[4.5px] font-semibold">{projectName}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ThemeArt({ theme, data }: { theme: PortfolioTheme; data: ReturnType<typeof getThemePreviewData> }) {
    if (theme === "editorial") return <EditorialPreview {...data} />;
    if (theme === "developer") return <DeveloperPreview {...data} />;
    if (theme === "maestro") return <MaestroPreview {...data} />;
    if (theme === "arcade") return <ArcadePreview {...data} />;
    if (theme === "fold") return <FoldPreview {...data} />;
    return <ProfessionalPreview {...data} />;
}

const themeIcons = { editorial: FileText, developer: PanelsTopLeft, professional: UserRound, maestro: Sparkles, arcade: Gamepad2, fold: Smartphone } as const;

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
