"use client";

import { cn } from "@/utils";
import { motion, useReducedMotion } from "framer-motion";
import { Check, CheckCheck, CornerDownRight } from "lucide-react";
import { format } from "date-fns";

type Props = {
    body: string;
    createdAt: string;
    isMine: boolean;
    status?: string | null;
    replyTo?: { body: string } | null;
    jobTitle?: string | null;
    jobCompany?: string | null;
    isFirstOfGroup?: boolean;
};

export function MessageBubble({ body, createdAt, isMine, status, replyTo, jobTitle, jobCompany, isFirstOfGroup }: Props) {
    const reduced = useReducedMotion();
    const time = format(new Date(createdAt), "HH:mm");

    return (
        <motion.div
            initial={reduced ? false : { opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduced ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }}
            className={cn("flex w-full", isMine ? "justify-end" : "justify-start")}
        >
            <div
                className={cn(
                    "group relative max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm",
                    "border",
                    isMine
                        ? "rounded-br-md border-violet-500/20 bg-violet-600 text-white shadow-violet-500/10"
                        : "rounded-bl-md border-border bg-card text-foreground"
                )}
            >
                {/* Job context header — opsi 2: tampil kalau ada, hanya di bubble pertama grup */}
                {isFirstOfGroup && jobTitle && (
                    <div className={cn("mb-1.5 flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium", isMine ? "bg-white/15 text-white/90" : "bg-violet-500/10 text-violet-600 dark:text-violet-300")}>
                        <CornerDownRight className="size-3 shrink-0" />
                        <span className="truncate">Re: {jobTitle}{jobCompany ? ` · ${jobCompany}` : ""}</span>
                    </div>
                )}
                {/* Reply preview */}
                {replyTo && (
                    <div className={cn("mb-1.5 rounded-md border-l-2 px-2 py-1 text-xs", isMine ? "border-white/40 bg-white/10 text-white/85" : "border-violet-500/30 bg-muted text-muted-foreground")}>
                        <p className="line-clamp-2 leading-snug">{replyTo.body}</p>
                    </div>
                )}
                <p className="whitespace-pre-wrap break-words pr-6">{body}</p>
                <div className={cn("mt-1 flex items-center justify-end gap-1 font-mono text-[10px]", isMine ? "text-white/70" : "text-muted-foreground")}>
                    <span>{time}</span>
                    {isMine && (
                        <span className="ml-0.5">
                            {status === "read" ? (
                                <CheckCheck className="size-3.5 text-sky-200" />
                            ) : status === "sent" ? (
                                <Check className="size-3.5" />
                            ) : (
                                <Check className="size-3.5 opacity-60" />
                            )}
                        </span>
                    )}
                </div>
                {/* tail */}
                <span
                    className={cn(
                        "absolute bottom-0 size-2 rotate-45 border-b border-r bg-inherit",
                        isMine ? "-right-1 border-violet-500/20 bg-violet-600" : "-left-1 border-border bg-card"
                    )}
                    aria-hidden
                />
            </div>
        </motion.div>
    );
}
