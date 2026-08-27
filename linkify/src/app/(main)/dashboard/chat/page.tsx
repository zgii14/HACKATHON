"use client";

import { PageHeader, Reveal } from "@/components/dashboard/ui";
import { ChatPanel } from "@/components/chat/chat-panel";

export default function ChatPage() {
    return (
        <div className="w-full">
            <PageHeader crumb="dasbor / chat" title="Chat" sub="Ngobrol dengan kandidat atau recruiter. Tukaran kontak manual di chat. Free 5/minggu, Premium 100/minggu." />
            <Reveal delay={0.06} className="pt-6">
                <ChatPanel />
            </Reveal>
        </div>
    );
}
