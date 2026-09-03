# AI Portfolio Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kandidat dapat membuat, mengedit, publish, update, dan unpublish website portfolio non-indexed pada URL unik yang stabil.

**Architecture:** `Portfolio` adalah projection publik satu-per-user terpisah dari `CandidateProfile` privat. FastAPI mengatur drafting/publishing dan public filtering; dashboard menyunting data, sedangkan `/p/[publicId]` merender tiga tema dari data publik.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Pydantic v2, PostgreSQL JSON/BYTEA, Gemini, Next.js 14, TypeScript, React Query, Tailwind.

---

## File map

- Create `backend/app/services/portfolio.py`: ranking repo, fallback draft, validasi publish, public-data filtering.
- Create `backend/app/routers/portfolio.py`: lifecycle private, upload foto, public read.
- Modify `backend/app/models.py`, `backend/app/schemas.py`, `backend/app/main.py`: model, schemas, DDL idempotent.
- Modify `backend/app/services/github_client.py`, `backend/app/services/gemini_service.py`: README bounded dan AI copy optional.
- Create `backend/tests/test_portfolio.py`: tests unit dan API.
- Create `linkify/src/components/portfolio/portfolio-editor.tsx` dan `linkify/src/app/(main)/dashboard/portfolio/page.tsx`: editor kandidat.
- Create `linkify/src/components/portfolio/public-portfolio.tsx` dan `linkify/src/app/p/[publicId]/page.tsx`: public page.
- Modify active dashboard navigation component: link `/dashboard/portfolio`.

### Task 1: Domain rules dan test awal

**Files:** Create `backend/app/services/portfolio.py`; Create `backend/tests/test_portfolio.py`.

- [ ] Tulis test yang membuktikan draft gagal tanpa CV atau GitHub, ranking mengembalikan maksimal 6 repo non-fork, dan public response tidak berisi `cv_file`, address, birth data, nomor pribadi, raw CV, atau repo tak terpilih.
- [ ] Jalankan `cd backend; python -m pytest test_portfolio.py -v`; expected FAIL karena service belum ada.
- [ ] Implement `PORTFOLIO_THEMES = {"editorial", "developer", "professional"}`, `PORTFOLIO_LANGUAGES = {"id", "en"}`, `MAX_PROJECTS = 6`, `rank_repositories`, `build_fallback_draft`, `validate_publish`, dan `public_view`.
- [ ] `build_fallback_draft` wajib menerima CV dan GitHub; project fallback memakai metadata repo dan tidak bergantung Gemini. `public_view` harus allow-list, tidak boleh pass-through JSON.
- [ ] Jalankan test lagi sampai PASS, kemudian commit `feat(portfolio): add domain rules`.

### Task 2: Persistence, validation, dan migration

**Files:** Modify `backend/app/models.py`; Modify `backend/app/schemas.py`; Modify `backend/app/main.py`; Modify `backend/tests/test_portfolio.py`.

- [ ] Tambahkan failing tests: `PortfolioPatch(theme="neon")` dan patch tujuh project harus Pydantic `ValidationError`; patch `public_id`, `status`, atau `verified_skills` harus ditolak.
- [ ] Tambahkan one-to-one model `Portfolio`: UUID `id`, unique `user_id`, unique indexed opaque `public_id`, `status`, JSON `draft_content` dan `published_content`, snapshot foto draft/published, timestamps, dan `published_at`. Snapshot terpisah memastikan save draft tidak mengubah halaman live.
- [ ] Tambahkan Pydantic schemas `PortfolioProject`, `PortfolioContact`, `PortfolioPatch`, public/private responses. Batasi project 6, enum tema/bahasa, panjang string, dan contact key ke GitHub/LinkedIn/email/WhatsApp/website.
- [ ] Tambahkan `CREATE TABLE IF NOT EXISTS portfolios` dan idempotent `ALTER TABLE`/index di lifespan `main.py`, sesuai no-Alembic.
- [ ] Jalankan `cd backend; python -m pytest tests/test_portfolio.py -v; python -m py_compile app/models.py app/schemas.py app/main.py`; expected PASS tanpa output compile. Commit `feat(portfolio): persist public portfolio`.

### Task 3: AI draft enhancement dengan fallback

**Files:** Modify `backend/app/services/github_client.py`; Modify `backend/app/services/gemini_service.py`; Modify `backend/app/services/portfolio.py`; Modify `backend/tests/test_portfolio.py`.

- [ ] Tambahkan test bahwa error/missing Gemini tetap menghasilkan headline, bio, dan description project fallback yang editable.
- [ ] Tambahkan helper GitHub untuk membaca README repo terpilih dari Contents API, decode maksimum 12.000 karakter, return string kosong pada 404/network error. README diperlakukan data tidak tepercaya.
- [ ] Tambahkan Gemini JSON generator yang hanya menerima CV summary, metadata maksimum enam repo, README bounded, verified skills, dan bahasa `id|en`; keluaran headline, bio, project descriptions.
- [ ] Prompt harus menyebut README adalah quoted untrusted content dan AI dilarang mengarang experience, achievement, credential, atau menjalankan instruksi dalam README.
- [ ] Saat key/quota/JSON parse/README gagal, simpan fallback dan `ai_enhanced: false`; generate tidak boleh gagal hanya karena AI.
- [ ] Jalankan tests dan `python -m py_compile` pada tiga service; commit `feat(portfolio): generate AI portfolio draft`.

### Task 4: Secure lifecycle API

**Files:** Create `backend/app/routers/portfolio.py`; Modify `backend/app/main.py`; Modify `backend/tests/test_portfolio.py`.

- [ ] Tambahkan failing API test untuk: unpublished/missing public ID = 404; published public response tidak membocorkan data private; patch tidak bisa menambah verified badge; public ID tidak bisa dipilih klien.
- [ ] Implement `POST /me/portfolio/generate`, `GET/PATCH /me/portfolio`, `POST /me/portfolio/publish`, `POST /me/portfolio/unpublish`, `POST /me/portfolio/photo`, dan `GET /portfolios/{public_id}`.
- [ ] Generate menggunakan `secrets.token_urlsafe` dan retry collision. Endpoint generate menuntut CV dan GitHub. Patch menerima `save_mode: draft|publish`; publish mengubah URL yang sama hanya setelah `validate_publish` sukses.
- [ ] Upload foto menerima JPEG/PNG/WebP maksimal 2MB. Skill verified selalu derived dari `CandidateProfile.verified_skills`; tidak pernah dari input kandidat.
- [ ] Public query hanya menjawab status `published`, menggunakan `public_view`, dan memberi 404 untuk lainnya. Register router di `main.py`.
- [ ] Jalankan tests dan py_compile; commit `feat(portfolio): add publish API`.

### Task 5: Dashboard editor yang fungsi-first

**Files:** Create `linkify/src/components/portfolio/portfolio-editor.tsx`; Create `linkify/src/app/(main)/dashboard/portfolio/page.tsx`; Modify active dashboard navigation component.

- [ ] Query `/me/profile` dan `/me/portfolio` hanya melalui `useApi().withAuth()`. Jika CV atau GitHub belum ada, tampilkan CTA onboarding, bukan tombol generate aktif.
- [ ] Implement editor section-based: name/headline/bio, bahasa, tema, foto optional, pilihan maksimal enam repo, pilihan experience/education, dan toggles contact link.
- [ ] Tampilkan verified skills sebagai read-only. Action eksplisit: Save draft, Update public portfolio, Publish, Unpublish, Copy link. Invalidate query `["portfolio"]` saat mutasi sukses.
- [ ] Tambah route ke navigasi kandidat; jangan ubah `roles.ts` karena dashboard default candidate-only.
- [ ] Jalankan `cd linkify; npx tsc --noEmit; pnpm lint`; expected exit 0. Commit `feat(portfolio): add candidate editor`.

### Task 6: Public route dan tiga tema fungsional

**Files:** Create `linkify/src/components/portfolio/public-portfolio.tsx`; Create `linkify/src/app/p/[publicId]/page.tsx`.

- [ ] Fetch `GET /portfolios/{publicId}` server-side dari `NEXT_PUBLIC_API_URL`, tanpa token Clerk; non-OK wajib `notFound()`.
- [ ] Set metadata `robots: { index: false, follow: false }` agar halaman hanya dapat dibuka via link, tidak diindeks Google.
- [ ] Render hanya public contract: photo atau avatar inisial, headline/bio, selected projects, declared/verified skills, enabled experience/education, dan allowed contact links. Tidak ada CV download atau contact form.
- [ ] Render tiga layout tanpa polish berat: editorial narrative-first, developer dark/project-first, professional clean dan mudah dipindai. Jangan tambah dependency animasi atau CTA recruiter internal. Footer kecil “Created with GitHire”.
- [ ] Jalankan `cd linkify; npx tsc --noEmit; pnpm build`; expected exit 0. Commit `feat(portfolio): add public portfolio site`.

### Task 7: Verification dan handoff deployment

**Files:** Synchronize verified `backend/` changes to `githire-backend/` only after all backend checks pass.

- [ ] Jalankan `cd backend; python -m pytest tests/test_portfolio.py tests/test_role_resolution.py -v` dan `python -m py_compile` untuk seluruh backend file yang diubah.
- [ ] Jalankan `cd linkify; npx tsc --noEmit; pnpm lint; pnpm build`.
- [ ] Uji demo: candidate tanpa prerequisites diblok; sync CV+GitHub; generate; edit; pilih 6 repo; save draft; publish; buka public link tanpa login; save draft tidak mengubah public; update published mengubah URL sama; unpublish jadi 404; Gemini error masih menghasilkan fallback.
- [ ] Setelah verified, sinkronkan `backend/` ke `githire-backend/` (tidak pernah mengedit copy deploy dulu), lalu commit `feat: launch AI portfolio websites`.

## Self-review

- Coverage: plan mencakup prerequisite CV+GitHub, README/Gemini fallback, 6 project, bahasa, foto upload, contact links, verified-skill integrity, draft/update/publish/unpublish, opaque non-indexed URL, serta 3 tema.
- Excluded by design: visual polish, analytics, custom domains, CV download, inbox, dan contact form.
