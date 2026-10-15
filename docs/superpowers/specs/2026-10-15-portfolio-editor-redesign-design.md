# Redesign editor portfolio — Design

Tanggal: 2026-10-15
Status: disetujui, menunggu rencana implementasi

## Masalah

`linkify/src/components/portfolio/portfolio-editor.tsx` (551 baris) menampilkan 7 bagian form dalam satu
halaman panjang, plus kolom kanan berisi alamat, tema, toggle section, dan 4-5 tombol aksi. Keluhan user:
terlalu panjang, tombol membingungkan (Save draft / Update public portfolio / Publish / Unpublish / AI),
tampilan berantakan (label campur Inggris-Indonesia, tanpa hierarki).

Bug laten yang ikut diperbaiki: `useEffect` menyalin `portfolio.draft_content` ke form setiap query
`["portfolio"]` berubah, sehingga respons server bisa menimpa ketikan.

## Referensi

- Settings dengan menu samping, panel kanan, URL sebagai sumber kebenaran bagian aktif (techinterview, read.cv).
- Autosave setelah berhenti mengetik + saat blur, status Menyimpan/Tersimpan/Gagal + Coba lagi (GitLab #24892, gitlab-design #121, SaaSUI).
- Aksi destruktif di "Zona berbahaya" dengan konfirmasi.
- Checklist kelengkapan sebagai motivasi (Linktree onboarding).

## Tata letak

```
┌──────────────────────────────────────────────────────────────────┐
│ Portfolio  ● Sudah publik · Ada perubahan     Tersimpan          │
│ rozagi.githire.my.id  Salin  Pratinjau      [⋯]  [Perbarui publik]│
├───────────────┬──────────────────────────────────────────────────┤
│ 4 dari 6      │  <Judul bagian>          [Tampilkan di portfolio]│
│ lengkap       │  <satu kalimat penjelasan>                       │
│ Profil      ✓ │                                                  │
│ Proyek      ✓ │  <isian bagian>                                  │
│ Skill       • │                                                  │
│ Pengalaman  ✓ │                                                  │
│ Pendidikan  ✓ │                                                  │
│ Kontak      ! │                                                  │
│ ─────────     │                                                  │
│ Tampilan      │                                                  │
│ Alamat & pub. │                                                  │
└───────────────┴──────────────────────────────────────────────────┘
```

- Bar atas sticky di dalam area konten dashboard.
- Menu kiri `lg:` ke atas; di bawah `lg` menjadi baris tab yang bisa digeser horizontal (scroll-snap), bagian aktif di-scroll ke tampilan.
- Satu bagian tampil per layar. Bagian aktif = query `?bagian=` dengan nilai `profil | proyek | skill | pengalaman | pendidikan | kontak | tampilan | alamat`; default `profil`; nilai tak dikenal jatuh ke `profil`. Ganti bagian memakai `router.replace` (tanpa menambah history berlebihan) dan memicu simpan segera.
- Gaya: Workbench terang (`PageHeader`/`SecTitle` tidak wajib; pakai token tema dan skala `text-body`/`text-meta`), input `py-2.5 text-body`, label di atas input, semua copy Bahasa Indonesia, tanpa em-dash.

## Bagian

| Slug | Judul | Isi | Toggle "Tampilkan di portfolio" |
|---|---|---|---|
| `profil` | Profil | Nama, Headline, Tentang saya, Foto (unggah/hapus) | - |
| `proyek` | Proyek | Daftar proyek (deskripsi dapat diedit, hapus + undo), tombol Tambah proyek dari GitHub (dialog yang ada) | `sections.projects` |
| `skill` | Skill & sertifikasi | Skill (dipisah koma), Sertifikasi (dipisah koma) | `sections.skills`, `sections.certifications` (masing-masing di atas field-nya) |
| `pengalaman` | Pengalaman | Kartu per entri: Peran, Perusahaan, Periode; hapus + undo; tambah | `sections.experience` |
| `pendidikan` | Pendidikan | Kartu per entri: Institusi, Gelar, Jurusan; hapus + undo; tambah | `sections.education` |
| `kontak` | Kontak | Per kontak: label, input, switch Tampilkan; pesan error per field | - |
| `tampilan` | Tampilan | Tema (`ThemePreviewCards` yang ada), Bahasa portfolio (`id`/`en`) | - |
| `alamat` | Alamat & publikasi | `SubdomainCard` yang ada; Zona berbahaya: "Sembunyikan dari publik" (hanya bila published, dengan konfirmasi) | - |

## Kelengkapan (fungsi murni)

`sectionCompleteness(form)` → status per slug untuk 6 bagian isi:
- `profil`: `name`, `headline`, `bio` tidak kosong (setelah trim).
- `proyek`: minimal 1 proyek.
- `skill`: minimal 1 skill.
- `pengalaman`: minimal 1 entri dengan `role` dan `company`, ATAU `sections.experience === false`.
- `pendidikan`: minimal 1 entri dengan `institution`, ATAU `sections.education === false`.
- `kontak`: minimal 1 kontak `enabled` dengan `value` tidak kosong.

Menu: `✓` lengkap, titik "perlu diisi" bila belum, `!` bila bagian itu sumber error simpan terakhir.
Ringkasan di atas menu: "{n} dari 6 lengkap". `tampilan` dan `alamat` tidak dihitung.

## Simpan otomatis

Hook `usePortfolioAutosave` (client):
- Memegang `form` lokal; diinisialisasi sekali dari `draft_content` saat data pertama datang, dan diganti hanya
  oleh aksi eksplisit yang memang mengganti isi (generate, tulis ulang AI, publish/perbarui, unggah/hapus foto,
  pulihkan cadangan). Respons autosave tidak menyentuh `form`.
- Pemicu: debounce 1000 ms setelah perubahan terakhir; flush segera saat blur field (event `focusout` pada area
  form) dan saat ganti bagian.
- Antrian tunggal: paling banyak satu PATCH berjalan; perubahan selama request berjalan ditandai, lalu setelah
  selesai dikirim satu PATCH berisi versi terbaru.
- Request: `PATCH /me/portfolio` dengan `{...form, ai_enhanced: undefined, save_mode: "draft"}` (sama dengan sekarang).
  Respons sukses memperbarui cache `["portfolio"]` (untuk status publikasi), bukan `form`.
- Status: `idle | saving | saved | error`; `error` menyimpan pesan server (`ApiError.message`) dan
  bagian sumber error: pesan diawali "Kontak " → `kontak`, selain itu tidak ada.
  Bar atas: "Menyimpan…", "Tersimpan", atau "Gagal menyimpan: {pesan}" + tombol Coba lagi (flush ulang).
- `flush(): Promise<boolean>` untuk dipakai sebelum publikasi; mengembalikan false bila gagal.
- Cadangan: setiap perubahan ditulis ke `localStorage` key `githire:portfolio-draft:{public_id}` berisi
  `{ form, updatedAt }`; dihapus setelah simpan sukses yang mengandung versi tersebut. Saat editor dibuka dan
  cadangan ada dan berbeda dari `draft_content`, tampil banner "Ada perubahan yang belum tersimpan dari sesi
  sebelumnya." dengan tombol Pulihkan / Buang. Semua akses `localStorage` dibungkus try/catch.
- `beforeunload`: peringatan browser bila status `saving` atau ada perubahan yang belum terkirim.

## Status publikasi dan tombol

`publishState(record, { photoChanged })` (fungsi murni) → `"draft" | "up_to_date" | "changed"`:
- `record.status !== "published"` → `draft`.
- Bandingkan `draft_content` dan `published_content` dengan stringify stabil (urutan key diurutkan, key
  `ai_enhanced` diabaikan). Sama dan `!photoChanged` → `up_to_date`, selain itu `changed`.
- `photoChanged` = flag lokal true setelah unggah/hapus foto di sesi ini, direset setelah publikasi.

| State | Label status | Tombol utama |
|---|---|---|
| `draft` | Draft | **Publikasikan** = `flush()` lalu `POST /me/portfolio/publish` |
| `up_to_date` | Sudah publik | "Sudah terbaru" (nonaktif) |
| `changed` | Sudah publik · Ada perubahan belum dipublikasikan | **Perbarui publik** = `flush()` lalu `PATCH /me/portfolio` dengan `save_mode: "publish"` |

Tombol utama nonaktif saat `saving`, saat status `error`, atau saat aksi lain berjalan.
Bar atas juga: alamat publik (`subdomain_url` bila ada dan `subdomain_live`, selain itu `public_url`) + Salin,
tombol Pratinjau (buka alamat publik di tab baru; hanya bila pernah published), menu ⋯ berisi
"Tulis ulang dengan AI" (alur dan konfirmasi yang ada).

## Struktur file (frontend saja; backend tidak berubah)

| File | Tanggung jawab |
|---|---|
| `components/portfolio/portfolio-editor.tsx` | Loading, layar belum siap (CV/GitHub), layar generate pertama, lalu merakit editor |
| `components/portfolio/editor/editor-state.ts` | Fungsi murni: `sectionCompleteness`, `publishState`, `stableStringify`, `EDITOR_SECTIONS`, `parseSection` |
| `components/portfolio/editor/use-portfolio-autosave.ts` | Hook simpan otomatis + cadangan |
| `components/portfolio/editor/save-queue.ts` | Antrian simpan murni (bisa dites tanpa React) |
| `components/portfolio/editor/editor-nav.tsx` | Menu kiri / tab mobile + ringkasan kelengkapan |
| `components/portfolio/editor/editor-bar.tsx` | Bar atas: status, alamat, Pratinjau, ⋯, tombol utama |
| `components/portfolio/editor/sections/*.tsx` | 8 komponen bagian, masing-masing menerima `form` + `onChange` |
| `components/portfolio/editor/field.tsx` | Primitif kecil: `Field` (label + input/textarea + error), `SectionHeader` (judul, penjelasan, toggle) |

Helper yang ada (`portfolio-editor-helpers.ts`), `ThemePreviewCards`, `SubdomainCard`, dialog tambah proyek,
undo hapus, dan alur AI dipakai ulang tanpa perubahan perilaku.

## Pengujian

- `node --test`: `editor-state` (kelengkapan tiap aturan, `publishState` termasuk `ai_enhanced` diabaikan dan
  urutan key, `parseSection`), `save-queue` (tidak ada dua request bersamaan, versi terbaru terkirim setelah
  request berjalan selesai, error mengembalikan false dan bisa dicoba lagi).
- `npx tsc --noEmit`, `npx eslint` untuk file yang disentuh, `next build`.
- Manual (butuh login, oleh pemilik di production): pindah bagian, ketik lalu tunggu "Tersimpan", kontak salah
  memunculkan error + Coba lagi, Publikasikan/Perbarui, Pratinjau, cadangan dipulihkan setelah tab ditutup paksa.

## Di luar cakupan

- Pratinjau langsung di samping editor (butuh endpoint pratinjau draft).
- Perubahan backend, termasuk validasi kontak.
- Urutan ulang proyek dengan drag.
