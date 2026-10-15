"use client";

import { SubdomainCard } from "../../subdomain-card";
import type { PortfolioRecord } from "../../types";
import { EDITOR_SECTIONS } from "../editor-state";
import { SectionHeader } from "../field";

const meta = EDITOR_SECTIONS.find((section) => section.slug === "alamat")!;

type Props = { record: PortfolioRecord; suggestion: string | null; busy: boolean; onUnpublish: () => void };

export function AddressSection({ record, suggestion, busy, onUnpublish }: Props) {
    return (
        <section>
            <SectionHeader title={meta.label} description={meta.description} />
            <div className="max-w-md">
                <SubdomainCard portfolio={record} suggestion={suggestion} />
            </div>
            {record.status === "published" && (
                <div className="mt-10 max-w-md rounded-xl border border-destructive/30 p-4">
                    <p className="text-[13px] font-semibold text-destructive">Zona berbahaya</p>
                    <p className="mt-1 text-meta text-muted-foreground">Portfolio tidak bisa dibuka publik sampai kamu mempublikasikannya lagi. Alamatmu tetap milikmu.</p>
                    <button type="button" disabled={busy} onClick={onUnpublish} className="mt-3 rounded-lg border border-destructive/40 px-3 py-2 text-[13px] font-semibold text-destructive transition hover:bg-destructive/5 disabled:opacity-50">
                        Sembunyikan dari publik
                    </button>
                </div>
            )}
        </section>
    );
}
