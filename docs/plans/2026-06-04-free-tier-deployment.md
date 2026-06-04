# GitHire Free-Tier End-to-End Deployment Implementation Plan (Hugging Face)

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Deploy the GitHire monorepo (FastAPI backend + Next.js frontend + PostgreSQL) end-to-end to a 100% free-tier hosting stack (Neon, Hugging Face Spaces, and Vercel) without any credit card requirements.

**Architecture:** Use Neon for serverless PostgreSQL database hosting, Hugging Face Spaces for running the FastAPI backend Docker container (always-on, 24/7), and Vercel for hosting the Next.js frontend.

**Tech Stack:** Vercel (Frontend), Hugging Face Spaces (Backend), Neon (Database), Docker.

---

### Task 1: Initialize Neon PostgreSQL Database (COMPLETED)

**Files:**
- None

**Step 1: Create a Neon Project**
- Completed (project `githire-db` initialized).

**Step 2: Copy connection string**
- Completed (connection string obtained).

---

### Task 2: Restore Database Schema & Data to Neon (COMPLETED)

**Files:**
- Reference: [githire_backup.sql](file:///c:/Users/muham/Downloads/HACKATHON/githire_backup.sql)

**Step 1: Run SQL Restoration Locally**
- Completed (`githire_backup.sql` successfully restored to Neon).

---

### Task 3: Deploy FastAPI Backend on Hugging Face Spaces

**Files:**
- Reference: [Dockerfile](file:///c:/Users/muham/Downloads/HACKATHON/backend/Dockerfile)

**Step 1: Create a Hugging Face Space**
- Go to [https://huggingface.co](https://huggingface.co) and sign up/log in (completely free, no credit card required).
- Click on your profile picture (top right) -> **New Space**.
- Configure:
  - **Space Name:** `githire-backend`
  - **License:** `mit` (or choose another)
  - **Select the Space SDK:** **Docker**
  - **Choose a Docker template:** **Blank**
  - **Space Hardware:** **CPU basic (Free)**
  - **Visibility:** **Public** (required to access the API endpoint)
- Click **Create Space**.

**Step 2: Clone Space Locally and Copy Backend Code**
- In your local terminal, navigate outside your workspace directory and run:
  ```bash
  git clone https://huggingface.co/spaces/YOUR_HF_USERNAME/githire-backend
  ```
- Copy all files and folders inside your project's `/backend` directory directly into the cloned `githire-backend` folder. The folder structure inside `githire-backend` must look like:
  - `app/` (directory)
  - `Dockerfile` (file)
  - `requirements.txt` (file)
  - `nixpacks.toml` (file)
  - etc.
- In the cloned `githire-backend` directory, commit and push the changes:
  ```bash
  git add .
  git commit -m "feat: initial backend deployment"
  git push
  ```

**Step 3: Add Repository Secrets in Hugging Face**
- Go to your Space on Hugging Face, click the **Settings** tab.
- Scroll down to the **Variables and secrets** section.
- Click **New secret** to add the following environment variables:
  - `DATABASE_URL` = `postgresql://neondb_owner:npg_N29QEYeVHKho@ep-misty-wildflower-aod7txov-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
  - `GEMINI_API_KEY` = *[Your Gemini API Key]*
  - `CLERK_JWKS_URL` = *[Your Clerk JWKS URL]*
  - `CLERK_ISSUER` = *[Your Clerk Issuer]*
  - `CORS_ORIGINS` = `http://localhost:3000` (temporary placeholder)
- Once pushed and secrets are saved, the Space will rebuild automatically.
- Copy your direct backend URL. In Hugging Face, the direct API URL format is: `https://YOUR_HF_USERNAME-githire-backend.hf.space` (Note: remove `spaces/` and the colon from the standard Space URL).

---

### Task 4: Deploy Next.js Frontend on Vercel

**Files:**
- None

**Step 1: Import Frontend to Vercel**
- Go to [https://vercel.com](https://vercel.com) and log in.
- Click **Add New** -> **Project**.
- Select your forked repository `HACKATHON` from the GitHub list.

**Step 2: Configure Project Settings**
- Name: `githire-frontend`
- Framework Preset: **Next.js**
- Root Directory: Click **Edit** and select the `/linkify` directory.

**Step 3: Configure Environment Variables**
- Add the following environment variables:
  - `NEXT_PUBLIC_APP_NAME` = `GitHire`
  - `NEXT_PUBLIC_API_URL` = `https://YOUR_HF_USERNAME-githire-backend.hf.space` (Replace with your actual Hugging Face direct Space endpoint)
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = *[Your Clerk Publishable Key]*
  - `CLERK_SECRET_KEY` = *[Your Clerk Secret Key]*
- Click **Deploy** and wait for the build to finish.
- Copy your generated Vercel Frontend URL (e.g., `https://githire-frontend.vercel.app`).

---

### Task 5: Link CORS Domains

**Files:**
- None

**Step 1: Update Hugging Face Space CORS Secrets**
- Go back to your Hugging Face Space settings.
- Navigate to **Variables and secrets**.
- Edit the `CORS_ORIGINS` secret.
- Change the value from `http://localhost:3000` to your actual Vercel frontend URL (e.g., `https://githire-frontend.vercel.app`).
- Saving the secret will automatically trigger a reload and apply the CORS configuration.

---

### Task 6: End-to-End Live Verification

**Files:**
- None

**Step 1: Test Backend Health**
- Open `https://YOUR_HF_USERNAME-githire-backend.hf.space/health` in your browser.
- Verify the JSON output reads `{"status":"ok"}`.

**Step 2: Test Frontend & Integrations**
- Go to your Vercel Frontend URL (e.g., `https://githire-frontend.vercel.app`).
- Verify that you can browse the home page, log in via Clerk, and successfully fetch job list data from the database.
