# Prompt: membuat template (tema) portfolio baru untuk GitHire

Cara pakai:
1. Isi bagian **[ISI SENDIRI]** di bawah (nama tema dan arah desainnya).
2. Lampirkan file skill desain `.claude/skills/design-taste-frontend/SKILL.md` ke AI tersebut
   (atau tempel isinya). Itu skill yang dipakai untuk landing dan editor GitHire.
3. Beri AI akses ke repo (folder `linkify/` dan `backend/`), lalu tempel seluruh blok "PROMPT" di bawah.
4. Satu tema per percakapan. Setelah selesai, cek dengan perintah di bagian "Verifikasi".

---

## PROMPT

Kamu adalah frontend engineer + designer untuk GitHire, platform portfolio developer Indonesia
(Next.js 14 app router, TypeScript, Tailwind v3, framer-motion 11, lucide-react; backend FastAPI).
Tugasmu: menambahkan **satu tema portfolio publik baru**.

### [ISI SENDIRI]
- Key tema (huruf kecil, satu kata, mis. `brutal`): `<KEY>`
- Nama tampil (mis. "Brutal"): `<LABEL>`
- Deskripsi singkat untuk kartu pilihan tema (maks 5 kata, Bahasa Indonesia): `<DETAIL>`
- Arah desain / referensi / mood: `<ARAH DESAIN>`

### Wajib baca dulu
1. Skill desain terlampir (`design-taste-frontend/SKILL.md`). Ikuti terutama: Brief Inference (tulis
   "Design Read" satu kalimat sebelum coding), 3 dial, anti-AI-slop (tanpa em-dash, eyebrow hemat, satu
   warna aksen, satu sistem radius, tanpa div fake-screenshot), motion harus termotivasi dan menghormati
   `prefers-reduced-motion`, Pre-Flight Check di akhir.
2. Tema contoh yang paling lengkap: `linkify/src/components/portfolio/maestro-portfolio.tsx`
   + `maestro-portfolio-config.ts`. Ikuti polanya (komponen client, `Copy` object id/en, helper murni di file config).
3. Tipe data: `linkify/src/components/portfolio/types.ts` (`PublicPortfolio`, `PublicPortfolioContent`).

### Data yang tersedia untuk tema (props)
Komponen tema baru menerima persis:
```ts
type Props = { portfolio: PublicPortfolio; apiBase: string; contacts: Array<[string, string]> };
```
- `portfolio.content`: `name`, `headline`, `bio`, `language` (`"id" | "en"`), `theme`,
  `projects[]` (`repo_name`, `url`, `description`, `tech_stack[]`, `stars`, `own_commits`; 0-6 item),
  `skills[]`, `experience[]` (`role`, `company`, `location?`, `period?`, `bullets?`),
  `education[]` (`institution`, `degree?`, `major?`, `period?`, `gpa?`), `certifications[]`,
  `sections` (`projects | skills | experience | education | certifications` → boolean).
- `portfolio.verified_skills[]`: skill yang terbukti dari commit (`skill`, `level?`, `evidence.own_commits`, `evidence.repos`).
  Tampilkan dengan label yang jelas "terverifikasi dari GitHub" (id) / "Verified from GitHub" (en).
- `portfolio.github_verified`: boolean, akun GitHub pemilik terverifikasi.
- `portfolio.has_photo`: bila true, foto ada di `${apiBase}/portfolios/${portfolio.public_id}/photo` (pakai `<img>` biasa).
- `contacts`: pasangan `[jenis, nilai]` yang sudah difilter (github, linkedin, email, whatsapp, website).
  Email bisa tidak ada (dihapus saat mode embed). Bangun href sendiri: `mailto:`, `https://wa.me/<nomor>`, URL apa adanya.

### Aturan konten
- Hormati toggle: sebuah section tampil hanya bila `portfolio.content.sections?.[key] !== false` DAN datanya tidak kosong.
- Semua label milik tema (judul section, tombol, footer) harus punya versi **id dan en** lewat objek `Copy`
  seperti Maestro, dipilih dari `content.language`. Set `<main lang={content.language}>`.
- Harus tetap rapi untuk: nama sangat panjang, headline 2 baris, bio kosong, 0 proyek, 6 proyek,
  deskripsi proyek kosong, tanpa foto, tanpa kontak, semua section opsional dimatikan.
- Jangan mengarang data (angka, testimoni, logo perusahaan). Hanya tampilkan yang ada di props.
- Sertakan kredit kecil GitHire di footer seperti tema lain (lihat `Footer` di `public-portfolio.tsx`).

### Aturan teknis
- Tanpa dependency baru. Font: pakai CSS variable yang sudah dimuat root layout:
  `var(--font-jakarta)` (Plus Jakarta Sans), `var(--font-jetbrains)` (JetBrains Mono), `var(--font-inter)` (Inter).
  Dilarang `@import` font remote atau `<link>` Google Fonts.
- Warna tema boleh bebas (hex di className, seperti tema lain), karena halaman publik tidak mengikuti tema dashboard.
- Responsif dari 375px sampai 1440px, tanpa scroll horizontal.
- Tema dirender juga di dalam iframe 1280x800 di landing page (`/p/{id}?theme=<KEY>&embed=1`):
  layar pertama (1280x800) harus sudah menarik tanpa scroll.
- Motion: framer-motion saja, hanya `transform`/`opacity`, dan `useReducedMotion()` mematikan semuanya.
- Logika murni (pemilihan palet, pemotongan daftar, format teks) taruh di `<KEY>-portfolio-config.ts` agar bisa dites.

### File yang harus diubah / dibuat (semua wajib)
1. `linkify/src/components/portfolio/types.ts` → tambah `"<KEY>"` ke `PortfolioTheme`.
2. `backend/app/services/portfolio.py` → tambah `"<KEY>"` ke `PORTFOLIO_THEMES`.
3. `backend/app/schemas.py` → tambah `"<KEY>"` ke `Literal[...]` field `theme` (sekitar baris 184).
4. `linkify/src/components/portfolio/public-portfolio-theme.ts` → entri `themePlans.<KEY>` (`key`, `label`, `sectionOrder`).
5. **Baru** `linkify/src/components/portfolio/<KEY>-portfolio.tsx` → `export function <Key>Portfolio(props)`.
6. **Baru** `linkify/src/components/portfolio/<KEY>-portfolio-config.ts` → helper murni.
7. `linkify/src/components/portfolio/public-portfolio.tsx` → di `PublicPortfolioView`, tambah
   `if (theme === "<KEY>") return <<Key>Portfolio portfolio={portfolio} apiBase={apiBase} contacts={contacts} />;`
8. `linkify/src/components/portfolio/public-portfolio-page.tsx` → tambah `"<KEY>"` ke array `THEMES` (agar `?theme=` bekerja).
9. `linkify/src/components/portfolio/theme-preview-cards.tsx` → `themeMeta.<KEY>` (`label`, `detail`),
   komponen mini-preview `<Key>Preview` (tinggi `h-28`, `aria-hidden`, pakai data dari `getThemePreviewData`),
   cabang di fungsi pemilih preview, dan ikon lucide di `themeIcons`.
10. **Baru** `linkify/tests/<KEY>-portfolio.test.mts` → test `node:test` untuk helper di config,
    dan `linkify/tests/<KEY>-public-renderer.test.mts` meniru `maestro-public-renderer.test.mts`
    (cek ekspor komponen, `useReducedMotion`, path foto, label verified, dan bahwa router `public-portfolio.tsx` memanggil komponen ini).

Jangan ubah tema lain, editor, atau API lain.

### Verifikasi (jalankan dan laporkan hasilnya)
```bash
cd linkify
npx tsc --noEmit
npx eslint src/components/portfolio
node --test tests/*.test.mts
cd ../backend && python -m unittest discover -p "test_*.py"
```
Lalu jalankan `pnpm dev` di `linkify` dan buka `http://localhost:3000/p/<publicId>?theme=<KEY>` (minta `publicId`
portfolio yang sudah publish ke pemilik) pada lebar 375, 768, 1280; cek juga dengan
"Emulate prefers-reduced-motion: reduce".

Terakhir, tulis Pre-Flight Check dari skill desain (centang tiap butir yang relevan) dan daftar file yang diubah.

---

## Skill dan proses yang dipakai di GitHire

| Skill | Dipakai untuk | Lokasi |
|---|---|---|
| **design-taste-frontend** (taste-skill) | Arah visual, anti-AI-slop, motion, pre-flight check (landing, auth, editor) | `.claude/skills/design-taste-frontend/SKILL.md` |
| superpowers: brainstorming → writing-plans → executing-plans | Proses: tanya-jawab desain, tulis spec, tulis rencana per task (TDD), kerjakan task demi task | Plugin Claude Code `superpowers`; contoh hasilnya di `docs/superpowers/specs/` dan `docs/superpowers/plans/` |
| superpowers: systematic-debugging | Cari akar masalah sebelum memperbaiki bug | Plugin `superpowers` |

Untuk AI lain yang tidak bisa memuat plugin, cukup lampirkan `design-taste-frontend/SKILL.md`; proses
superpowers bisa ditiru dengan meminta AI menulis rencana singkat per file sebelum coding dan menjalankan
bagian "Verifikasi" setelahnya.

## Opsional setelah tema jadi
- Poster landing: tangkap `/p/<publicId>?theme=<KEY>&embed=1` di 1280x800, simpan WebP ≤ 80 KB ke
  `linkify/public/landing/portfolio-<KEY>.webp`, lalu tambah ke `THEMES` di
  `components/landing-v2/portfolio-stage.tsx` dan `POSTERS` di `components/auth/auth-backdrop.tsx`.
