# GitHub Connect via Clerk: Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Candidates connect GitHub through Clerk (sign in with GitHub, or connect from the Data GitHub & CV page); the typed GitHub field disappears; CV sync works without GitHub; GitHub-only features and recruiter/public views show verification state.

**Architecture:** Clerk owns OAuth (`authenticateWithRedirect` for sign-in/up, `user.createExternalAccount` for connecting). After Clerk returns, the frontend calls `POST /profiles/github/connect`; the backend reads the verified identity from Clerk. One `GithubConnection` component owns the three states and the connect logic.

**Tech Stack:** Next.js 14, `@clerk/nextjs`, React Query, Tailwind, lucide-react (already a dependency, has `Github`).

Spec: `docs/superpowers/specs/2026-10-13-github-connect-via-clerk-design.md`. Backend (shipped, commit `adaf866`): `github_connection` on `/me/profile`; `POST /profiles/github/connect` (404 `{code:"GITHUB_NOT_CONNECTED"}`, 409 duplicate, 503); `POST /profiles/sync` with optional `cv`; portfolio generate 409 `{code:"GITHUB_REQUIRED"}`; `github_verified` on recruiter payloads and `GET /portfolios/{id}`.

## Global Constraints
- No new dependencies. Violet theme and typography tokens unchanged; Workbench style.
- Never send a GitHub username from the browser as identity (the field is removed).
- No em-dash in new copy. Indonesian copy.
- The frontend has no test runner: verify with `npx tsc --noEmit`, `next lint` on changed files, `next build`, then manual E2E on production by the owner.
- Do NOT push until the user approves. After the frontend ships, a follow-up backend commit stops honoring `github_url` in `/profiles/sync`.

---

### Task 1: Error codes from the API

**Files:** `linkify/src/lib/errors.ts`, `linkify/src/lib/api.ts`.

- [ ] `errors.ts`: add `export async function parseApiErrorDetail(res: Response): Promise<{ message: string; code?: string }>` that handles the existing formats plus `{ detail: { code, message } }` (returns both). Re-implement `parseApiError` as `(await parseApiErrorDetail(res)).message`.
- [ ] `api.ts`: `ApiError` gains `code?: string` (constructor `(message, status, code?)`); `apiFetch` and `apiFetchBlob` use `parseApiErrorDetail` and pass `code`.
- [ ] `tsc` passes. Commit `feat(api): surface structured error codes`.

### Task 2: OAuth provider buttons (Google + GitHub)

**Files:** rename `linkify/src/components/auth/google-auth-button.tsx` → `oauth-button.tsx` (git mv), update `signin-form.tsx`, `signup-form.tsx`.

- [ ] Component `OAuthButton({ provider: "google" | "github", mode, disabled })`. `strategy = provider === "google" ? "oauth_google" : "oauth_github"`. Same redirect handling as today (`/auth/sso-callback` then `/auth/auth-callback?redirect_url=...`). Icon: existing inline Google SVG; lucide `Github` for GitHub. Labels "Continue with Google" / "Continue with GitHub" (match existing English auth copy). Toast on failure names the provider.
- [ ] `signin-form.tsx` / `signup-form.tsx`: render GitHub button first, then Google, stacked with `space-y-2`.
- [ ] Update the `sso-callback` comment ("setelah Google") to "setelah provider OAuth".
- [ ] `tsc` + lint. Commit `feat(auth): sign in with GitHub`.

### Task 3: `GithubConnection` component

**Files:** create `linkify/src/components/onboarding/github-connection.tsx`.

Props: `{ connection: "verified" | "legacy_unverified" | "none"; username: string | null; verifiedAt: string | null; hasPublishedPortfolio?: boolean }`.

Behavior:
- `connectWithGithub()`: `const ea = await user.createExternalAccount({ strategy: "oauth_github", redirectUrl: "/dashboard/onboarding?github=connected" }); window.location.href = ea.verification!.externalVerificationRedirectURL!.href;`. If Clerk already has an unverified GitHub account, call `ea.reauthorize({ redirectUrl })` on that account instead. Errors → toast.
- `linkToProfile()` mutation: `withAuth("/profiles/github/connect", { method: "POST" })`; on success invalidate `["profile"]`, `["me"]`, `["skill-gap"]`, `["jobs","recommended"]`, `["portfolio"]`, toast "GitHub terhubung sebagai @login". On `ApiError` 409 → toast backend message; `code === "GITHUB_NOT_CONNECTED"` → toast "Login GitHub belum selesai. Coba hubungkan lagi."
- Auto-link once (ref guard) when either `?github=connected` is in the URL, or the Clerk user has a GitHub external account with `verification.status === "verified"` while `connection !== "verified"` (covers users who signed up with GitHub). Remove the query param with `router.replace("/dashboard/onboarding")` after the attempt.
- "Ganti akun GitHub": confirm via existing `confirmDestructive` (text mentions the public portfolio will be unpublished when one is published), then `await githubAccount.destroy()` and `connectWithGithub()`.
- Rendering (Workbench, hairline block like the existing profile card):
  - `none`: title "GitHub belum terhubung", body "Hubungkan GitHub untuk verifikasi skill dari repo, portfolio, dan label terverifikasi di mata recruiter. GitHire hanya membaca data publik.", primary button with `Github` icon "Hubungkan GitHub".
  - `legacy_unverified`: `@username` + amber label "Belum diverifikasi", body "Username ini diketik manual. Verifikasi dengan login GitHub agar recruiter melihat label terverifikasi.", button "Verifikasi dengan GitHub".
  - `verified`: `@username` + emerald label "Terverifikasi" + "sejak {date}", secondary link button "Ganti akun GitHub".
  - Pending states show a spinner label ("Membuka GitHub…" / "Menghubungkan…").

- [ ] Implement; `tsc` + lint. Commit `feat(onboarding): connect GitHub via Clerk`.

### Task 4: Data GitHub & CV page

**Files:** `linkify/src/app/(main)/dashboard/onboarding/page.tsx`.

- [ ] Profile type gains `github_connection` and `github_verified_at`.
- [ ] Remove `githubUrl` state, its prefill effect and the input block; render `<GithubConnection .../>` at the top of the form.
- [ ] Sync: `FormData` sends only `cv` (when a file is chosen). Button enabled when `file` is chosen, or when GitHub is connected/legacy and a CV already exists (re-sync GitHub data). Validation message "Pilih file CV (PDF) dulu." when nothing to sync.
- [ ] Copy: header sub for new users "Hubungkan GitHub dan upload CV. Keduanya opsional, tapi makin lengkap makin akurat."; existing profile sub uses `@username` only when present; re-sync confirm dialog omits `@username` when null. Section label "CV (PDF)".
- [ ] `SYNC_STEPS`: drop "Menghubungi GitHub…" when GitHub is not connected (derive the list).
- [ ] `tsc` + lint + build. Commit `feat(onboarding): optional GitHub, CV-only sync`.

### Task 5: Calls to action and gating UI

**Files:** `linkify/src/app/(main)/dashboard/page.tsx`, `linkify/src/components/portfolio/portfolio-editor.tsx`.

- [ ] Overview: when `github_connection !== "verified"`, show one hairline callout under the header: none → "Hubungkan GitHub untuk skill terverifikasi dan portfolio." ; legacy → "Verifikasi GitHub-mu agar recruiter melihat label terverifikasi." with link to `/dashboard/onboarding`.
- [ ] Portfolio editor: when the profile's `github_connection === "none"` and there is no draft, replace the generate form with `EmptyState` "Hubungkan GitHub dulu" + link. Handle `ApiError.code === "GITHUB_REQUIRED"` from generate/rewrite with the same message.
- [ ] `tsc` + lint. Commit `feat(dashboard): GitHub connect prompts`.

### Task 6: Verification labels for recruiters and public portfolio

**Files:** `linkify/src/app/(main)/dashboard/recruiter/candidates/page.tsx`, `linkify/src/app/(main)/dashboard/recruiter/jobs/[id]/page.tsx`, public portfolio page/component under `linkify/src/app/p/[publicId]` and `components/portfolio`.

- [ ] Types gain `github_verified?: boolean`.
- [ ] Next to every `@{github}` display: emerald "Terverifikasi" or amber "Belum diverifikasi" text label (`text-micro`, no dots).
- [ ] Public portfolio: render a small "GitHub terverifikasi" label once, theme-independent (page wrapper), only when `github_verified` is true.
- [ ] `tsc` + lint + build. Commit `feat(recruiter): show GitHub verification state`.

### Task 7: Ship and verify

- [ ] Full build. Ask the user to approve the push; push; confirm Vercel success.
- [ ] Owner E2E on production (guided): (1) existing account → Data GitHub & CV → "Verifikasi dengan GitHub" → returns verified; (2) new account via "Continue with GitHub" → onboarding shows verified automatically; (3) duplicate GitHub on a second account → clear error; (4) disconnect GitHub in Clerk account page → webhook revokes (label returns to "belum terhubung").
- [ ] Follow-up backend commit: `/profiles/sync` stops honoring `github_url`; update the transition test accordingly.
