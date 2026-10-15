"use client";

import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PortfolioContent, PortfolioRecord } from "../types";
import { errorSection, stableStringify, type SectionSlug } from "./editor-state";
import { createSaveQueue } from "./save-queue";

const DEBOUNCE_MS = 1000;

export type AutosaveStatus = {
    state: "idle" | "saving" | "saved" | "error";
    message?: string;
    section: SectionSlug | null;
};

const backupKey = (publicId: string) => `githire:portfolio-draft:${publicId}`;

function readBackup(publicId: string): PortfolioContent | null {
    try {
        const raw = window.localStorage.getItem(backupKey(publicId));
        return raw ? (JSON.parse(raw) as { form: PortfolioContent }).form : null;
    } catch {
        return null;
    }
}

function writeBackup(publicId: string, form: PortfolioContent) {
    try {
        window.localStorage.setItem(backupKey(publicId), JSON.stringify({ form, updatedAt: Date.now() }));
    } catch {
        // Penyimpanan browser penuh atau diblokir: autosave ke server tetap jalan.
    }
}

function clearBackup(publicId: string) {
    try {
        window.localStorage.removeItem(backupKey(publicId));
    } catch {
        // abaikan
    }
}

/**
 * Form lokal + simpan otomatis ke PATCH /me/portfolio. Respons server tidak pernah
 * menimpa form (supaya ketikan tidak hilang); hanya `replace` yang boleh.
 */
export function usePortfolioAutosave(record: PortfolioRecord) {
    const { withAuth } = useApi();
    const queryClient = useQueryClient();
    const publicId = record.public_id;
    const [form, setForm] = useState<PortfolioContent>(() => record.draft_content as PortfolioContent);
    const formRef = useRef(form);
    const [status, setStatus] = useState<AutosaveStatus>({ state: "idle", section: null });
    const [backup, setBackup] = useState<PortfolioContent | null>(null);
    const timer = useRef<number | null>(null);
    const withAuthRef = useRef(withAuth);
    withAuthRef.current = withAuth;

    const queueRef = useRef<ReturnType<typeof createSaveQueue<PortfolioContent>> | null>(null);
    if (!queueRef.current) {
        queueRef.current = createSaveQueue<PortfolioContent>(
            async (value) => {
                const saved = await withAuthRef.current<PortfolioRecord>("/me/portfolio", {
                    method: "PATCH",
                    body: JSON.stringify({ ...value, ai_enhanced: undefined, save_mode: "draft" }),
                });
                queryClient.setQueryData(["portfolio"], saved);
                if (formRef.current === value) clearBackup(publicId);
            },
            (state) => {
                if (state.status === "error") {
                    const message = state.error instanceof ApiError || state.error instanceof Error
                        ? state.error.message
                        : "Koneksi bermasalah.";
                    setStatus({ state: "error", message, section: errorSection(message) });
                } else {
                    setStatus({ state: state.status, section: null });
                }
            },
        );
    }
    const queue = queueRef.current;

    useEffect(() => {
        const saved = readBackup(publicId);
        if (saved && stableStringify(saved) !== stableStringify(record.draft_content)) setBackup(saved);
        else clearBackup(publicId);
        // Hanya saat editor dibuka.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicId]);

    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => {
            if (!queue.hasPending()) return;
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => {
            window.removeEventListener("beforeunload", warn);
            if (timer.current) window.clearTimeout(timer.current);
        };
    }, [queue]);

    const flush = useCallback(() => {
        if (timer.current) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }
        return queue.flush();
    }, [queue]);

    const edit = useCallback((next: PortfolioContent) => {
        formRef.current = next;
        setForm(next);
        writeBackup(publicId, next);
        queue.push(next);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
            timer.current = null;
            void queue.flush();
        }, DEBOUNCE_MS);
    }, [publicId, queue]);

    const replace = useCallback((next: PortfolioContent) => {
        formRef.current = next;
        setForm(next);
        clearBackup(publicId);
    }, [publicId]);

    const latest = useCallback(() => formRef.current, []);

    const restoreBackup = useCallback(() => {
        if (backup) edit(backup);
        setBackup(null);
    }, [backup, edit]);

    const discardBackup = useCallback(() => {
        clearBackup(publicId);
        setBackup(null);
    }, [publicId]);

    return { form, edit, replace, latest, flush, status, backup, restoreBackup, discardBackup };
}
