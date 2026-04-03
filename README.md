# GitHire 🚀

Platform AI-powered job matching untuk fresh graduate Indonesia — menghubungkan skill GitHub & CV dengan lowongan kerja yang relevan.

## 📁 Struktur Proyek

```
githire/
├── backend/          # FastAPI + Python (REST API)
└── linkify/          # Next.js 14 (Frontend)
```

## ⚙️ Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python, SQLAlchemy |
| Database | PostgreSQL (Docker) |
| Auth | Clerk (JWT RS256) |
| AI | Google Gemini API |
| Scraper | Selenium (Glints) |

## 🚦 Cara Menjalankan

### 1. Database (Docker)
```bash
docker-compose up -d
```

### 2. Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
cp .env.example .env        # Isi variabel .env
uvicorn app.main:app --reload
```

### 3. Frontend
```bash
cd linkify
npm install
cp .env.example .env.local  # Isi variabel .env.local
npm run dev
```

## 🔑 Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://githire:githire@localhost:5432/githire
GEMINI_API_KEY=your_gemini_key
GITHUB_TOKEN=your_github_token
CLERK_JWKS_URL=https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json
CLERK_ISSUER=https://your-clerk-domain.clerk.accounts.dev
CORS_ORIGINS=http://localhost:3000
ADMIN_SECRET=your_admin_secret
```

### Frontend (`linkify/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

## 🌟 Fitur Utama

- 🔍 **Job Matching** — Cocokkan skill GitHub + CV dengan lowongan kerja
- 📊 **Skill Gap Analysis** — Identifikasi skill yang perlu dipelajari
- 🗺️ **Learning Roadmap** — Rencana belajar personal per job
- 📝 **Cover Letter Generator** — Surat lamaran otomatis via Gemini AI
- 📋 **Application Tracker** — Pantau status lamaran kerja

## 👥 Tim

Hackathon Project — 2026
