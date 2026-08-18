# react-toastify + SweetAlert2

**Date:** 2026-07-30
**Scope:** Notif "sudah dilakukan" → react-toastify (migrasi dari sonner). Konfirmasi aksi destruktif → SweetAlert2.

## Part A — Migrasi toast (sonner → react-toastify)
- `pnpm add react-toastify`, `pnpm remove sonner`
- `components/ui/toast.tsx` — `<AppToastContainer/>` client, ikut tema next-themes (default dark), `position="top-right"`, warna progress violet. Import CSS react-toastify di sini.
- Ganti `<Toaster/>` sonner di `app/layout.tsx` + `app/auth/layout.tsx` → `<AppToastContainer/>`.
- 16 file: `from "sonner"` → `from "react-toastify"`. API `toast.success/error` identik (cuma success 25× + error 61×, tak ada promise/description/action).
- roadmap: `{ duration: 6000 }` → `{ autoClose: 6000 }`.
- Hapus `components/ui/sonner.tsx`.

## Part B — SweetAlert2 konfirmasi
- `pnpm add sweetalert2`
- `lib/confirm.ts` — `confirmDestructive({title,text,confirmText})` pakai Swal mixin: `theme:'dark'`, `confirmButtonColor: hsl(262.1 83.3% 57.8%)` (violet), cancel netral, radius kecil. Return `boolean`.
- Wiring (3 titik nyata; delete-job tak ada):
  - Batal lamaran — `applications/page.tsx`
  - Hapus roadmap — `my-roadmaps/page.tsx` (ganti confirm inline, buang state `confirmDeleteId`)
  - Reject pelamar — `recruiter/jobs/[id]/page.tsx` (`handleStatusChange(id,"rejected")`)

## Verifikasi
- `tsc --noEmit` 0 error
- `next build` sukses

## Non-goals
- Ubah pesan toast existing, ubah gaya modal lain
