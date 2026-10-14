# Landing Portfolio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark homepage with a light, portfolio-first landing whose hero stage shows the owner's real public portfolio across 4 themes, with real data sections, honest pricing, and a performance budget that beats the current page.

**Architecture:** Homepage moves to its own route group `(home)` with new light nav/footer. A server page fetches the showcase public portfolio and a new public jobs endpoint (ISR 300s) and passes data to small section components in `components/landing-v2/`. The hero stage shows pre-rendered WebP posters instantly and mounts the live `/p/{id}?theme=…&embed=1` iframe only when idle or on interaction.

**Tech Stack:** Next.js 14 (app router), Tailwind, framer-motion (existing `Reveal`), next/image, FastAPI, headless Chrome (poster capture), Pillow (WebP).

Spec: `docs/superpowers/specs/2026-10-14-landing-portfolio-redesign-design.md`. Baseline (Lighthouse mobile, 2026-10-14): score 55, LCP 5.9 s, CLS 0.006, TBT 470 ms, 914 KiB, 48 requests, 4 third-party font requests.

## Global Constraints
- Light page, one accent (`--primary` violet, locked), one full-color block (closing CTA), radius: 12px frames/cards + full-pill buttons/tabs.
- ≤ 2 eyebrow labels on the page; zero em-dash in copy; no numbered step labels; no decorative SVG/fake UI; no GSAP/marquee on `/`.
- Copy exactly as in the spec "Copy" section.
- Other marketing pages unchanged (keep `(marketing)` layout, Satoshi, dark).
- No new npm dependencies. Backend: no new Python dependencies.
- Do not push until the user approves; measure Lighthouse on production after deploy.

---

### Task 1: Public jobs endpoint (backend)
**Files:** create `backend/app/routers/public.py`; modify `backend/app/main.py` (include router); test `backend/test_public_jobs.py`.
- [ ] Test (sqlite + TestClient pattern): 3 open jobs + 1 closed → `GET /public/jobs?limit=2` returns `total == 3`, 2 items, newest first, closed excluded, item keys exactly `id,title,company,location,work_type,is_remote`; `limit=50` clamps to 10; no auth needed; response header `Cache-Control: public, max-age=300`.
- [ ] Implement: `router = APIRouter(prefix="/public")`; query `Job.is_closed == False` ordered by `created_at desc`; `limit = max(1, min(limit, 10))`; return JSONResponse with cache header.
- [ ] Full suite green. Commit `feat(public): add public open jobs endpoint`.

### Task 2: Public portfolio `theme` + `embed` params
**Files:** `linkify/src/app/p/[publicId]/page.tsx`, `linkify/src/components/portfolio/public-portfolio.tsx`.
- [ ] Page reads `searchParams.theme` (only `editorial|developer|professional|maestro`) and `searchParams.embed === "1"`.
- [ ] `PublicPortfolioView` gets `themeOverride?` used instead of `portfolio.content.theme` when set.
- [ ] `embed`: drop `email` from `content.contacts` before rendering; never render the floating verified chip.
- [ ] Non-embed: render the floating chip only when the effective theme is not `editorial` (Editorial shows its own verified sticker).
- [ ] `tsc`, lint. Commit `feat(portfolio): theme override and embed mode for public view`.

### Task 3: Theme posters
**Files:** create `linkify/public/landing/portfolio-{editorial,developer,professional,maestro}.webp`; script kept in scratchpad (not committed).
- [ ] Run local production build with `NEXT_PUBLIC_API_URL=https://githire.up.railway.app` on port 3100.
- [ ] Headless Chrome: `chrome --headless=new --hide-scrollbars --window-size=1280,800 --virtual-time-budget=8000 --screenshot=<png> "http://localhost:3100/p/kBvAyQPhGD?theme=<t>&embed=1"` for each theme.
- [ ] Pillow: convert to WebP quality 78; assert ≤ 120 KB each (lower quality if needed). Visually check each poster.
- [ ] Commit `chore(landing): add portfolio theme posters`.

### Task 4: Route group, nav, footer
**Files:** move `linkify/src/app/(marketing)/page.tsx` → `linkify/src/app/(home)/page.tsx`; create `linkify/src/app/(home)/layout.tsx`, `linkify/src/components/landing-v2/landing-nav.tsx`, `landing-footer.tsx`.
- [ ] `(home)/layout.tsx`: light wrapper `bg-background text-foreground`, renders `LandingNav` + children + `LandingFooter` (no old Navbar/Footer, no `font-satoshi`).
- [ ] `LandingNav` (client for mobile menu): logo, links Portfolio (`#portfolio`), Lowongan (`#lowongan`), Untuk recruiter (`#recruiter`), Harga (`#harga`), "Masuk" (`/auth/sign-in`), primary pill "Buat portfolio" (`/auth/sign-up`), signed-in variant "Buka dashboard". One line ≥ 1024px, height 64px, sticky with `bg-background/85 backdrop-blur` and bottom hairline after scroll. Mobile: sheet menu (existing `components/ui/sheet`).
- [ ] `LandingFooter`: logo + "Portfolio developer dari kode aslimu.", links (Portfolio, Lowongan, Untuk recruiter, Harga, Privacy, Terms), © year.
- [ ] Move the Fontshare Satoshi `@import` and the `.font-satoshi` / `.landing-satoshi` rules out of `globals.css` into `linkify/src/styles/marketing.css`, imported only by `app/(marketing)/layout.tsx`, so `/` makes no third-party font request while other marketing pages keep Satoshi.
- [ ] `tsc`, build (route conflict check: `/` only in `(home)`). Commit `feat(landing): home route group with light nav and footer`.

### Task 5: Hero + portfolio stage
**Files:** `linkify/src/components/landing-v2/portfolio-stage.tsx` (client), `hero.tsx`.
- [ ] `PortfolioStage({ publicId, ownerName })`: tabs (Editorial, Developer, Professional, Maestro; `role="tablist"`, arrow-key nav), frame with browser bar showing `githire.my.id/p/{publicId}`, 16:10 box via `aspect-[16/10]`, poster `next/image` (first `priority`, `sizes="(min-width:1024px) 1100px, 100vw"`), deferred iframe: mount on `requestIdleCallback` (fallback `setTimeout 2500` after `load`) or first pointerenter/focus/tab click; skip when `navigator.connection?.saveData`; iframe 1280×800 scaled by `ResizeObserver` (`scale = width/1280`), `opacity-0` until `onLoad` then fade; tab change swaps poster and iframe `src`. Caption "Portfolio {ownerName}, dibuat dengan GitHire."
- [ ] `Hero`: copy from spec; H1 `text-[clamp(2.25rem,5vw,4rem)] font-extrabold tracking-[-0.04em]` max 2 lines desktop; sub ≤ 20 words; primary pill "Buat portfolio", secondary text link "Lihat portfolio contoh" → `/p/{publicId}`; stage below. Fallback (no portfolio): stage replaced by a single poster with link to sign-up.
- [ ] `tsc`, lint. Commit `feat(landing): hero with live portfolio stage`.

### Task 6: Content sections
**Files:** `landing-v2/verified-proof.tsx`, `recruiter-preview.tsx`, `jobs-preview.tsx`, `pricing-plans.tsx`, `closing-cta.tsx`, `product-video.tsx` (client), `landing-page.tsx`.
- [ ] `ProductVideo({ poster, mp4?, webm?, label })`: framed like the hero; renders poster always; attaches sources and plays only when within 200px of viewport (IntersectionObserver), pauses when out; never loads video under `prefers-reduced-motion` or `saveData`; no sources → poster only.
- [ ] Section 3 (`id="portfolio"`): split; left H2 + 3 verb-led rows; right `VerifiedProof` listing top 6 `verified_skills` (skill, level, `{repos} repo · {own_commits} commit`) + `ProductVideo` slot 1 (poster `portfolio-editorial.webp` until the recording exists).
- [ ] Section 4: full-width; H2 + body; `RecruiterPreview` (name, headline, `GithubVerifiedLabel verified`, top 4 verified skills, 3 project names) beside `ProductVideo` slot 2 (poster `portfolio-professional.webp`).
- [ ] Section 5 (`id="lowongan"`): `JobsPreview` list of 5 jobs (title, company, location or "Remote"), footer "{total} lowongan aktif" + "Lihat semua lowongan" → `/dashboard/jobs`; hidden if fetch failed.
- [ ] Section 6 (`id="recruiter"`): "Merekrut developer?" + one sentence + pill "Daftar sebagai recruiter" → `/recruiter/apply`.
- [ ] Section 7 (`id="harga"`): `PricingPlans` table per spec (Starter button "Mulai gratis" → `/auth/sign-up`; Premium/Pro "Segera" label, no button).
- [ ] Section 8: `ClosingCTA` violet block (`bg-primary text-primary-foreground`), H2 "Buat portfolio-mu hari ini." + white pill "Buat portfolio".
- [ ] Entrances via existing `Reveal`; no other motion.
- [ ] `tsc`, lint. Commit `feat(landing): portfolio-first sections`.

### Task 7: Data wiring and page
**Files:** `linkify/src/app/(home)/page.tsx`.
- [ ] Server component: `currentUser()` for CTA targets; fetch `${API}/portfolios/${showcaseId}` and `${API}/public/jobs?limit=5` with `next: { revalidate: 300 }`, each in try/catch → `null`. Showcase id `process.env.NEXT_PUBLIC_SHOWCASE_PORTFOLIO_ID ?? "kBvAyQPhGD"`. Strip `contacts.email` server-side before passing down. Metadata: title "GitHire · Portfolio developer dari kode aslimu", description = hero sub.
- [ ] Render `LandingPage` with data.
- [ ] Build. Commit `feat(landing): wire showcase portfolio and jobs data`.

### Task 8: Verify, ship, measure
- [ ] Local build served; check `/` at 375, 768, 1280: hero fits viewport, tabs switch posters, iframe mounts after idle and scales, no horizontal overflow, reduced-motion respected.
- [ ] Taste pre-flight (spec list): grep page components for `—` (none), count eyebrow labels (≤ 2), single accent.
- [ ] Ask user to approve push (backend Task 1 deploys with it; frontend tolerates missing endpoint). Push, wait for Vercel + Railway success.
- [ ] Lighthouse mobile on production `/`; compare to baseline; meet budget (LCP < 2.5 s, CLS < 0.1, TBT ≤ 470 ms, bytes < 914 KiB before interaction, 0 third-party font requests on `/`). If missed, fix before declaring done.
