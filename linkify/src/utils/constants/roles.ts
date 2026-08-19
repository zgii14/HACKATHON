/**
 * Satu-satunya sumber kebenaran soal rute mana milik role mana.
 *
 * Sebelumnya guard role cuma mengecek `pathname === "/dashboard"`, jadi 9 halaman
 * kandidat lain tidak terjaga sama sekali. Setiap halaman baru harus terdaftar di
 * sini — bukan menambah `if` baru di komponen.
 */

export type AppRole = "candidate" | "recruiter";

/** Prefix rute khusus recruiter. */
export const RECRUITER_ROUTE_PREFIXES = ["/dashboard/recruiter"] as const;

/** Rute netral — boleh diakses role mana pun (mis. pengaturan akun). */
export const SHARED_ROUTE_PREFIXES = ["/dashboard/account"] as const;

/** Halaman awal tiap role: tujuan setelah login dan saat salah masuk area. */
export const ROLE_HOME: Record<AppRole, string> = {
    candidate: "/dashboard",
    recruiter: "/dashboard/recruiter/jobs",
};

function matches(pathname: string, prefix: string): boolean {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * Role pemilik sebuah rute. `null` = netral/di luar dasbor (tidak dijaga).
 * Semua `/dashboard/*` yang bukan recruiter dan bukan shared dianggap milik
 * kandidat, sehingga halaman baru otomatis ikut terjaga.
 */
export function routeOwner(pathname: string): AppRole | null {
    if (SHARED_ROUTE_PREFIXES.some((p) => matches(pathname, p))) return null;
    if (RECRUITER_ROUTE_PREFIXES.some((p) => matches(pathname, p))) return "recruiter";
    if (matches(pathname, "/dashboard")) return "candidate";
    return null;
}

/**
 * Tujuan redirect kalau role sedang berada di area yang bukan miliknya.
 * `null` berarti biarkan saja — sudah benar atau rutenya netral.
 */
export function redirectForRole(role: AppRole | null, pathname: string): string | null {
    if (!role) return null;
    const owner = routeOwner(pathname);
    if (owner === null || owner === role) return null;
    return ROLE_HOME[role];
}
