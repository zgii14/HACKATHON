# CV-Generator → Workbench Parity

**Date:** 2026-07-30
**Scope:** Samain style `dashboard/cv-generator/page.tsx` (1729 baris) ke pola Workbench (profile/skill-gap/onboarding). **Logika form 0 disentuh** — cuma className, heading, wrapper.

## Target vocabulary (dari ui.tsx + onboarding/profile)
- **Heading** → `<SecTitle title meta />` (text-only, TANPA icon, hairline bawah). Icon heading lama dibuang (parity murni).
- **Input/textarea/select** → `w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:border-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:opacity-50`
- **Container card** (`rounded-2xl/xl border bg-card shadow`) → flat, no card/shadow, section dipisah `pt-8` + SecTitle hairline
- **Chip/tombol** `rounded-lg` → `rounded-md`
- **Callout dashed** `rounded-2xl` → `rounded-md`
- **Animasi** → tiap section dibungkus `<Reveal delay={...}>`
- **Primary button** → `rounded-md bg-primary px-5 py-2.5 text-[12.5px] font-bold text-primary-foreground transition hover:brightness-110 ...` (header sudah mirip)

## Section map (dikonversi ke `Reveal > section > SecTitle > isi`)
1. Nudge lengkapi data (960)
2. Version picker CV (988) — 2 opsi ATS/PDF
3. Data Diri/Bio (1062)
4. Ringkasan Profil (1140)
5. Pendidikan (1155)
6. Pengalaman Kerja (1270)
7. Pengalaman Organisasi (1390)
8. Pelatihan (1510)
9. Keahlian/Skills (1630)
10. Sertifikat (1667)
11. Warning belum sync (1707)

## Import
Tambah `SecTitle, Reveal` (dan util lain bila perlu) dari `@/components/dashboard/ui`.

## Verifikasi
- `tsc --noEmit` → 0 error
- `next build` → sukses
- Cek visual di dev (user)

## Non-goals
- Ubah logika/handler/validasi/generate/save
- Ubah PageHeader (sudah Workbench)
