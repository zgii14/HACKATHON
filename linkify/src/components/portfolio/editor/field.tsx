import { Switch } from "@/components/ui/switch";
import type { ReactNode } from "react";

export const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-body outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 aria-[invalid=true]:border-destructive";

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
    return (
        <label className="grid gap-1.5">
            <span className="text-[13px] font-semibold">{label}</span>
            {children}
            {error ? (
                <span role="alert" className="text-meta text-destructive">{error}</span>
            ) : hint ? (
                <span className="text-meta text-muted-foreground">{hint}</span>
            ) : null}
        </label>
    );
}

export function SectionToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <label className="flex items-center gap-2 text-meta text-muted-foreground">
            <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
            {label}
        </label>
    );
}

export function SectionHeader({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
    return (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div className="max-w-xl">
                <h2 className="text-lg font-bold tracking-[-0.02em]">{title}</h2>
                <p className="mt-1 text-body text-muted-foreground">{description}</p>
            </div>
            {children && <div className="flex flex-col items-end gap-2">{children}</div>}
        </div>
    );
}
