# GitHire Railway Deployment Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Deploy the GitHire monorepo (FastAPI backend + Next.js frontend + PostgreSQL) end-to-end to Railway from a forked GitHub repository.

**Architecture:** Use a single Railway project with three services (PostgreSQL, FastAPI Backend, Next.js Frontend) to allow secure, low-latency, and seamless environment variable reference mapping.

**Tech Stack:** Dockerfile (Backend), Nixpacks (Frontend), PostgreSQL (Database), Railway Git Integration.

---

### Task 1: GitHub Repository Forking & Setup

**Files:**
- None (Manual setup in GitHub and Railway dashboard)

**Step 1: Fork the Repository**
- Log in to your target GitHub account (Account B).
- Navigate to: `https://github.com/zgii14/HACKATHON`
- Click the **Fork** button in the top right corner.
- Ensure the destination is set to your Account B space and click **Create fork**.
- Copy the fork URL: `https://github.com/AccountB/HACKATHON`.

**Step 2: Connect GitHub Account to Railway**
- Open the Railway dashboard: `https://railway.app`.
- Log in and navigate to your account settings or team settings.
- Under **Integrations**, ensure GitHub is connected. If you need to connect the new account, log out/in or manage your GitHub app installations to authorize Railway access to `AccountB/HACKATHON`.

**Step 3: Commit verification**
- Verify that your fork is successfully created and visible under Account B's repositories.

---

### Task 2: Railway Project & Database Service Initialization

**Files:**
- None (Railway dashboard actions)

**Step 1: Create a Railway Project**
- In the Railway dashboard, click **New Project**.
- Select **Provision PostgreSQL** from the dropdown menu (this creates a project with a Postgres service pre-installed).
- Wait for the PostgreSQL service to initialize.

**Step 2: Gather PostgreSQL Connection Variables**
- Click on the newly created **PostgreSQL** service block.
- Navigate to the **Variables** tab.
- Observe the generated environment variables (`DATABASE_URL`, `PGPASSWORD`, `PGPORT`, etc.).

---

### Task 3: Deploy FastAPI Backend Service

**Files:**
- Modify: [railway.toml](file:///c:/Users/muham/Downloads/HACKATHON/backend/railway.toml) (already configured)
- Modify: [Dockerfile](file:///c:/Users/muham/Downloads/HACKATHON/backend/Dockerfile) (already configured)

**Step 1: Add Backend Service from Github**
- In the Railway canvas, click **+ Add** -> **Github Repo**.
- Select your forked repository `HACKATHON`.
- Close the sidebar and click on the newly added service card.
- Go to the **Settings** tab:
  - Rename the service to `githire-backend`.
  - Under **General**, set the **Root Directory** to `/backend`.
  - Under **Build**, make sure the builder configuration references the Dockerfile (it will detect `railway.toml` automatically).

**Step 2: Configure Environment Variables**
- Navigate to the **Variables** tab of `githire-backend` and click **New Variable**.
- Add the following environment variables:
  - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (Use the auto-complete dropdown to reference the PostgreSQL service)
  - `CORS_ORIGINS` = `https://<temp-placeholder-url-until-frontend-deployed>` (we will update this once frontend is deployed)
  - `GEMINI_API_KEY` = `YOUR_GEMINI_API_KEY`
  - `CLERK_JWKS_URL` = `https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json`
  - `CLERK_ISSUER` = `https://your-clerk-instance.clerk.accounts.dev`
- Click **Deploy** to save changes.

**Step 3: Generate Public Domain for Backend**
- Go to the **Settings** tab of `githire-backend`.
- Under **Networking**, click **Generate Domain** (e.g. `githire-backend-production.up.railway.app`).
- Copy this domain URL; we will need it for the frontend's environment variables.

---

### Task 4: Deploy Next.js Frontend Service

**Files:**
- Modify: [railway.toml](file:///c:/Users/muham/Downloads/HACKATHON/linkify/railway.toml) (already configured)

**Step 1: Add Frontend Service from Github**
- In the Railway canvas, click **+ Add** -> **Github Repo**.
- Select the same forked repository `HACKATHON`.
- Click on the newly added service card.
- Go to the **Settings** tab:
  - Rename the service to `githire-frontend`.
  - Under **General**, set the **Root Directory** to `/linkify`.
  - Under **Build**, make sure the builder uses Nixpacks (it will detect `linkify/railway.toml` automatically).

**Step 2: Configure Environment Variables**
- Navigate to the **Variables** tab of `githire-frontend` and click **New Variable**.
- Add the following environment variables:
  - `NEXT_PUBLIC_APP_NAME` = `GitHire`
  - `NEXT_PUBLIC_API_URL` = `https://githire-backend-production.up.railway.app` (Replace with your backend's actual generated domain)
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `YOUR_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY` = `YOUR_CLERK_SECRET_KEY`
- Click **Deploy** to save changes.

**Step 3: Generate Public Domain for Frontend & Link CORS**
- Go to the **Settings** tab of `githire-frontend`.
- Under **Networking**, click **Generate Domain** (e.g. `githire-frontend-production.up.railway.app`).
- Copy this domain URL.
- Go back to the **Backend Service** (`githire-backend`), navigate to **Variables**, and update `CORS_ORIGINS` to `https://githire-frontend-production.up.railway.app`.

---

### Task 5: Database Seeding & Data Restoration

**Files:**
- Reference: [githire_backup.sql](file:///c:/Users/muham/Downloads/HACKATHON/githire_backup.sql)

**Step 1: Get Postgres Public connection string**
- Click on the **PostgreSQL** service card in Railway.
- Go to the **Variables** tab.
- Click the reveal icon next to `DATABASE_PUBLIC_URL` and copy the value.

**Step 2: Run SQL Restoration Locally**
- Open your local terminal or PowerShell command line.
- Execute the following command (substituting your actual `DATABASE_PUBLIC_URL`):
  ```powershell
  psql -d "postgresql://postgres:PASSWORD@HOST:PORT/railway" -f githire_backup.sql
  ```
- Wait for the tables and pre-seeded database records to be restored.

**Step 3: Verification**
- In the Railway PostgreSQL dashboard view, click the **Data** tab to verify that tables (e.g., `users`, `jobs`, `applications`) exist and contain data.

---

### Task 6: End-to-End Live Verification

**Files:**
- None

**Step 1: Test Backend Health**
- Navigate to `https://githire-backend-production.up.railway.app/health` in your browser.
- Expected response: `{"status":"ok"}` (or similar JSON confirming connection to database).

**Step 2: Test Frontend Page**
- Open `https://githire-frontend-production.up.railway.app` in your browser.
- Confirm the GitHire home page renders correctly.
- Test login using Clerk authentication.
- Perform a search or profile update to confirm successful CORS communication with the backend.
