# Tema portfolio Fold (tema ke-6) — desain

Tanggal: 2026-10-16
Status: disetujui user (brainstorming), siap rencana implementasi.

## Ringkasan

Tema publik baru `fold` / label "Fold" / detail kartu "HP lipat, huruf raksasa".
Referensi visual: https://foldfolio.framer.website/ (gaya saja, tanpa aset atau teks dari sana).

Design Read: portfolio developer yang hidup di dalam HP lipat; layar kunci berisi jam dan notifikasi repo,
scroll membuka engsel menjadi layar lebar, nama pemilik tertulis raksasa dengan grotesk extra condensed di
belakang device, latar terang hangat, proyek tampil sebagai blok warna penuh bernomor besar.

Beda dari 5 tema lain: terang seperti Editorial/Professional, tetapi seluruh konten dibingkai mockup device
yang bergerak mengikuti scroll, dengan tipografi extra condensed raksasa dan blok warna jenuh per proyek.

## Keputusan user

| Topik | Keputusan |
|---|---|
| Kedalaman konsep | **Full device**: seluruh portfolio hidup di frame device sticky; scroll halaman menggerakkan isi layar (satu scrollbar, bukan scroll bersarang). |
| Mobile (< 768px) | **Layar = device**: tanpa bezel; layar kunci layar penuh lalu dilipat keluar (reveal), sisanya section biasa bergaya sama. Frame + engsel mulai 768px. |
| Font | Persis referensi: **Sofia Sans Extra Condensed 900** (`next/font/google`), **Geist** + **Geist Mono** dari paket npm **`geist`** (dependency baru disetujui). Semua diimpor hanya di file tema. |
| Toggle pengunjung | Ikut dua-duanya: pil latar **Basic / Glow / Orbit** dan 4 titik warna bezel. Disimpan per pengunjung di localStorage, dibaca setelah mount. Default Basic + perak. |
| Reduced-motion | **Tidak dihormati** (permintaan user): motion jalan untuk semua pengunjung, tanpa cabang render reduced-motion. |
| Key | `fold`, label "Fold". |

## Alur adegan (desktop/tablet ≥ 768px)

Panggung: latar `#f5f4f2`, header kiri "NAMA®" (Sofia condensed), pil Basic/Glow/Orbit kanan atas,
titik warna bezel di bawah tengah. Frame device sticky di tengah viewport; tinggi halaman = jumlah adegan ×
tinggi adegan, dan progres scroll menggerakkan isi layar.

1. **Layar kunci (HP terlipat, potret ~ 360×480)**: nama raksasa di belakang device, terpotong kiri-kanan.
   Di layar: jam besar waktu nyata pengunjung (diisi setelah mount; SSR menampilkan `--:--`), headline di
   bawahnya. Wallpaper = foto bila `has_photo`, kalau tidak gradien + inisial besar. Maksimal 2 kartu notifikasi
   = 2 proyek dengan commit terbanyak: baris 1 `repo_name`, baris 2 mono `TECH · N COMMIT` (bintang hanya bila > 0).
   Ikon kontak kiri/kanan bawah (yang ada saja), pil "Gulir untuk membuka" / "Scroll to unfold".
   Badge kecil "GitHub terverifikasi" bila `github_verified`.
2. **Unfold**: panel kiri berputar `rotateY` dari engsel tengah, device melebar ke rasio tablet lanskap
   (~ 960×600, dibatasi viewport). Nama raksasa memudar.
3. **Hero layar lebar**: label mono headline, nama condensed besar, bio dipotong maks 2 kalimat, tombol
   "Lihat proyek ↗" dan "Sapa saya", foto setengah kanan (tanpa foto: blok warna + inisial).
   Dock pil di bawah layar: Beranda / Proyek / Skill / Tentang / Kontak, hanya adegan yang aktif;
   klik = scroll ke adegan; pil aktif pakai `layoutId`.
4. **Angka (layar hitam)**: judul "Dalam angka" / "In numbers" + sampai 3 angka condensed besar dari data asli:
   jumlah proyek, total `own_commits`, jumlah skill terverifikasi. Angka 0 dibuang; semua 0 → adegan hilang.
5. **Proyek terpilih**: layar judul "PROYEK TERPILIH", lalu satu layar per proyek: blok warna penuh
   (palet dipilih dari hash nama repo), cover generatif di atas, nomor raksasa 01..06, tech mono, nama repo,
   deskripsi (kosong → tidak ada paragraf), "Buka repo ↗".
6. **Skill**: daftar bernomor skill terverifikasi (level, commit, repo; label "Terverifikasi dari GitHub" /
   "Verified from GitHub"), lalu skill lain sebagai chip.
7. **Tentang**: pengalaman, pendidikan, sertifikasi sebagai baris mono; sertifikasi juga marquee.
   Masing-masing hanya bila toggle aktif dan data ada; semua kosong → adegan hilang.
8. **Penutup**: device menutup ke rasio persegi, layar "Panggilan masuk · soal proyekmu berikutnya" /
   "Incoming call · about your next project", foto bulat (atau inisial), slider "geser untuk bicara" /
   "slide to talk" yang membuka kontak utama (drag sampai ujung, atau klik/Enter). Tanpa kontak → slider
   tidak ada, layar hanya nama. Nama raksasa terbelah atas-bawah. Footer kredit GitHire di luar device.

Mobile: adegan 1 layar penuh tanpa bezel, lalu dilipat keluar saat scroll (rotateY + fade); adegan 3–8
menjadi section biasa bertipografi dan warna sama; dock jadi pil mengambang di bawah.

## Sistem visual

- Font: Sofia Sans Extra Condensed 900 (nama, jam, angka, nomor, judul; kapital, tracking rapat),
  Geist 400/500 (body, tombol), Geist Mono 500 (label kapital kecil, metadata).
- Warna: panggung `#f5f4f2`, tinta `#111111`, layar terang `#fafafa`, layar gelap `#0c0c0c`.
  Blok proyek: `#2f5bd3`, `#e8a23a`, `#d83a2e`, `#8fa58a`, `#6b4fd8`, `#e9c94a`; teks putih/hitam dipilih
  `readableInk()` berdasarkan luminans.
- Bezel: perak `#d9d6d0`, hitam `#1b1b1b`, rose `#e2a093`, sage `#a9b5a0`. Radius layar 40px, bezel 10px,
  bayangan lantai lembut.
- Latar: Basic polos; Glow = blob oranye/ungu blur di belakang device, bergerak pelan; Orbit = cover generatif
  proyek mengorbit device (0 proyek → opsi Orbit disembunyikan).
- Pil (tombol, dock, toggle) radius penuh, kaca blur; notifikasi kaca putih 70%.
- Motion: framer-motion `useScroll` + `useTransform` dalam satu kontainer sticky; entrance pola variants
  (satu akar, `staggerChildren`); count-up angka; hanya transform/opacity. Tanpa dependency animasi baru.
- Tidak ada scroll horizontal 375–1440; layar pertama 1280×800 (iframe landing, `embed=1`) = adegan 1.

## Arsitektur

File baru di `linkify/src/components/portfolio/`:

| File | Isi |
|---|---|
| `fold-portfolio-config.ts` | Helper murni: `getFoldCopy`, `pickBlockColor`, `readableInk`, `buildFoldStats`, `pickNotifications`, `primaryContact` (email > whatsapp > linkedin > website > github), `buildScenes`, `formatClock`, `initials`, `parseFoldPrefs`, konstanta palet/bezel/latar. |
| `fold-portfolio.tsx` | `FoldPortfolio`: font, panggung, header, toggle latar + bezel (localStorage setelah mount), pilih layout desktop/mobile. |
| `fold-device.tsx` | Frame, engsel, kontainer sticky + progres scroll, dock nav. |
| `fold-scenes.tsx` | LockScreen, Hero, Stats, ProjectBlock, Skills, About, IncomingCall, cover generatif. |

Registrasi (lihat `docs/prompts/portfolio-theme-prompt.md`): `types.ts`, backend `PORTFOLIO_THEMES` +
`schemas.py`, `themePlans`, cabang `PublicPortfolioView`, `THEMES` di `public-portfolio-page.tsx`,
`themeMeta` + `FoldPreview` + cabang preview + ikon `Smartphone` di `theme-preview-cards.tsx`, chip global
verified disembunyikan untuk `fold`. `package.json`: dependency `geist`.

Data: hanya props (`PublicPortfolio`, `apiBase`, `contacts`); tidak ada angka, lokasi, atau klien karangan.
Semua label id + en; `<main lang={content.language}>`.

## Test

- `tests/fold-portfolio.test.mts`: semua helper (0 proyek, nama panjang, bio kosong, tanpa kontak,
  section mati, prefs localStorage rusak, kontras palet).
- `tests/fold-public-renderer.test.mts`: ekspor komponen, path foto, label verified id/en, router memanggil
  `FoldPortfolio`, font hanya diimpor di file tema.
- `tests/fold-theme-preview.test.mts`: preview terdaftar.
- Backend: `fold` diterima `PORTFOLIO_THEMES` dan skema patch.

Verifikasi: `npx tsc --noEmit`, `pnpm lint`, `node --test tests/*.test.mts`, `pnpm build` (dev server mati),
unittest backend, browser config `linkify-prod-api` `/p/kBvAyQPhGD?theme=fold` (+ `&embed=1`) di 375/768/1280,
console tanpa error dan tanpa hydration mismatch.

## Setelah tema jadi

- Poster `linkify/public/landing/portfolio-fold.webp` ≤ 80 KB: Chrome headless 1280×800 dengan
  `--virtual-time-budget` (animasi masuk selesai, scroll 0), daftarkan di `landing-v2/portfolio-stage.tsx` dan
  `auth/auth-backdrop.tsx`.
- Tambah `fold` ke daftar key terpakai di `docs/prompts/portfolio-theme-prompt.md`.
- Commit per langkah, tanpa push sebelum persetujuan user. Catat keputusan dan jebakan ke Obsidian.
