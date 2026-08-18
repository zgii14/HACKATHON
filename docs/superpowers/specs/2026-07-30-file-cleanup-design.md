# File Cleanup — GitHire Repo

**Date:** 2026-07-30
**Scope:** Bersih-bersih file sampah di root & backend. TIDAK menyentuh kode di `backend/app` atau `linkify/src`.

## Tujuan
Root repo penuh artefak lepas (scratch, temp, backup, deliverable, deploy copy basi). Rapihkan tanpa mengubah kode aplikasi.

## Aksi

### TIER A — Hapus dari disk (untracked junk)
- `backend/scratch_check_cv.py`, `backend/scratch_seed_cv.py`, `backend/fix_role.py`
- `backend/body.json`, `backend/scrape_result.txt`
- `githire_backup.sql` (0 byte)
- `_pptx_temp/`, `_pptx_temp2/`
- `hallmark-temp/` (31M), `hallmark-demo/`
- `ui-audit-preview.html`, `rekomendasi.png`
- `githire-backend/` (copy deploy Hugging Face, basi — Railway sekarang)
- `__pycache__/`, `.pytest_cache/`

### TIER B — `git rm` + commit (tracked)
- `backend/test_github_client.py`, `backend/test_scraper.py`, `backend/test_selenium.py` (test scraper/selenium liar, bukan suite)
- `start-githire.bat` → KEEP

### TIER C — Keputusan
- `githire_real_backup.sql` (208K, data asli) → **KEEP**
- Deliverable → **pindah ke `dokumentasi/`**: `Bukti_Produk_Digital_GitHire.docx`, `Laporan_Pengujian_Validasi_GitHire.docx`, `Octo Bridge ...pdf`, `RZZ part 1 cek 1.pptx`, `Cv muhammad rozagi.docx`, `githire_logos.html`

### .gitignore
Tambah pola: `scratch_*.py`, `*_backup.sql`, `hallmark-*/`, `githire-backend/`, `ui-audit-preview.html`, `*.pptx`, `.pytest_cache/`

## Non-goals
- Refactor kode aplikasi (fase terpisah nanti)
- Sentuh `linkify/`, `backend/app/`

## Risiko
- Hapus untracked = permanen (gak bisa di-recover dari git). Sudah dikonfirmasi user.
