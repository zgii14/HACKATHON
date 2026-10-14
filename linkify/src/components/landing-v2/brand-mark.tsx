import { cn } from "@/utils";

/** Logo GitHire (ikon cabang + wordmark), mengikuti font halaman. */
export function BrandMark({ className }: { className?: string }) {
    return (
        <span className={cn("inline-flex items-center gap-2 text-foreground", className)}>
            <svg width="22" height="22" viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="10" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <circle cx="10" cy="30" r="4" fill="none" stroke="currentColor" strokeWidth="2.5" />
                <circle cx="29" cy="19" r="5" fill="hsl(var(--primary))" />
                <line x1="10" y1="12" x2="10" y2="26" stroke="currentColor" strokeWidth="2.5" />
                <line x1="13.5" y1="10" x2="25" y2="16.5" stroke="currentColor" strokeWidth="2.5" />
            </svg>
            <span className="text-[17px] font-extrabold tracking-[-0.03em]">
                Git<span className="text-primary">Hire</span>
            </span>
        </span>
    );
}
