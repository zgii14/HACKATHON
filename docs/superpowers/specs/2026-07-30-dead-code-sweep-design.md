# Dead-Code Sweep — GitHire

**Date:** 2026-07-30
**Scope:** Buang dead code / unused imports. Perilaku 0 berubah. Proyek live — jaga jangan break.

## Aksi
### Backend (pyflakes)
- `app/models.py` — buang import `Float`
- `app/routers/profiles.py` — buang import `timedelta`
- `app/routers/me.py` — buang import `skill_gap`, buang var mati `gh_strong_norm`

### Frontend (tsc --noUnusedLocals/Parameters, 38 temuan)
- Buang unused imports (~28 icon/komponen)
- Buang local/fungsi mati: `downloadATSResume`, `handleClose`/`dragged` (modal), var mati di `middleware.ts` (tetap no-op bypass)
- Prefix `_` param gak kepake di komponen vendored (calendar/icons/blur-image/providers)
- Buang 3 `console.log` debug (signin-form, signup-form)

### Hapus
- `linkify/src/app/apple/` — halaman landing eksperimen gaya Apple, tak terpakai, untracked

## Verifikasi (wajib lolos)
- `npx tsc --noEmit` (config normal) → 0 error
- `pnpm build` → sukses
- backend `python -m pyflakes app` → bersih; `py_compile` OK

## Non-goals
- Restrukturisasi arsitektur, pecah file monster (fase lain)
