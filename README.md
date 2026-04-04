# GitHire 🚀

> **From code to career.** Platform rekrutmen berbasis AI yang menghubungkan developer Indonesia dengan pekerjaan yang benar-benar sesuai kemampuan mereka.

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://typescriptlang.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-4285F4?logo=google)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📌 Tentang GitHire

GitHire hadir untuk menjawab tantangan nyata yang dihadapi fresh graduate dan junior developer Indonesia: proses melamar kerja yang tidak transparan, rekomendasi pekerjaan yang tidak relevan, dan sulitnya memahami apa yang harus dipelajari untuk memenuhi kualifikasi sebuah posisi.

GitHire menganalisis **aktivitas GitHub nyata** dan **isi CV** untuk membangun profil skill yang akurat, lalu mencocokkannya dengan 100+ lowongan IT aktif menggunakan algoritma Jaccard Similarity dan kecerdasan buatan Gemini.

---

## ✨ Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| 🔗 **GitHub Sync** | Ekstrak skill otomatis dari repositori, bahasa pemrograman, dan kontribusi |
| 📄 **CV Upload** | Parse CV PDF dengan AI untuk ekstrak pengalaman, pendidikan, dan skill |
| 🎯 **Match Score** | Skor kecocokan Jaccard Similarity per lowongan, transparan dan jujur |
| 📊 **Skill Gap** | Identifikasi skill yang paling banyak dibutuhkan industri tapi belum dimiliki |
| 🗺️ **AI Roadmap** | Rencana belajar personal per lowongan yang diinginkan |
| ✉️ **Cover Letter AI** | Generate surat lamaran profesional dalam hitungan detik |
| 📋 **Application Tracker** | Pantau status semua lamaran dalam satu tempat |

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT (Browser)                     │
│              Next.js 14 + TypeScript + Clerk             │
└──────────────────────────┬──────────────────────────────┘
                           │ REST API (JSON)
┌──────────────────────────▼──────────────────────────────┐
│                   BACKEND (FastAPI)                      │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ GitHub API  │  │  Gemini AI   │  │  PDF Parser   │  │
│  │  (Skills)   │  │  (Roadmap,   │  │  (CV Skills)  │  │
│  │             │  │  Cover Letter│  │               │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          Jaccard Similarity Engine                │  │
│  │       (Job Matching & Skill Gap Analysis)         │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    PostgreSQL Database                    │
│         (Users, Profiles, Jobs, Applications)            │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Alur Pengguna

```
1. Daftar / Masuk (Clerk Auth)
        ↓
2. Hubungkan GitHub URL + Upload CV PDF
        ↓
3. AI menganalisis GitHub + CV → Merged Skill Profile
        ↓
4. 100+ lowongan diranking berdasarkan Match Score
        ↓
5. Lihat Skill Gap + Generate Roadmap per Job
        ↓
6. Generate Cover Letter → Apply → Lacak Status
```

---

## 🛠️ Tech Stack

### Frontend
| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| Next.js | 14 | Framework React (App Router) |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| Clerk | Latest | Autentikasi & manajemen user |
| TanStack Query | 5.x | Server state management |
| Shadcn/UI | Latest | UI components |
| Lucide React | Latest | Icon library |

### Backend
| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| FastAPI | 0.100+ | REST API framework |
| Python | 3.11+ | Bahasa pemrograman |
| SQLAlchemy | 2.x | ORM |
| PostgreSQL | 15 | Database |
| PyMuPDF | Latest | PDF parsing |
| Google Gemini | Latest | AI (roadmap & cover letter) |
| GitHub API | v3 | Ekstraksi skill dari GitHub |
| Selenium | Latest | Web scraping Glints |
| Clerk SDK | Latest | JWT verification |

---

## 📁 Struktur Proyek

```
HACKATHON/
├── backend/                  # FastAPI Backend
│   ├── app/
│   │   ├── main.py           # Entry point
│   │   ├── routers/          # API routes
│   │   │   ├── profiles.py   # GitHub sync & CV upload
│   │   │   ├── jobs.py       # Job listing & matching
│   │   │   ├── skills.py     # Skill gap analysis
│   │   │   ├── roadmap.py    # AI roadmap generation
│   │   │   ├── cover_letter.py # AI cover letter
│   │   │   └── applications.py # Application tracker
│   │   ├── services/
│   │   │   ├── github_service.py   # GitHub API integration
│   │   │   ├── gemini_service.py   # Gemini AI integration
│   │   │   └── cv_parser.py        # PDF skill extraction
│   │   ├── models.py         # SQLAlchemy models
│   │   └── database.py       # DB connection
│   ├── requirements.txt
│   └── .env.example
│
├── linkify/                  # Next.js Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── (marketing)/  # Landing, About, How It Works
│   │   │   ├── (main)/       # Dashboard pages
│   │   │   └── auth/         # Sign-in, Sign-up, Forgot password
│   │   ├── components/       # Reusable UI components
│   │   ├── hooks/            # Custom React hooks
│   │   └── utils/            # Helper functions & constants
│   ├── package.json
│   └── .env.example
│
├── docker-compose.yml        # PostgreSQL container
└── README.md
```

---

## 🚦 Cara Menjalankan Lokal

### Prasyarat
- Node.js 18+
- Python 3.11+
- Docker Desktop
- Git

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/githire.git
cd githire
```

### 2. Jalankan Database (Docker)
```bash
docker-compose up -d
```

### 3. Setup Backend
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Isi variabel di .env (lihat bagian Environment Variables)

uvicorn app.main:app --reload --port 8000
```

### 4. Setup Frontend
```bash
cd linkify
npm install
cp .env.example .env.local
# Isi variabel di .env.local

npm run dev
```

Aplikasi berjalan di:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🔑 Environment Variables

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://githire:githire@localhost:5432/githire
GEMINI_API_KEY=your_gemini_api_key
GITHUB_TOKEN=your_github_personal_access_token
CLERK_JWKS_URL=https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://your-clerk-domain.clerk.accounts.dev
CORS_ORIGINS=http://localhost:3000
ADMIN_SECRET=your_admin_secret_key
```

### Frontend (`linkify/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/auth/auth-callback
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/auth/auth-callback
```

---

## 📡 API Endpoints

### Profile
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `POST` | `/profiles/sync` | Sync GitHub + Upload CV |
| `GET` | `/me/profile` | Ambil profil pengguna |
| `PUT` | `/me/interests` | Update minat bidang |

### Jobs
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/jobs` | List semua lowongan |
| `GET` | `/jobs/recommended` | Lowongan diranking by match score |
| `GET` | `/jobs/{id}` | Detail lowongan |

### Skills & AI
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/skills/gap` | Analisis skill gap |
| `POST` | `/roadmap/generate` | Generate roadmap AI per job |
| `POST` | `/cover-letter/generate` | Generate cover letter AI |

### Applications
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| `GET` | `/applications` | List semua lamaran |
| `POST` | `/applications` | Tambah lamaran baru |
| `PATCH` | `/applications/{id}` | Update status lamaran |

---

## 👥 Tim

| Nama | Peran |
|------|-------|
| **Muhammad Rozagi** | Team Lead · Fullstack Developer |
| **Regina Adelisa** | Data Analyst & Research |
| **Ahmad Zul Zhafran** | Frontend Developer |
| **Salsadilla Azizi Firda** | UI/UX Designer |

---

## 🎯 Dibuat untuk

Hackathon 2026 — Platform karir berbasis AI untuk developer Indonesia.

---

## 📄 Lisensi

MIT License — lihat [LICENSE](LICENSE) untuk detail.
