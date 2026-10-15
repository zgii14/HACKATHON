# Runbook: pindah DNS githire.my.id ke Vercel (untuk subdomain portfolio)

Tujuan: wildcard `*.githire.my.id` aktif di Vercel dengan SSL, tanpa memutus email Zoho dan login Clerk.
Dieksekusi oleh pemilik domain (butuh login panel sitequ.id, Vercel, Clerk, Railway).
Perkiraan waktu kerja: 30 menit, ditambah tunggu propagasi (bisa sampai 24 jam, biasanya < 1 jam).

## 0. Record yang ada sekarang

Dicek 2026-10-15 dari `ns1.sitequ.id`. **Ini belum tentu lengkap.** Sumber kebenaran adalah panel sitequ:
buka panel DNS sitequ, salin semua record ke tabel ini sebelum melanjutkan. Perhatikan terutama
TXT (SPF, verifikasi Google/Zoho) dan DKIM Zoho (selector-nya bisa apa saja, mis. `zmail._domainkey`),
yang tidak terdeteksi dari luar.

| Tipe | Nama | Nilai | Catatan |
|---|---|---|---|
| A | `@` | `216.198.79.1` | Vercel. Diurus otomatis oleh Vercel setelah pindah, tidak perlu dibuat ulang |
| CNAME | `www` | `76927732f83d9d5c.vercel-dns-017.com` | Vercel. Diurus otomatis, tidak perlu dibuat ulang |
| MX | `@` | `mx.zoho.com` prioritas 10 | Zoho Mail |
| MX | `@` | `mx2.zoho.com` prioritas 20 | Zoho Mail |
| MX | `@` | `mx3.zoho.com` prioritas 50 | Zoho Mail |
| CNAME | `clerk` | `frontend-api.clerk.services` | Clerk |
| CNAME | `accounts` | `accounts.clerk.services` | Clerk |
| CNAME | `clkmail` | `mail.e05rllk4qvmx.clerk.services` | Clerk (email) |
| CNAME | `clk._domainkey` | `dkim1.e05rllk4qvmx.clerk.services` | Clerk DKIM |
| CNAME | `clk2._domainkey` | `dkim2.e05rllk4qvmx.clerk.services` | Clerk DKIM |
| TXT | `@` | *(tidak terlihat dari luar; cek panel. Zoho butuh SPF `v=spf1 include:zoho.com ~all`)* | |
| TXT | `<selector>._domainkey` | *(DKIM Zoho; cek panel atau Zoho Mail Admin → Domains → Email Configuration)* | |
| | *(record lain di panel)* | | |

Catatan: dari luar tidak ada SPF di root. Kalau di panel memang tidak ada, email Zoho kemungkinan
sering masuk spam; tambahkan SPF di Vercel sekalian (nilai di atas, sesuai panduan Zoho).

## 1. Siapkan DNS di Vercel (belum mengubah apa pun yang live)

1. Vercel → **Domains** (menu tingkat akun, bukan project) → pilih `githire.my.id`.
   Kalau belum ada: **Add** → `githire.my.id`.
2. Tab **DNS Records** → buat ulang setiap baris tabel di atas **kecuali** A `@` dan CNAME `www`
   (Vercel membuat itu sendiri). Isi persis: tipe, nama, nilai, prioritas MX.
3. Cocokkan ulang satu per satu dengan panel sitequ. Jangan lanjut sebelum semua ada.

## 2. Turunkan TTL (opsional tapi disarankan)

Di panel sitequ, ubah TTL record MX dan CNAME Clerk ke nilai terendah yang diizinkan.
Tunggu sebesar TTL lama (sering 1-3 jam) supaya cache lama cepat habis.

## 3. Ganti nameserver

Di panel sitequ (bagian domain / nameserver, bukan DNS record), ganti nameserver menjadi:

```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

**Jangan hapus record di sitequ** sampai migrasi dinyatakan stabil 7 hari (dipakai untuk rollback).

## 4. Verifikasi (setelah 15-60 menit)

```bash
nslookup -type=NS githire.my.id          # harus vercel-dns.com
nslookup -type=MX githire.my.id          # harus tetap mx.zoho.com dst.
nslookup -type=CNAME clerk.githire.my.id # harus frontend-api.clerk.services
```

- Kirim email ke alamat `@githire.my.id` dari Gmail, dan balas dari Zoho. Keduanya harus sampai.
- Clerk Dashboard → **Configure → Domains**: semua record hijau (klik Verify bila perlu).
- Buka `https://www.githire.my.id/auth/sign-in`, login sampai masuk dashboard.
- Buka `https://www.githire.my.id` dan `https://githire.my.id`: normal.

Kalau ada yang gagal: lihat bagian Rollback.

## 5. Aktifkan wildcard

1. Vercel → Project **linkify** → **Settings → Domains** → **Add** → `*.githire.my.id`.
2. Tunggu status **Valid Configuration** (Vercel menerbitkan sertifikat wildcard otomatis).

## 6. Nyalakan fitur di backend

Railway → project `hearty-recreation` → service `HACKATHON` → **Variables** → tambah:

```
PORTFOLIO_SUBDOMAINS_LIVE=true
```

Railway redeploy otomatis. Setelah ini `public_url` dan tombol "Salin link" memakai alamat subdomain.

## 7. Uji akhir

1. Login → Dashboard → Portfolio → kartu **Alamat portfolio** → klaim nama → simpan.
2. Buka `https://{nama}.githire.my.id`: portfolio tampil, console browser tanpa error.
3. Buka `https://{nama}.githire.my.id/dashboard`: dialihkan ke `https://www.githire.my.id/dashboard`.
4. Buka `https://tidakada-xyz.githire.my.id`: halaman 404.

(Redirect nama lama tidak bisa diuji langsung karena ada cooldown 30 hari; sudah dicakup unittest backend.)

## Rollback

1. Panel sitequ → kembalikan nameserver ke `ns1.sitequ.id`, `ns2.sitequ.id`, `ns3.sitequ.id`, `ns4.sitequ.id`.
2. Railway → hapus atau set `PORTFOLIO_SUBDOMAINS_LIVE=false`.
3. Fitur klaim nama tetap jalan; subdomain hanya belum bisa dibuka. Link `/p/{id}` tidak terpengaruh.
