"use client";

import { useEffect, useRef } from "react";
import { SendHorizonal, X } from "lucide-react";

export function ChatInput({
    value,
    onChange,
    onSend,
    onKeyDown,
    disabled,
    placeholder = "Ketik pesan...",
    replyTo,
    onCancelReply,
}: {
    value: string;
    onChange: (v: string) => void;
    onSend: () => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    disabled?: boolean;
    placeholder?: string;
    replyTo?: { body: string } | null;
    onCancelReply?: () => void;
}) {
    const ref = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }, [value]);

    return (
        <div className="border-t border-border bg-card">
            {replyTo && (
                <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3 py-2">
                    <div className="min-w-0 flex-1 border-l-2 border-violet-500 pl-2">
                        <p className="truncate text-xs font-medium text-violet-600">Membalas</p>
                        <p className="truncate text-xs text-muted-foreground">{replyTo.body}</p>
                    </div>
                    <button onClick={onCancelReply} className="ml-2 rounded p-1 hover:bg-muted">
                        <X className="size-3.5" />
                    </button>
                </div>
            )}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!value.trim() || disabled) return;
                    onSend();
                }}
                className="flex items-end gap-2 px-3 py-3"
            >
                <textarea
                    ref={ref}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder={placeholder}
                    rows={1}
                    maxLength={2000}
                    className="max-h-[120px] min-h-[42px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground/60 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
                />
                <button
                    type="submit"
                    disabled={disabled || !value.trim()}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-40 disabled:hover:bg-violet-600"
                    aria-label="Kirim"
                >
                    <SendHorizonal className="size-4" />
                </button>
            </form>
            <p className="px-3 pb-2 font-mono text-[10px] text-muted-foreground">{value.length}/2000 · Enter kirim, Shift+Enter baris baru</p>
        </div>
    );
}
