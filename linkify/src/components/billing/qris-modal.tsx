"use client";

import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check } from "lucide-react";

type Props = {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    amount: number;
    plan: "talent" | "managed";
    isPending?: boolean;
};

export function QrisModal({ open, onClose, onConfirm, amount, plan, isPending }: Props) {
    const [expiresAt, setExpiresAt] = useState(() => Date.now() + 5 * 60 * 1000);
    const [now, setNow] = useState(Date.now());
    const [copied, setCopied] = useState(false);
    // FE only — generate sekali per buka, jangan tiap detik
    const orderId = useMemo(() => {
        if (!open) return "";
        return `GH-${plan.toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    const qrString = useMemo(() => {
        if (!orderId) return "";
        return `00020101021226660014ID.CO.QRIS.WWW01189360000100000000000202${plan}5204${amount}5802ID5913GITHIRE${orderId}6304`;
    }, [orderId, plan, amount]);

    useEffect(() => {
        if (open) {
            setExpiresAt(Date.now() + 5 * 60 * 1000);
            setNow(Date.now());
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [open]);

    if (!open) return null;

    const remaining = Math.max(0, expiresAt - now);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    const expired = remaining === 0;

    const copy = async () => {
        await navigator.clipboard.writeText(qrString);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
                <button onClick={onClose} className="absolute right-3 top-3 rounded p-1.5 hover:bg-muted">
                    <X className="size-4" />
                </button>
                <h3 className="text-sm font-bold">Bayar via QRIS (Simulasi)</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                    {plan === "talent" ? "Talent Search · Rp 499.000 / bulan" : "Managed · Rp 2.000.000 / rekrut"} · FE only, tidak pakai gateway
                </p>

                <div className="mt-5 grid gap-5 md:grid-cols-[200px_1fr]">
                    <div className="flex flex-col items-center">
                        <div className="rounded-xl border border-border bg-white p-3">
                            <QRCodeSVG value={qrString} size={170} level="M" />
                        </div>
                        <p className={`mt-2 font-mono text-xs font-bold ${expired ? "text-rose-600" : "text-violet-600"}`}>
                            {expired ? "QR Kedaluwarsa" : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">{expired ? "Buat ulang QR" : "Berlaku 5 menit"}</p>
                    </div>
                    <div className="space-y-3">
                        <div className="rounded-lg border border-border bg-muted/30 p-3">
                            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Order ID</p>
                            <p className="mt-1 font-mono text-xs font-medium">{orderId}</p>
                            <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Nominal</p>
                            <p className="text-sm font-bold">Rp {amount.toLocaleString("id-ID")}</p>
                        </div>
                        <div className="flex gap-2">
                            <code className="flex-1 truncate rounded border border-border bg-background px-2 py-1.5 font-mono text-[10px]">{qrString.slice(0, 28)}...</code>
                            <button onClick={copy} className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs hover:bg-muted">
                                {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                                {copied ? "Disalin" : "Salin"}
                            </button>
                        </div>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">Simulasi: scan QR pakai e-wallet apapun di demo, lalu klik “Sudah Bayar” di bawah. Tidak ada potongan saldo beneran.</p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                    <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-xs font-bold hover:bg-muted">
                        Batal
                    </button>
                    <button onClick={onConfirm} disabled={expired || isPending} className="rounded-full bg-violet-600 px-5 py-2 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-40">
                        {isPending ? "Memproses..." : "Sudah Bayar (Simulasi) — Aktifkan"}
                    </button>
                </div>
            </div>
        </div>
    );
}
