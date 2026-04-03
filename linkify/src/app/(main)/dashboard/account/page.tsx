"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Check,
    CheckCircle2,
    Mail,
    MapPin,
    Pencil,
    Phone,
    User,
    Calendar,
    Home,
    X,
    ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type BioData = {
    bio_full_name: string | null;
    bio_birth_place: string | null;
    bio_birth_date: string | null;
    bio_address: string | null;
    bio_phone: string | null;
};

const FIELDS: { key: keyof BioData; label: string; placeholder: string; icon: React.ElementType }[] = [
    { key: "bio_full_name",   label: "Nama Lengkap",  placeholder: "Muhammad Fauzan",               icon: User },
    { key: "bio_birth_place", label: "Tempat Lahir",  placeholder: "Jakarta",                        icon: MapPin },
    { key: "bio_birth_date",  label: "Tanggal Lahir", placeholder: "12 Agustus 2000",               icon: Calendar },
    { key: "bio_address",     label: "Alamat",        placeholder: "Jl. Merdeka No.1, Jakarta Sel.", icon: Home },
    { key: "bio_phone",       label: "No. Telepon",   placeholder: "081234567890",                   icon: Phone },
];

export default function AccountPage() {
    const { user } = useUser();
    const { withAuth, isLoaded, isSignedIn } = useApi();
    const qc = useQueryClient();
    const authReady = isLoaded && isSignedIn;

    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<BioData>({
        bio_full_name: null, bio_birth_place: null,
        bio_birth_date: null, bio_address: null, bio_phone: null,
    });

    const { data: bio, isLoading } = useQuery({
        queryKey: ["biodata"],
        queryFn: () => withAuth<BioData>("/me/biodata"),
        enabled: authReady,
        staleTime: 10 * 60 * 1000,
    });

    // Sync form saat bio data tersedia
    useEffect(() => {
        if (bio) setForm(bio);
    }, [bio]);

    const saveMutation = useMutation({
        mutationFn: (payload: BioData) =>
            withAuth<BioData>("/me/biodata", {
                method: "PATCH",
                body: JSON.stringify(payload),
            }),
        onSuccess: (data) => {
            qc.setQueryData(["biodata"], data);
            setEditing(false);
            toast.success("Data diri berhasil disimpan!");
        },
        onError: () => toast.error("Gagal menyimpan data diri."),
    });

    const hasData = bio && (bio.bio_full_name || bio.bio_phone || bio.bio_address);
    const filledCount = FIELDS.filter(({ key }) => !!bio?.[key]).length;

    return (
        <div className="space-y-6 max-w-2xl">
            {/* ── Header ── */}
            <div>
                <h1 className="text-2xl font-bold">Kelola Akun</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Informasi akun Clerk dan data diri untuk keperluan lamaran kerja.
                </p>
            </div>

            {/* ── Clerk Account Card ── */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <ShieldCheck className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Akun GitHire</CardTitle>
                            <CardDescription className="text-xs">Dikelola oleh Clerk — login & keamanan</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Avatar + info */}
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
                        {user?.imageUrl ? (
                            <img
                                src={user.imageUrl}
                                alt={user.fullName ?? "User"}
                                className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/20"
                            />
                        ) : (
                            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-7 h-7 text-primary" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">
                                {user?.fullName ?? user?.username ?? "—"}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <Mail className="w-3 h-3 shrink-0" />
                                {user?.primaryEmailAddress?.emailAddress ?? "—"}
                            </p>
                            <Badge
                                variant="outline"
                                className="mt-1.5 text-[10px] px-1.5 py-0 border-emerald-500/40 text-emerald-500 bg-emerald-500/5"
                            >
                                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                Terverifikasi
                            </Badge>
                        </div>
                    </div>

                    {/* Info tambahan */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-3 rounded-lg bg-muted/30 border border-border">
                            <p className="text-muted-foreground mb-0.5">Username</p>
                            <p className="font-medium truncate">{user?.username ?? "—"}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 border border-border">
                            <p className="text-muted-foreground mb-0.5">Bergabung</p>
                            <p className="font-medium">
                                {user?.createdAt
                                    ? new Date(user.createdAt).toLocaleDateString("id-ID", {
                                          day: "numeric",
                                          month: "short",
                                          year: "numeric",
                                      })
                                    : "—"}
                            </p>
                        </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                        Untuk mengubah email, password, atau foto profil, gunakan menu akun di pojok kanan atas.
                    </p>
                </CardContent>
            </Card>

            {/* ── Bio Data Card ── */}
            <Card className={hasData ? "border-primary/20" : "border-dashed border-amber-500/40 bg-amber-500/5"}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base">Data Diri</CardTitle>
                                <CardDescription className="text-xs">
                                    {hasData
                                        ? `${filledCount}/${FIELDS.length} field terisi · Dipakai untuk generate surat lamaran`
                                        : "Lengkapi agar surat lamaran lebih profesional"}
                                </CardDescription>
                            </div>
                        </div>
                        {!editing && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditing(true)}
                                className="shrink-0"
                            >
                                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                                {hasData ? "Edit" : "Isi Sekarang"}
                            </Button>
                        )}
                    </div>
                </CardHeader>

                <CardContent>
                    {/* Loading */}
                    {isLoading && (
                        <div className="space-y-2">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-8 bg-muted/30 animate-pulse rounded-lg" />
                            ))}
                        </div>
                    )}

                    {/* View mode */}
                    {!editing && !isLoading && (
                        hasData ? (
                            <div className="space-y-2">
                                {FIELDS.map(({ key, label, icon: Icon }) =>
                                    bio?.[key] ? (
                                        <div
                                            key={key}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/50"
                                        >
                                            <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                            <span className="text-xs text-muted-foreground min-w-[90px]">{label}</span>
                                            <span className="text-sm font-medium">{bio[key]}</span>
                                        </div>
                                    ) : null
                                )}
                                {/* Fields yang belum diisi */}
                                {FIELDS.filter(({ key }) => !bio?.[key]).length > 0 && (
                                    <p className="text-[11px] text-muted-foreground pt-1">
                                        {FIELDS.filter(({ key }) => !bio?.[key]).length} field belum diisi ·{" "}
                                        <button
                                            onClick={() => setEditing(true)}
                                            className="text-primary hover:underline"
                                        >
                                            Lengkapi sekarang
                                        </button>
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-start gap-3 py-1">
                                <div className="w-1 h-full min-h-[40px] rounded-full bg-amber-500/40 shrink-0" />
                                <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                                    Data diri belum diisi. Surat lamaran yang di-generate hanya akan berisi nama saja
                                    dan kurang profesional. Isi sekarang untuk hasil yang lebih baik.
                                </p>
                            </div>
                        )
                    )}

                    {/* Edit mode */}
                    {editing && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {FIELDS.map(({ key, label, placeholder, icon: Icon }) => (
                                    <div key={key} className={key === "bio_address" ? "sm:col-span-2" : ""}>
                                        <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                            <Icon className="w-3 h-3" />
                                            {label}
                                        </label>
                                        <input
                                            value={form[key] ?? ""}
                                            onChange={(e) =>
                                                setForm((prev) => ({ ...prev, [key]: e.target.value || null }))
                                            }
                                            placeholder={placeholder}
                                            className="w-full text-sm rounded-lg border border-border bg-muted/50 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 pt-1">
                                <Button
                                    size="sm"
                                    onClick={() => saveMutation.mutate(form)}
                                    disabled={saveMutation.isPending}
                                >
                                    {saveMutation.isPending ? (
                                        <>
                                            <span className="w-3.5 h-3.5 mr-1.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-3.5 h-3.5 mr-1.5" />
                                            Simpan Data Diri
                                        </>
                                    )}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                                    <X className="w-3.5 h-3.5 mr-1.5" />
                                    Batal
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Info tip ── */}
            <div className="flex items-start gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
                <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">Data diri digunakan untuk generate surat lamaran.</span>{" "}
                    Nama, tempat/tanggal lahir, alamat, dan nomor telepon akan otomatis terisi di surat lamaran
                    yang dibuat oleh AI. Semakin lengkap, semakin profesional hasilnya.
                </p>
            </div>
        </div>
    );
}
