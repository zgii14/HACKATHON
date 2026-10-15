"use client";

import { cn } from "@/utils";
import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { EDITOR_SECTIONS, type CountedSlug, type SectionSlug } from "./editor-state";

type Props = {
    active: SectionSlug;
    completeness: Record<CountedSlug, boolean>;
    errorSection: SectionSlug | null;
    onSelect: (slug: SectionSlug) => void;
};

export function EditorNav({ active, completeness, errorSection, onSelect }: Props) {
    const done = Object.values(completeness).filter(Boolean).length;
    const activeRef = useRef<HTMLButtonElement | null>(null);
    // Di HP menu berupa tab geser: pastikan tab aktif terlihat.
    useEffect(() => {
        activeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }, [active]);
    return (
        // top: header dashboard (3.5rem) + bar editor.
        <nav aria-label="Bagian portfolio" className="min-w-0 lg:sticky lg:top-40 lg:self-start">
            <p className="hidden px-3 text-meta text-muted-foreground lg:block">{done} dari 6 lengkap</p>
            <ul className="flex snap-x gap-1 overflow-x-auto pb-1 [scrollbar-width:none] lg:mt-3 lg:flex-col lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
                {EDITOR_SECTIONS.map((section) => {
                    const isActive = section.slug === active;
                    const isError = errorSection === section.slug;
                    const isDone = section.counted && completeness[section.slug as CountedSlug];
                    return (
                        <li key={section.slug} className={cn("shrink-0 snap-start", section.slug === "tampilan" && "lg:mt-3 lg:border-t lg:border-border lg:pt-3")}>
                            <button
                                ref={isActive ? activeRef : undefined}
                                type="button"
                                aria-current={isActive ? "page" : undefined}
                                onClick={() => onSelect(section.slug)}
                                className={cn(
                                    "flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-[14px] transition-colors",
                                    isActive ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                            >
                                <span>{section.label}</span>
                                {isError ? (
                                    <span className="font-bold text-destructive" aria-label="Ada kesalahan">!</span>
                                ) : section.counted ? (
                                    isDone ? (
                                        <Check className="size-4 text-emerald-600" aria-label="Lengkap" />
                                    ) : (
                                        <span className="size-1.5 rounded-full bg-amber-500" aria-label="Perlu diisi" />
                                    )
                                ) : null}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
