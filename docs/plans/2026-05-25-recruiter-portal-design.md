# Design Document: AI Recruiter Portal (GitHire)

Tanggal: 2026-05-25  
Status: Approved  

---

## 1. Latar Belakang & Tujuan
Fitur ini dirancang untuk melengkapi platform GitHire dari sisi **Recruiter / Perusahaan (pembuat lowongan kerja)**. Recruiter hanya dapat mengelola lowongan yang mereka buat sendiri secara tertutup (*multi-tenant*), memantau daftar pelamar, meninjau profil portofolio GitHub kandidat secara instan, melakukan skoring kecocokan otomatis (*AI Candidate Screening*), serta mengunduh resume Word (.docx) berformat Harvard ATS Style yang rapi milik pelamar.

---

## 2. Struktur Data & Perubahan Skema Database
Untuk membatasi kepemilikan lowongan dan memisahkan alur peran pengguna, kita akan memodifikasi model database di [models.py](file:///c:/Users/muham/Downloads/HACKATHON/backend/app/models.py):

### A. Tabel `users`
* Menambahkan kolom `role` untuk membedakan peran:
  ```python
  role: Mapped[str] = mapped_column(String(20), default="candidate")  # "candidate" | "recruiter"
  ```

### B. Tabel `jobs`
* Menambahkan kolom `recruiter_id` sebagai Foreign Key yang mencatat siapa pembuat lowongan tersebut:
  ```python
  recruiter_id: Mapped[uuid.UUID | None] = mapped_column(
      UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
  )
  ```

---

## 3. Rancangan API Endpoints (Backend)
Rute backend baru akan diimplementasikan di `backend/app/routers/recruiter.py` atau disematkan ke router yang relevan:

### A. Lowongan Kerja (Jobs)
* `POST /jobs` (Khusus Recruiter)
  * Menambahkan lowongan kerja baru. `recruiter_id` akan diisi secara otomatis dari token pengguna aktif.
* `GET /jobs/my-jobs` (Khusus Recruiter)
  * Mengembalikan daftar lowongan yang dibuat oleh recruiter yang sedang login (`recruiter_id == user.id`).

### B. Pelamar & Status Lamaran
* `GET /jobs/my-jobs/{job_id}/applications` (Khusus Recruiter)
  * Mengembalikan daftar kandidat yang melamar (`JobApplication`) pada pekerjaan tertentu, beserta profil ringkas dan status.
* `PUT /jobs/applications/{application_id}/status` (Khusus Recruiter)
  * Memperbarui status lamaran (`status: applied | interview | offer | rejected`) dan memperbarui note opsional.

### C. AI Candidate Screening & Insights
* `POST /jobs/applications/{application_id}/ai-screening` (Khusus Recruiter)
  * Menggunakan Gemini AI untuk membandingkan deskripsi pekerjaan dengan `cv_data` dan `merged_skills` kandidat untuk menghasilkan:
    * **Match Score (%)**
    * **Kelebihan** (2-3 poin ringkas)
    * **Kelemahan** (1 poin ringkas)

---

## 4. Rancangan Antarmuka Pengguna (Frontend UI)
Integrasi antarmuka recruiter akan dibangun di bawah dashboard Next.js:

### A. Deteksi Role & Sidebar Dinamis
* Komponen Sidebar (`linkify/src/components/dashboard/dashboard-shell.tsx`) akan memuat profil pengguna saat pertama kali dijalankan.
* Jika `profile.role === "recruiter"`, sidebar menu akan diubah secara dinamis untuk menampilkan navigasi khusus recruiter:
  1. **Lowongan Saya** (`/dashboard/recruiter/jobs`)
  2. **Buat Lowongan Baru** (`/dashboard/recruiter/jobs/new`)

### B. Tampilan Halaman "Lowongan Saya"
* Menampilkan daftar kartu lowongan kerja yang aktif dibuat oleh recruiter beserta jumlah pelamar yang melamar pada lowongan tersebut.
* Klik kartu lowongan kerja untuk membuka rincian pelamar.

### C. Tampilan Detail Pelamar & AI Insights (WOW Factor Panel)
Saat pelamar diklik di daftar lowongan, sebuah panel detail pelamar akan terbuka di sebelah kanan dengan tab premium:
* **Tab 1: AI Match Analysis**:
  * Menampilkan visual ring progresif persentase Match Score dari Gemini AI.
  * Menampilkan kelebihan dan kelemahan profil kandidat terhadap kriteria lowongan.
* **Tab 2: GitHub Developer Signals**:
  * Menampilkan diagram bundar bahasa pemrograman terpopuler kandidat.
  * Statistik GitHub: repositori publik, stars, followers.
  * Status keaslian sinyal aktivitas GitHub kandidat.
* **Tab 3: Resume & Download**:
  * Menampilkan data terstruktur CV kandidat (Pendidikan, Pengalaman, Organisasi, Sertifikat) dalam format visual kartu.
  * Tombol **"Unduh CV (.docx)"** untuk mengekspor dokumen Word berformat Harvard ATS Style secara instan dari sisi recruiter.

---

## 5. Rencana Akun Demo (Pre-seeded Demo Account)
Untuk kemudahan pengujian saat demo/penjurian, kita akan membuat satu akun recruiter demo bawaan melalui startup migration di `main.py`:
* **Email**: `recruiter@githire.com`
* **Role**: `"recruiter"`
* **Lowongan bawaan**: Menghubungkan 2 lowongan demo (misalnya: *Frontend React Developer* & *Backend Python Engineer*) ke akun recruiter ini di database, lengkap dengan data lamaran demo agar recruiter langsung melihat alur kerja lengkap tanpa harus menanti pendaftaran manual kandidat.
