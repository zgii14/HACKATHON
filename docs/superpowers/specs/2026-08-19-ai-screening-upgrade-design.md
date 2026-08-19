# AI Screening Upgrade — Tahap 1

**Tanggal:** 2026-08-19
**Status:** disetujui, siap diimplementasi
**Ruang lingkup:** `POST /recruiter/applications/{id}/ai-screening`

## Masalah

Lima celah ditemukan pada implementasi screening saat ini.

### 1. Data GitHub dikirim rusak (regresi)

`recruiter.py` menumpahkan seluruh `github_signals` lalu memotongnya di 1500 karakter:

```python
gh_summary = json.dumps(profile.github_signals or {}, ...)[:1500]
```

Sejak fitur verifikasi skill menambahkan `repos_detail`, payload membengkak jadi **16.170 karakter**. Yang sampai ke Gemini tinggal **9%**, dan berhenti di tengah objek:

```
..."size": 2124, "stars": 0, "languages": {"JavaScript": 35659, "CSS":
```

JSON tidak sah, kurung tidak tertutup, dan model tidak diberi tahu ada yang terpotong. Repo mana yang lolos ditentukan kebetulan urutan.

### 2. `verified_skills` tidak dipakai sama sekali

Prompt menginstruksikan *"Prefer verified GitHub signals over unproven CV claims"* tetapi tidak pernah diberi data yang memisahkan keduanya. Hasil kerja modul `skill_verification` tidak dimanfaatkan.

### 3. `cv_data` tanpa batas

`json.dumps(profile.cv_data, ...)` dikirim utuh tanpa cap. CV panjang membengkakkan prompt tanpa kendali.

### 4. Skor tidak stabil

Kandidat dan lowongan yang sama menghasilkan skor sangat berbeda tergantung susunan prompt:

| Varian diuji | Skor | Verdict |
|---|---|---|
| A — prompt sekarang | 65 | consider |
| B — bukti diutamakan | 45 | consider |
| C — CV+GitHub setara | 78 | interview |

Anchor algoritmik 40% di ketiganya. Sebaran **33 poin**.

### 5. Verdict lepas dari skor

`normalize_screening_result` memvalidasi `match_score` dan `recommendation` secara terpisah; tidak ada aturan yang menghubungkan keduanya. Terbukti menghasilkan kontradiksi pada pengujian: **skor 65 → `consider`**, sementara **skor 55 → `interview`**. Skor 90 → `reject` juga akan diterima sistem.

Verdict adalah yang pertama dibaca recruiter dan bersifat biner (dipanggil atau tidak), sehingga ketidakstabilannya lebih merusak daripada skor yang bergeser.

## Batasan alat ukur yang harus dihormati

GitHub Linguist hanya melaporkan **bahasa pemrograman**. Konsekuensinya:

- Framework (React, Next.js, Laravel) terhitung sebagai bahasa dasarnya (TypeScript, PHP)
- Styling (Tailwind) terhitung sebagai CSS
- Tooling (Git, Docker, CI/CD), layanan cloud (AWS, Kubernetes), dan skill non-kode **tidak mungkin terdeteksi**
- Seluruh kerja di repo privat/perusahaan tidak terlihat

Karena itu **ketiadaan bukti bukan bukti ketiadaan**. Rancangan awal yang melabeli skill tak terverifikasi sebagai "klaim tanpa bukti" bias sistematis — pengujian varian B menuduh Next.js, Tailwind CSS, dan Git tidak terbukti, padahal ketiganya memang mustahil terlihat.

Topics repo juga tidak bisa diandalkan sebagai penolong: pada akun uji, `topics` kosong.

## Rancangan

### Prinsip

CV dan GitHub dinilai **berimbang**. Bukti commit dipakai untuk **menguatkan** klaim CV, bukan menggugurkannya.

### Struktur prompt baru

```
--- JOB ---                                (tetap)
--- CV KANDIDAT ---                        dibatasi 2500 char
--- BAHASA YANG TERBUKTI DARI COMMIT ---   dari verified_skills, maks 10
--- DI LUAR JANGKAUAN VERIFIKASI ---       skill CV non-bahasa, tooling disaring
--- AKTIVITAS GITHUB ---                   ringkasan angka, bukan JSON
--- DETERMINISTIC ANCHOR ---               + batas rentang wajib
--- RULES ---                              (tetap + larangan menuduh)
```

Blok "di luar jangkauan" disertai instruksi eksplisit bahwa ketiadaan bukti bukan tanda kebohongan, dan model boleh menilai kewajaran klaim lewat bahasa dasarnya.

### Tiga pagar

1. **Rentang skor.** Prompt mewajibkan `match_score` berada di `anchor ± 20`, dan kode **menjepit** hasilnya ke rentang itu sebagai jaminan keras (pertahanan berlapis — instruksi prompt saja tidak cukup).
2. **Saring tooling.** Git, Docker, CI/CD, Jira, Figma, dan sejenisnya dibuang dari blok "di luar jangkauan" sebelum masuk prompt, agar model tidak punya bahan untuk menyebutnya kekurangan.
3. **Verdict deterministik.** `recommendation` dihitung dari skor akhir, bukan dipilih model:

   | Skor | Verdict |
   |---|---|
   | ≥ 60 | `interview` |
   | 35–59 | `consider` |
   | < 35 | `reject` |

   Model tetap menulis `reasoning`, `strengths`, `weaknesses` — bagian yang memang butuh penalaran.

### Hasil pengujian rancangan (varian D, 3× jalan)

| | Sebelum | Sesudah |
|---|---|---|
| Sebaran skor | 33 poin (antar-framing) | **10 poin** (55, 55, 45) |
| Dalam rentang wajib | — | **100%** |
| Poin dengan angka bukti | 0 | 4 |
| Blok data GitHub | 1.500 char (rusak) | **906 char** (utuh) |
| Ukuran prompt total | 3.283 char | 3.334 char |

Catatan jujur soal ukuran: blok data GitHub memang menyusut 40% **dan** jadi utuh, tetapi penghematan itu habis terpakai oleh instruksi pagar yang baru. Ukuran total praktis tidak berubah (+51 char). Klaim "prompt mengecil" hanya berlaku untuk bagian datanya, bukan keseluruhan.

Contoh kalimat yang dihasilkan — memakai bukti untuk menguatkan, dan mengakui batas alat ukur:

> "Kurangnya bukti publik eksplisit mengenai Next.js, meskipun hal ini umum terjadi karena sering digunakan di proyek privat/perusahaan."

> "JavaScript 195 commit, TypeScript 82 commit — landasan kuat untuk pengembangan React."

Verdict yang tadinya goyang (`interview`/`interview`/`consider` pada skor 55/55/45) menjadi tetap begitu diturunkan dari skor.

## Arsitektur

Modul murni baru `backend/app/services/screening.py` — tanpa HTTP, DB, atau environment, mengikuti pola `skill_verification.py`:

| Fungsi | Tanggung jawab |
|---|---|
| `build_proven_block(verified_skills)` | Baris bukti per bahasa |
| `build_unverifiable_block(merged_skills, verified_skills)` | Skill CV di luar jangkauan, tooling tersaring |
| `build_activity_block(signals)` | Ringkasan angka GitHub |
| `clamp_score(score, anchor)` | Jepit ke `anchor ± MAX_DEVIATION` |
| `derive_verdict(score)` | Skor → `interview`/`consider`/`reject` |
| `build_screening_prompt(...)` | Merangkai seluruh prompt |

`recruiter.py` hanya memanggil fungsi-fungsi itu; logika penilaian tidak lagi tertanam di dalam endpoint.

### Konstanta

```python
MAX_DEVIATION = 20
INTERVIEW_THRESHOLD = 60
CONSIDER_THRESHOLD = 35
CV_DATA_CHAR_CAP = 2500
MAX_PROVEN_SKILLS = 10
PROMPT_VERSION = "v2"
TOOLING_SKILLS = frozenset({...})
```

### Invalidasi cache

`PROMPT_VERSION` masuk ke `_screening_fingerprint()`. Prompt berubah → sidik jari berubah → hasil lama otomatis dihitung ulang. Tanpa ini, recruiter akan melihat campuran hasil prompt lama dan baru.

### Jalur fallback

Kandidat tanpa CV tetap memakai skor deterministik, tetapi `recommendation`-nya kini juga lewat `derive_verdict()` supaya konsisten dengan jalur utama.

## Yang tidak berubah

- Skema keluaran (`match_score`, `recommendation`, `reasoning`, `strengths`, `weaknesses`) — **nol perubahan UI**
- `merged_skills`, `matching.py`, formula Jaccard
- Mekanisme cache fingerprint (hanya isinya bertambah versi)
- Alur status lamaran

## Pengujian

Berkas baru `backend/test_screening.py`:

1. `derive_verdict` di setiap ambang dan batasnya (34/35/59/60)
2. `clamp_score` menjepit di atas dan di bawah rentang; nilai di dalam rentang tidak berubah
3. `clamp_score` tidak pernah keluar 0–100 walau anchor ekstrem (0 atau 100)
4. Tooling tersaring dari blok "di luar jangkauan"; pencocokan case-insensitive
5. Skill yang sudah terbukti tidak muncul lagi di blok "di luar jangkauan"
6. `verified_skills` kosong → blok bukti tetap terbentuk tanpa error
7. `build_screening_prompt` memuat seluruh blok wajib dan menghormati cap CV
8. Sidik jari berubah ketika `PROMPT_VERSION` berubah
9. Regresi lama (53 test) tetap lulus

## Risiko

| Risiko | Penanganan |
|---|---|
| Verdict deterministik terasa kaku | Ambang batas jadi konstanta, mudah disetel setelah dipakai nyata |
| Model tetap menyebut tooling walau disaring | Disaring di data **dan** dilarang di aturan prompt (berlapis) |
| Cache lama tercampur | `PROMPT_VERSION` di fingerprint |
| Skor tetap bervariasi antar-panggilan | Dijepit ke `anchor ± 20`; sisa variasi ~10 poin dan tidak mengubah verdict selama tidak melewati ambang |
| Lowongan tanpa `required_skills` | `jaccard_score` mengembalikan 0.0, sehingga anchor 0 akan menjepit semua kandidat ke 0–20 dan otomatis `reject` — jelas keliru. **Keputusan:** bila `required_skills` kosong, anchor tidak bermakna → lewati penjepitan sepenuhnya dan biarkan model menilai dari CV + bukti. Prompt tidak memuat blok anchor pada kasus ini. |

## Di luar ruang lingkup (Tahap 2)

- Rincian per-syarat lowongan (terpenuhi/sebagian/tidak)
- Pertanyaan wawancara yang menyasar celah
- Field terpisah untuk klaim yang perlu divalidasi
- Perbandingan/peringkat antar pelamar
