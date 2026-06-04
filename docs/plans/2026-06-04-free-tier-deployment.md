# GitHire Free-Tier End-to-End Deployment Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Deploy the GitHire monorepo (FastAPI backend + Next.js frontend + PostgreSQL) end-to-end to a free-tier hosting stack (Neon, Render, and Vercel).

**Architecture:** Use Neon for serverless PostgreSQL database hosting, Render for running the FastAPI backend Docker container, and Vercel for hosting the static Next.js frontend.

**Tech Stack:** Vercel (Frontend), Render Web Services (Backend), Neon (Database), Docker.

---

### Task 1: Initialize Neon PostgreSQL Database

**Files:**
- None

**Step 1: Create a Neon Project**
- Go to [https://neon.tech](https://neon.tech) and sign up/log in (completely free, no credit card required).
- Click **Create a project**.
- Name the project `githire-db`.
- Select your preferred region and click **Create Project**.

**Step 2: Copy connection string**
- In the Neon dashboard, find the **Connection Details** panel.
- Select **PostgreSQL** dialect and make sure **Pooled connection** is enabled or copy the main connection string.
- Copy the Connection String URL (it will look like: `postgresql://neondb_owner:PASSWORD@ep-xxx.region.pooler.neon.tech/neondb?sslmode=require`).
- Save this connection string as it will be used for local seeding and backend environment variables.

---

### Task 2: Restore Database Schema & Data to Neon

**Files:**
- Reference: [githire_backup.sql](file:///c:/Users/muham/Downloads/HACKATHON/githire_backup.sql)

**Step 1: Run SQL Restoration Locally**
- Open your local terminal or PowerShell command line.
- Execute the following command, pasting your Neon connection string:
  ```powershell
  psql -d "postgresql://neondb_owner:PASSWORD@ep-xxx.region.pooler.neon.tech/neondb?sslmode=require" -f githire_backup.sql
  ```
- Wait for the schema and data to be restored successfully.

**Step 2: Verification**
- Go to the Neon Dashboard and click on the **SQL Editor** tab.
- Run a simple query like `SELECT * FROM users;` or `SELECT * FROM jobs;` to verify the tables are populated.

---

### Task 3: Deploy FastAPI Backend on Render

**Files:**
- Reference: [Dockerfile](file:///c:/Users/muham/Downloads/HACKATHON/backend/Dockerfile)

**Step 1: Create Web Service on Render**
- Go to [https://render.com](https://render.com) and log in.
- Click **New +** -> **Web Service**.
- Select **Build and deploy from a Git repository**.
- Connect your GitHub account and select your forked repository `HACKATHON`.

**Step 2: Configure Build Settings**
- Name: `githire-backend`
- Region: Select a region close to your Neon database.
- Branch: `master`
- Root Directory: `backend`
- Runtime: **Docker** (it will automatically pick up `backend/Dockerfile`)
- Instance Type: **Free**

**Step 3: Configure Environment Variables**
- Click **Advanced** and add the following variables:
  - `DATABASE_URL` = *[Your Neon connection string]*
  - `GEMINI_API_KEY` = *[Your Gemini API Key]*
  - `CLERK_JWKS_URL` = *[Your Clerk JWKS URL]*
  - `CLERK_ISSUER` = *[Your Clerk Issuer URL]*
  - `CORS_ORIGINS` = `https://<temp-placeholder-url-until-frontend-deployed>`
- Click **Create Web Service** to start the build and deployment process.
- Copy your generated Render URL (e.g., `https://githire-backend.onrender.com`).

---

### Task 4: Deploy Next.js Frontend on Vercel

**Files:**
- None

**Step 1: Import Project to Vercel**
- Go to [https://vercel.com](https://vercel.com) and log in.
- Click **Add New** -> **Project**.
- Select your forked repository `HACKATHON` from the GitHub list.

**Step 2: Configure Project settings**
- Framework Preset: **Next.js**
- Root Directory: Click **Edit** and select the `/linkify` directory.
- Build and Output Settings: Default (npm run build).

**Step 3: Configure Environment Variables**
- Add the following environment variables:
  - `NEXT_PUBLIC_APP_NAME` = `GitHire`
  - `NEXT_PUBLIC_API_URL` = `https://githire-backend.onrender.com` (Replace with your actual Render backend URL)
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = *[Your Clerk Publishable Key]*
  - `CLERK_SECRET_KEY` = *[Your Clerk Secret Key]*
- Click **Deploy** and wait for the build to finish.
- Copy your generated Vercel URL (e.g. `https://githire-frontend.vercel.app`).

---

### Task 5: Link CORS Domains

**Files:**
- None

**Step 1: Update Render CORS Origins**
- Go to your Render Dashboard and open the `githire-backend` service settings.
- Navigate to the **Environment** tab.
- Edit the value of the `CORS_ORIGINS` variable.
- Replace the temporary URL with your actual Vercel frontend URL (e.g. `https://githire-frontend.vercel.app`).
- Click **Save Changes** (Render will automatically redeploy with the new settings).

---

### Task 6: End-to-End Live Verification

**Files:**
- None

**Step 1: Test Backend Health**
- Open `https://githire-backend.onrender.com/health` in your browser.
- Verify the JSON output reads `{"status":"ok"}`.

**Step 2: Test Frontend & Integrations**
- Go to your Vercel URL (e.g. `https://githire-frontend.vercel.app`).
- Verify that you can browse the home page, log in via Clerk, and successfully fetch job list data from the backend.
