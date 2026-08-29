"use client";

import { PageHeader, Reveal } from "@/components/dashboard/ui";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useApi } from "@/hooks/use-api";
import { useQuery } from "@tanstack/react-query";

export default function ChatPage() {
    const { withAuth, authReady } = useApi();
    const { data: profile } = useQuery<{ role: string | null } | null>({
        queryKey: ["profile"],
        queryFn: () => withAuth("/me/profile"),
        enabled: authReady,
    });
    const isRecruiter = profile?.role === "recruiter";
    return (
        <div className="w-full">
            <PageHeader
                crumb="dasbor / chat"
                title="Chat"
                sub={isRecruiter ? "Ngobrol dengan kandidat. Tukaran kontak manual di chat. Free 5/minggu, Premium 100/minggu." : "Ngobrol dengan recruiter. Tukaran kontak manual di chat."}
            />
            <Reveal delay={0.06} className="pt-6">
                <ChatPanel />
            </Reveal>
        </div>
    );
}
