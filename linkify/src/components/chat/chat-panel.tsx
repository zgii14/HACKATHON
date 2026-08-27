"use client";

import { useApi } from "@/hooks/use-api";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ArrowLeft, MessageCircleMore, Phone, Video } from "lucide-react";
import { ConversationList, type Conv } from "@/components/chat/conversation-list";
import { MessageBubble } from "@/components/chat/message-bubble";
import { ChatInput } from "@/components/chat/chat-input";
import { DateSeparator, shouldShowDateSeparator } from "@/components/chat/date-separator";
import { useAuth } from "@clerk/nextjs";

type Message = {
    id: string;
    sender_id: string;
    body: string;
    status?: string | null;
    reply_to_id?: string | null;
    created_at: string;
};

export function ChatPanel({ onClose }: { onClose?: () => void }) {
    const { withAuth, authReady } = useApi();
    const { userId } = useAuth();
    const qc = useQueryClient();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [search, setSearch] = useState("");
    const [showListOnMobile, setShowListOnMobile] = useState(true);

    const { data: convs } = useQuery({
        queryKey: ["chat-conversations"],
        queryFn: () => withAuth<Conv[]>("/chat/conversations"),
        enabled: authReady,
        refetchInterval: 4000,
    });

    const { data: messages } = useQuery({
        queryKey: ["chat-messages", selectedId],
        queryFn: () => withAuth<Message[]>(`/chat/${selectedId}/messages`),
        enabled: !!selectedId && authReady,
        refetchInterval: 3000,
    });

    const { data: quota } = useQuery({
        queryKey: ["chat-quota"],
        queryFn: () => withAuth<{ limit: number | null; used: number; remaining: number | null; is_premium: boolean }>("/chat/quota"),
        enabled: authReady,
    });

    const selectedConv = useMemo(() => convs?.find((c) => c.id === selectedId) ?? null, [convs, selectedId]);

    // auto-mark read when opening conversation (backend GET already marks, but also call explicit)
    useEffect(() => {
        if (!selectedId || !authReady) return;
        withAuth(`/chat/${selectedId}/read`, { method: "POST" }).catch(() => {});
        qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    }, [selectedId, authReady, withAuth, qc]);

    const scrollRef = useChatScroll([messages?.length, selectedId]);

    const send = useMutation({
        mutationFn: () =>
            withAuth(`/chat/${selectedId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ body: input, reply_to_id: replyTo?.id ?? null }),
            }),
        onSuccess: () => {
            setInput("");
            setReplyTo(null);
            qc.invalidateQueries({ queryKey: ["chat-messages", selectedId] });
            qc.invalidateQueries({ queryKey: ["chat-conversations"] });
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const handleSend = () => {
        if (!input.trim() || !selectedId) return;
        send.mutate();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSelect = (id: string) => {
        setSelectedId(id);
        setShowListOnMobile(false);
    };

    // derived grouped messages with date separators
    const renderedMessages = useMemo(() => {
        if (!messages) return [];
        const out: Array<{ type: "sep"; date: string } | { type: "msg"; msg: Message; showSep: boolean }> = [];
        let prevDate: string | undefined;
        for (const m of messages) {
            const showSep = shouldShowDateSeparator(prevDate, m.created_at);
            if (showSep) out.push({ type: "sep", date: m.created_at });
            out.push({ type: "msg", msg: m, showSep });
            prevDate = m.created_at;
        }
        return out;
    }, [messages]);

    return (
        <div className="flex h-[620px] w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {/* List — desktop always visible, mobile toggle */}
            <div className={`${showListOnMobile ? "flex" : "hidden"} w-full md:flex md:w-[340px]`}>
                <ConversationList
                    convs={convs}
                    selectedId={selectedId}
                    onSelect={handleSelect}
                    quota={quota}
                    search={search}
                    onSearchChange={setSearch}
                />
            </div>

            {/* Thread */}
            <div className={`${!showListOnMobile ? "flex" : "hidden"} flex flex-1 flex-col bg-[#f8f7ff] dark:bg-zinc-900 md:flex`}>
                {!selectedId ? (
                    <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                        <div className="flex size-14 items-center justify-center rounded-full bg-violet-600/10">
                            <MessageCircleMore className="size-7 text-violet-600" />
                        </div>
                        <h4 className="mt-4 text-sm font-semibold">Pilih percakapan</h4>
                        <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                            Pilih chat di kiri untuk mulai ngobrol. Tukaran kontak manual di chat. Free 5/minggu, Premium 100/minggu. Enter untuk kirim, Shift+Enter untuk baris baru.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* header ala WA */}
                        <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2.5">
                            <div className="flex min-w-0 items-center gap-3">
                                <button onClick={() => setShowListOnMobile(true)} className="rounded p-1 hover:bg-muted md:hidden" aria-label="Kembali">
                                    <ArrowLeft className="size-4" />
                                </button>
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">
                                    {(selectedConv?.other_name ?? selectedConv?.other_email ?? "?").slice(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold leading-none">{selectedConv?.other_name ?? selectedConv?.other_email ?? selectedId.slice(0, 8)}</p>
                                    <p className="truncate text-[11px] text-muted-foreground">
                                        {selectedConv?.other_company ?? selectedConv?.job_company ?? "—"}
                                        {selectedConv?.job_title ? ` · Re: ${selectedConv.job_title}` : ""}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Call">
                                    <Phone className="size-4" />
                                </button>
                                <button className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Video">
                                    <Video className="size-4" />
                                </button>
                                {onClose && (
                                    <button onClick={onClose} className="ml-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
                                        Tutup
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* messages — wallpaper subtle dots */}
                        <div
                            ref={scrollRef}
                            className="flex-1 space-y-1 overflow-y-auto p-4"
                            style={{
                                backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--border)) 1px, transparent 0)`,
                                backgroundSize: "24px 24px",
                                backgroundPosition: "-9px -9px",
                            }}
                        >
                            {renderedMessages.map((item, idx) => {
                                if (item.type === "sep") return <DateSeparator key={`sep-${idx}-${item.date}`} date={item.date} />;
                                const m = item.msg;
                                // robust: prefer userId, fallback to other_user_id compare
                                const isMine = selectedConv ? m.sender_id !== selectedConv.other_user_id : !!userId && m.sender_id === userId;
                                const replyRef = m.reply_to_id ? messages?.find((x) => x.id === m.reply_to_id) ?? null : null;
                                return (
                                    <div key={m.id} onDoubleClick={() => setReplyTo(m)} title="Double click untuk balas">
                                        <MessageBubble
                                            body={m.body}
                                            createdAt={m.created_at}
                                            isMine={isMine}
                                            status={m.status}
                                            replyTo={replyRef ? { body: replyRef.body } : null}
                                            jobTitle={selectedConv?.job_title}
                                            jobCompany={selectedConv?.job_company}
                                            isFirstOfGroup={idx === 0 || renderedMessages[idx - 1]?.type === "sep"}
                                        />
                                    </div>
                                );
                            })}
                            {messages?.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">Belum ada pesan. Sapa dulu! 👋</p>}
                        </div>

                        <ChatInput
                            value={input}
                            onChange={setInput}
                            onSend={handleSend}
                            onKeyDown={handleKeyDown}
                            disabled={send.isPending}
                            replyTo={replyTo ? { body: replyTo.body } : null}
                            onCancelReply={() => setReplyTo(null)}
                            placeholder={selectedConv?.other_name ? `Balas ke ${selectedConv.other_name}...` : "Ketik pesan..."}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
