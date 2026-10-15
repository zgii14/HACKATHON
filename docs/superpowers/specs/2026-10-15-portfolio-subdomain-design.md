# Subdomain portfolio `nama.githire.my.id` — Design

Tanggal: 2026-10-15
Status: disetujui, menunggu rencana implementasi

## Tujuan

Setiap user yang sudah publish portfolio bisa mengklaim alamat sendiri, misalnya
`rozagi.githire.my.id`, sebagai pengganti link acak `/p/kBvAyQPhGD`.

## Keputusan

| Topik | Keputusan |
|---|---|
| Akses | Gratis untuk semua user (early access). Kolom `users.plan` disiapkan untuk penguncian ke Premium saat pembayaran ada. Pembayaran = sub-proyek terpisah. |
| Sumber nama | Dipilih user sendiri, siapa cepat dia dapat. Usulan default: username GitHub kalau tersedia. |
| Ganti nama | Maksimal sekali per 30 hari. Nama lama ditahan 30 hari: redirect 308 ke nama baru dan tidak bisa diklaim orang lain, lalu dilepas. |
| Routing | Pendekatan A: nameserver dipindah ke Vercel, domain wildcard `*.githire.my.id` di proyek Vercel, middleware Next.js memetakan host ke portfolio. |
| Vercel | Paket Hobby (wildcard didukung). Catatan: Hobby hanya untuk pemakaian non-komersial; pindah ke Pro saat Premium mulai berbayar. |

Pendekatan yang ditolak:
- **B (domain per subdomain lewat API Vercel, DNS tetap di sitequ):** batas 50 domain per proyek di Hobby, sertifikat terbit per nama (beberapa menit), butuh token API.
- **C (Cloudflare di depan Vercel):** tetap migrasi DNS, dan Vercel tidak menyarankan proxy di depannya.

## 1. Data (backend)

Migrasi idempotent di `main.py` `lifespan()`, model di `models.py`.

- `portfolios.subdomain` `VARCHAR(30)` unik, nullable.
- `portfolios.subdomain_changed_at` `TIMESTAMPTZ` nullable.
- Tabel baru `subdomain_holds`:
  - `name` `VARCHAR(30)` primary key
  - `portfolio_id` UUID FK `portfolios.id` `ON DELETE CASCADE`
  - `expires_at` `TIMESTAMPTZ`
- `users.plan` `VARCHAR(16)` default `'free'`, belum dipakai untuk gating.

### Aturan nama (`services/subdomain.py`, fungsi murni)

- Dinormalisasi: trim, huruf kecil.
- Regex: `^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$` (3–30 karakter, tidak diawali/diakhiri `-`).
- Tidak boleh mengandung `--`.
- Daftar nama sistem diblokir: `www`, `api`, `app`, `admin`, `mail`, `email`, `smtp`, `ftp`, `clerk`, `accounts`, `clkmail`, `dashboard`, `auth`, `help`, `support`, `docs`, `blog`, `status`, `static`, `assets`, `cdn`, `dev`, `staging`, `test`, `githire`, `p`, `s`.
- Nama dianggap terpakai bila ada di `portfolios.subdomain` milik portfolio lain, atau ada di `subdomain_holds` yang belum kedaluwarsa dan bukan milik portfolio yang sama.
- User boleh mengklaim kembali nama lamanya yang sedang ditahan untuk portfolio-nya sendiri (hold-nya dihapus).

## 2. API

| Endpoint | Perilaku |
|---|---|
| `GET /me/portfolio/subdomain/check?name=` | `{available: bool, reason: "taken" \| "reserved" \| "invalid" \| null, name: <normalized>}` |
| `PUT /me/portfolio/subdomain` body `{name}` | Klaim atau ganti. 404 bila user belum punya portfolio. 422 format salah/nama sistem. 409 terpakai. 429 bila `subdomain_changed_at` < 30 hari lalu (klaim pertama tidak terkena). Sukses: simpan nama, set `subdomain_changed_at`, nama lama masuk `subdomain_holds` dengan `expires_at = now + 30 hari`. Mengembalikan `PortfolioOut` yang kini memuat `subdomain` dan `subdomain_changed_at`. |
| `GET /public/subdomains/{name}` | `{public_id}` bila nama aktif dan portfolio `published`; `{redirect_to: <nama baru>}` bila nama sedang ditahan dan portfolio pemiliknya punya subdomain; 404 selain itu (termasuk portfolio belum/tidak publish). Header `Cache-Control: public, max-age=60`. |

- `GET /portfolios/{public_id}` (publik) ikut mengembalikan `subdomain` supaya halaman `/p` bisa memasang canonical.
- Race condition klaim: constraint unik di DB adalah sumber kebenaran; `IntegrityError` → 409.
- Hold yang kedaluwarsa diabaikan saat pengecekan (tidak perlu cron); dibersihkan oportunistis saat klaim.

## 3. Routing (frontend)

- `src/utils/functions/subdomain-host.ts`: fungsi murni `subdomainFromHost(host, rootDomain)` → nama atau `null`. Mengabaikan `www`, root domain, host Vercel preview, dan port. Mendukung `nama.localhost` untuk dev. Root domain dari env `NEXT_PUBLIC_ROOT_DOMAIN` (default `githire.my.id`).
- `middleware.ts`, sebelum logika Clerk, bila `subdomainFromHost` mengembalikan nama:
  - path `/` → `NextResponse.rewrite` ke `/s/{name}`;
  - `/_next/*` dan file statis tidak melewati middleware (matcher yang ada), jadi tetap dilayani normal;
  - path lain (mis. `/dashboard`) → redirect 307 ke path yang sama di `https://www.githire.my.id`.
- `src/app/s/[name]/page.tsx`: panggil `GET /public/subdomains/{name}` (revalidate 60).
  - `{public_id}` → render portfolio dengan komponen bersama.
  - `{redirect_to}` → `permanentRedirect` ke `https://{redirect_to}.{rootDomain}`.
  - 404 → `notFound()`.
- Render portfolio publik dipindah dari `src/app/p/[publicId]/page.tsx` ke komponen server bersama (`components/portfolio/public-portfolio-view.tsx`) yang dipakai `/p` dan `/s`. `generateMetadata` keduanya memasang `alternates.canonical` ke URL subdomain bila ada.
- `/p/{publicId}` tetap hidup (link lama, iframe landing, `?theme=` dan `embed=1`).
- Record DNS spesifik (`clerk`, `accounts`, `clkmail`, DKIM) selalu menang atas wildcard, jadi Clerk tidak terpengaruh.

## 4. UI dashboard portfolio

Kartu "Alamat portfolio" di `dashboard/portfolio/page.tsx`:
- Input dengan akhiran `.githire.my.id`; nilai awal = subdomain sekarang, atau usulan dari username GitHub.
- Cek ketersediaan otomatis (debounce 400 ms) dengan pesan per `reason`.
- Tombol Simpan (nonaktif bila tidak tersedia/tidak berubah); pesan 429 menyebut tanggal boleh ganti lagi.
- Bila sudah punya subdomain: link aktif + tombol salin; keterangan "Bisa diganti sekali per 30 hari. Alamat lama tetap mengarah ke yang baru selama 30 hari."
- Bila portfolio belum publish: kartu tetap bisa dipakai, dengan keterangan alamat baru aktif setelah publish.
- Semua tombol "bagikan/salin link portfolio" memakai URL subdomain bila ada, selain itu `/p/{id}`.

## 5. Migrasi DNS (dieksekusi pemilik, runbook disiapkan)

Urutan agar email Zoho dan login Clerk tidak putus:
1. Ekspor/catat semua record di sitequ (A/CNAME root & `www`, MX + SPF + DKIM Zoho, CNAME Clerk `clerk`/`accounts`/`clkmail`/`clk._domainkey`/`clk2._domainkey`, TXT verifikasi lain).
2. Tambah `githire.my.id` di Vercel → Domains, buat ulang semua record di DNS Vercel.
3. Turunkan TTL di sitequ bila bisa, tunggu.
4. Ganti nameserver di sitequ ke `ns1.vercel-dns.com` dan `ns2.vercel-dns.com`.
5. Verifikasi: `nslookup -type=MX`, kirim/terima email Zoho, status DNS Clerk hijau, login berhasil, `www` dan root normal.
6. Tambah `*.githire.my.id` ke proyek Vercel `linkify`.

Kode boleh di-deploy sebelum migrasi; fitur aktif setelah langkah 6.

## 6. Testing

- Backend unittest (`test_subdomain.py`): validasi & normalisasi, nama sistem, klaim pertama, bentrok (termasuk `IntegrityError`), cooldown 29/31 hari, nama lama masuk hold, hold milik sendiri bisa diklaim kembali, hold kedaluwarsa bisa diklaim orang lain, endpoint resolve (aktif, redirect, belum publish → 404).
- Frontend: `subdomainFromHost` diuji dengan skrip kecil; `tsc --noEmit`; uji manual `nama.localhost:3000`.
- Setelah migrasi: uji langsung di production (subdomain aktif, redirect nama lama, Clerk & email normal).

## Di luar cakupan

- Pembayaran dan penguncian ke Premium.
- Custom domain (paket Pro).
- Halaman lain di subdomain selain portfolio.
