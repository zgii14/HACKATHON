"use client";

// Hallmark · genre: modern-minimal · macrostructure: Workbench (app-surface) · theme: GitHire violet (locked)

import { PageHeader, Reveal, SecTitle } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type BioData = {
    bio_full_name: string | null;
    bio_birth_place: string | null;
    bio_birth_date: string | null;
    bio_address: string | null;
    bio_phone: string | null;
};

const FIELDS: { key: keyof BioData; label: string; placeholder: string; wide?: boolean }[] = [
    { key: "bio_full_name", label: "Nama lengkap", placeholder: "Muhammad Fauzan" },
    { key: "bio_birth_place", label: "Tempat lahir", placeholder: "Jakarta" },
    { key: "bio_birth_date", label: "Tanggal lahir", placeholder: "12 Agustus 2000" },
    { key: "bio_phone", label: "No. telepon", placeholder: "081234567890" },
    { key: "bio_address", label: "Alamat", placeholder: "Jl. Merdeka No.1, Jakarta Selatan", wide: true },
];

export default function AccountPage() {
    const { user } = useUser();
    const { withAuth, authReady } = useApi();
    const qc = useQueryClient();

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<BioData>({
        bio_full_name: null, bio_birth_place: null, bio_birth_date: null, bio_address: null, bio_phone: null,
    });

    const { data: bio, isLoading } = useQuery({
        queryKey: ["biodata"],
        queryFn: () => withAuth<BioData>("/me/biodata"),
        enabled: authReady,
        staleTime: 10 * 60 * 1000,
    });

    useEffect(() => {
        if (bio) setForm(bio);
    }, [bio]);

    const saveMutation = useMutation({
        mutationFn: (payload: BioData) => withAuth<BioData>("/me/biodata", { method: "PATCH", body: JSON.stringify(payload) }),
        onSuccess: (data) => {
            qc.setQueryData(["biodata"], data);
            setEditing(false);
            toast.success("Data diri berhasil disimpan!");
        },
        onError: () => toast.error("Gagal menyimpan data diri."),
    });

    const hasData = bio && (bio.bio_full_name || bio.bio_phone || bio.bio_address);
    const filledCount = FIELDS.filter(({ key }) => !!bio?.[key]).length;
    const joined = user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
        : "—";

    return (
        <div className="w-full">
            <PageHeader
                crumb="dasbor / kelola akun"
                title="Kelola akun"
                sub="Informasi akun dan data diri untuk keperluan lamaran kerja."
            />

            {/* Akun (read-only, dikelola Clerk) */}
            <Reveal delay={0.05} className="pt-6">
                <SecTitle title="Akun GitHire" meta="dikelola Clerk" />
                <div className="flex items-center gap-4 py-4">
                    {user?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.imageUrl} alt={user.fullName ?? "User"} className="size-14 rounded-full object-cover ring-1 ring-border" />
                    ) : (
                        <div className="grid size-14 place-items-center rounded-full bg-muted font-mono text-lg font-semibold">
                            {(user?.fullName ?? user?.username ?? "U").charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[15px] font-semibold">
                            {user?.fullName ?? user?.username ?? "—"}
                            <span className="rounded-[3px] border border-success/40 px-1.5 py-px font-mono text-[10px] font-semibold text-success">VERIFIED</span>
                        </p>
                        <p className="mt-0.5 font-mono text-[12px] text-muted-foreground">{user?.primaryEmailAddress?.emailAddress ?? "—"}</p>
                    </div>
                </div>
                <dl className="grid grid-cols-2 border-y border-border">
                    <div className="px-5 py-3">
                        <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Username</dt>
                        <dd className="mt-0.5 truncate text-[13.5px] font-medium">{user?.username ?? "—"}</dd>
                    </div>
                    <div className="border-l border-border px-5 py-3">
                        <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">Bergabung</dt>
                        <dd className="mt-0.5 font-mono text-[13.5px] tabular-nums">{joined}</dd>
                    </div>
                </dl>
                <p className="mt-2.5 text-[11.5px] text-muted-foreground">
                    Untuk mengubah email, password, atau foto profil, gunakan menu akun di pojok kanan bawah sidebar.
                </p>
            </Reveal>

            {/* Data diri (editable) */}
            <Reveal delay={0.12} className="pt-9">
                <SecTitle
                    title="Data diri"
                    meta={
                        !editing ? (
                            <button
                                type="button"
                                onClick={() => setEditing(true)}
                                className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {hasData ? "edit" : "isi sekarang"} →
                            </button>
                        ) : (
                            `${filledCount}/${FIELDS.length} terisi`
                        )
                    }
                />

                {isLoading ? (
                    <div className="space-y-2 pt-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-9 animate-pulse rounded bg-muted/30" />
                        ))}
                    </div>
                ) : editing ? (
                    <div className="pt-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {FIELDS.map(({ key, label, placeholder, wide }) => (
                                <div key={key} className={wide ? "sm:col-span-2" : ""}>
                                    <label className="mb-1.5 block font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{label}</label>
                                    <input
                                        value={form[key] ?? ""}
                                        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value || null }))}
                                        placeholder={placeholder}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 flex items-center gap-4">
                            <button
                                onClick={() => saveMutation.mutate(form)}
                                disabled={saveMutation.isPending}
                                className="rounded-md bg-primary px-4 py-2 text-[12.5px] font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            >
                                {saveMutation.isPending ? "Menyimpan…" : "Simpan data diri"}
                            </button>
                            <button
                                onClick={() => setEditing(false)}
                                className="text-[12.5px] font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                ) : hasData ? (
                    <dl className="pt-1">
                        {FIELDS.filter(({ key }) => !!bio?.[key]).map(({ key, label }) => (
                            <div key={key} className="flex items-baseline gap-4 border-b border-border/60 py-3">
                                <dt className="w-32 shrink-0 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{label}</dt>
                                <dd className="text-[13.5px] font-medium">{bio?.[key]}</dd>
                            </div>
                        ))}
                        {FIELDS.filter(({ key }) => !bio?.[key]).length > 0 && (
                            <p className="pt-3 text-[11.5px] text-muted-foreground">
                                {FIELDS.filter(({ key }) => !bio?.[key]).length} field belum diisi ·{" "}
                                <button onClick={() => setEditing(true)} className="font-semibold text-primary hover:underline">
                                    lengkapi sekarang
                                </button>
                            </p>
                        )}
                    </dl>
                ) : (
                    <p className="mt-4 border-l-2 border-warning/50 pl-3 text-[12.5px] leading-relaxed text-muted-foreground">
                        Data diri belum diisi. Surat lamaran yang di-generate hanya akan berisi nama saja. Isi sekarang untuk hasil yang lebih profesional.
                    </p>
                )}
            </Reveal>

            <Reveal delay={0.19} className="pt-9">
                <p className="border-l-2 border-primary bg-primary/[0.04] px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
                    <span className="font-semibold text-foreground">Data diri dipakai untuk generate surat lamaran.</span> Nama, tempat/tanggal lahir,
                    alamat, dan nomor telepon otomatis terisi di surat yang dibuat AI. Semakin lengkap, semakin profesional hasilnya.
                </p>
            </Reveal>
        </div>
    );
}
