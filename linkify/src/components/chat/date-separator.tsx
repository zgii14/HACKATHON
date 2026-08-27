"use client";

import { format, isToday, isYesterday } from "date-fns";
import { id } from "date-fns/locale";

export function DateSeparator({ date }: { date: string }) {
    const d = new Date(date);
    let label = format(d, "d MMM yyyy", { locale: id });
    if (isToday(d)) label = "Hari ini";
    else if (isYesterday(d)) label = "Kemarin";
    return (
        <div className="flex justify-center py-3">
            <span className="rounded-full border border-border bg-muted px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground shadow-sm">
                {label}
            </span>
        </div>
    );
}

export function shouldShowDateSeparator(prev?: string, curr?: string) {
    if (!curr) return false;
    if (!prev) return true;
    const a = new Date(prev);
    const b = new Date(curr);
    return a.toDateString() !== b.toDateString();
}
