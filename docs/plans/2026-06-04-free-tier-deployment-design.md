# GitHire Free-Tier End-to-End Deployment Design (Hugging Face Stack)

This document outlines the architecture, configuration, and step-by-step design for deploying the GitHire monorepo (FastAPI backend + Next.js frontend + PostgreSQL) using a 100% free hosting stack (Neon for Database, Hugging Face Spaces for Backend, and Vercel for Frontend) without requiring any credit card verification.

## 1. System Architecture

```mermaid
graph TD
    subgraph Deployed Cloud
        HFBackend[Hugging Face Space FastAPI Backend]
        VercelFE[Vercel Next.js Frontend]
    end
    NeonDB[(Neon Postgres Database)]
    
    NeonDB -.-->|DATABASE_URL| HFBackend
    HFBackend -.-->|Allow CORS| VercelFE
    VercelFE -.-->|API Requests| HFBackend
    
    LocalFS[Local Repository] -->|Push backend/ files| HFBackend
    GitHub[GitHub Forked Repo] -->|Deploy Branch /linkify| VercelFE
```

* **Database Layer:** Neon PostgreSQL (Serverless Postgres with a free tier).
* **Backend Layer:** Hugging Face Space (Running our backend as a Docker container, always-on, 100% free with no credit card required).
* **Frontend Layer:** Vercel Next.js Hosting (100% free with no credit card required).

---

## 2. Environment Variables Configuration

### Hugging Face Space Backend (`/backend` code)

These variables will be configured in the Hugging Face Space settings under **Repository Secrets**:

| Variable | Value | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` (from Neon) | Database connection string |
| `GEMINI_API_KEY` | *User Provided* | AI resume screening functionality |
| `CORS_ORIGINS` | `https://githire-frontend.vercel.app` | Allow cross-origin requests from Vercel frontend |
| `CLERK_JWKS_URL` | `https://<your-clerk-instance>.well-known/jwks.json` | Token verification for route authentication |
| `CLERK_ISSUER` | `https://<your-clerk-instance>` | Token issuer validation |

### Vercel Frontend (`/linkify` project)

These variables will be configured in the Vercel project dashboard:

| Variable | Value | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | `GitHire` | Application branding |
| `NEXT_PUBLIC_API_URL` | `https://<hf-user>-<space-name>.hf.space` | Direct API endpoint for fetching backend routes |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | *User Provided* | Clerk Auth client-side initialization |
| `CLERK_SECRET_KEY` | *User Provided* | Clerk Auth server-side API calls |

---

## 3. Deployment Flow

1. **Database (Neon):**
   - Create a project on Neon.
   - Use the connection string to restore `githire_backup.sql` locally to Neon.
2. **Backend (Hugging Face Space):**
   - Create a new Space on Hugging Face (SDK: Docker, template: Blank).
   - Push the contents of the `backend/` folder to the Space's Git repository.
   - Set up the environment variables under **Settings** -> **Variables and secrets**.
3. **Frontend (Vercel):**
   - Import the GitHub fork.
   - Set Root Directory to `linkify` and Framework to `Next.js`.
   - Populate environment variables (pointing to the Hugging Face Space direct endpoint).
   - Update `CORS_ORIGINS` back in the Hugging Face Space secrets.
