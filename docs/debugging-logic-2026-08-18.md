# Debugging dan Logic Audit

Tanggal: 2026-08-18
Scope: backend FastAPI dan frontend Next.js

## Temuan Utama

1. User non-whitelist dapat memilih role recruiter dan masuk ke fitur recruiter.
2. Demo job membuat seed job statis dilewati pada database fresh.
3. Backend gagal import jika `GEMINI_API_KEY` kosong.
4. Empty required skills menghasilkan match score 100 persen.
5. Status kandidat dapat mencoba transition yang ditolak backend.
6. Roadmap apply melewati gate apply di halaman detail job.
7. Upload multipart dan download blob tidak konsisten menangani token expired.
8. Screening fallback mengembalikan skor palsu dan output AI tidak divalidasi.
9. CV parser gagal dapat menyimpan structured CV kosong.
10. Search kandidat menerima wildcard SQL LIKE mentah.

Review ulang menemukan bug kritis pada parser screening: helper validasi sempat
menyisip di tengah `_extract_json_data`, membuat `json.loads` unreachable.
Parser sudah dipulihkan dan regression test parser ditambahkan.

## Perubahan Backend

- Tambah `RECRUITER_EMAILS` ke settings dan `.env.example`.
- Tambah allowlist recruiter berbasis email.
- Paksa effective role non-whitelist menjadi candidate pada setiap request.
- Tolak pemilihan recruiter untuk email non-whitelist.
- Seed static jobs memakai judul seed sebagai idempotency marker, bukan total jumlah job.
- Gemini client tidak lagi membuat startup gagal saat API key kosong; error terjadi saat endpoint AI dipanggil.
- Tambah validasi screening score, recommendation, reasoning, strengths, dan weaknesses.
- Validasi cache screening sebelum dikembalikan; cache invalid diproses ulang.
- Ubah screening fallback menjadi `score_source: fallback` dengan skor deterministic.
- Tambah validasi structured CV sebelum profil di-commit.
- Empty required skills sekarang menghasilkan score `0.0`.
- Kandidat hanya dapat confirm status dari `interview` ke `interview_confirmed`; status confirmed tetap idempotent.
- Escape wildcard `%`, `_`, dan backslash pada recruiter search.
- Lengkapi metadata salary, education, experience, dan work type pada bookmark response.

## Perubahan Frontend

- Protect route `/dashboard` dengan Clerk middleware.
- Multipart upload memakai `useApi().withAuth`, tanpa memaksa `Content-Type: application/json`.
- Blob request retry sekali dengan token Clerk fresh saat menerima 401.
- Roadmap CTA mengarah ke detail job agar apply gate dan external redirect memakai satu flow.
- Candidate status menu hanya muncul untuk aplikasi berstatus `interview`.
- Remote flag diturunkan langsung dari `workType`, jadi tidak stale saat pindah ke Hybrid atau On-site.
- Dashboard interview count mencakup `interview_confirmed`.
- Auth callback memindahkan redirect ke `useEffect` dan menampilkan error state.
- Warning dependency pada loading message roadmap diperbaiki.

## Regression Tests

Test baru: `backend/test_logic_regressions.py`

Cases:

- recruiter hanya dari email allowlist
- demo job tidak memblokir static seed
- empty required skills tidak menjadi perfect match
- transition interview valid dan transition applied ditolak
- structured CV kosong dianggap tidak usable
- screening score wajib numeric dan berada pada range 0 sampai 100
- wildcard search di-escape
- parser screening mengekstrak object JSON dari respons Gemini

Commands:

```text
cd backend
python -m unittest test_logic_regressions -v
python -m py_compile app/main.py app/auth.py app/routers/applications.py app/routers/me.py app/routers/profiles.py app/routers/recruiter.py app/services/gemini_service.py app/services/matching.py app/seed.py

cd linkify
npx tsc --noEmit
pnpm lint
pnpm build
```

Hasil saat audit:

- Backend unittest: 8 passed.
- Backend import tanpa Gemini key: passed.
- TypeScript: passed.
- Next build: passed.
- Lint: passed dengan warning lama pada `animated-background.tsx` dan `particles.tsx`.

## Catatan Deployment

- Set `RECRUITER_EMAILS` di environment backend production.
- Jangan edit `githire-backend/` langsung sesuai aturan repository.
- External job tetap dicatat lokal lalu membuka `apply_url`; ini dipertahankan sebagai behavior tracking.
- GitHub repository pagination di atas 100 repo belum diubah.
- Live E2E dengan Clerk, PostgreSQL production, dan GitHub belum dijalankan karena credential/runtime production tidak tersedia.
