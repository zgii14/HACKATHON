# Landing Page Redesign: Portfolio-First, Light, Real Product

Date: 2026-10-14
Status: Approved direction (hero B "Panggung", pricing option 2, owner-recorded videos)
Scope: homepage `/` only (new nav + footer for it). Other marketing pages (About, How it works, Pricing page, Recruiter apply, Privacy, Terms) keep their current dark look until a follow-up phase.

## Context

GitHire is a production startup product. The current landing (`components/landing/landing-redesign.tsx`) is dark and full of generated-design tells flagged by `design-taste-frontend`: purple gradient text and glow blobs, a hand-rolled SVG network illustration, a "CODE → MATCH → CAREER" decoration strip, a marquee, scroll-lit manifesto words, a div-built fake recruiter workspace, numbered "01 · ..." labels and step cards, dark-on-dark text-only bento, and split headers. Its copy is also inaccurate (theme names, `githire.id` domain, paid candidate plans that do not exist).

Reference research (2026-10-13/14, live pages): Welcome to the Jungle, Contra, Cal.com, Attio, Mercury. Shared traits: the real product (or real people/work) is the visual; one accent used with conviction; short heroes; almost no eyebrow labels; real proof; light surfaces with fine borders.

Design read (taste-skill 0.B): portfolio-first landing for Indonesian developers (and the recruiters who read their portfolios), with a light, confident, product-led language, leaning toward Tailwind + Plus Jakarta Sans + live product components + owner-recorded product videos, one violet accent. Dials: `DESIGN_VARIANCE 6`, `MOTION_INTENSITY 4`, `VISUAL_DENSITY 4`.

## Page Structure

Theme lock: light page; exactly one full-color block (the closing violet CTA). One accent: GitHire violet (`--primary`). One radius system: 12px frames/cards, full-pill buttons and tabs. Eyebrow labels: at most 2 on the page. No em-dash anywhere in copy.

| # | Section | Layout family | Real asset |
|---|---|---|---|
| 1 | Nav (one line, ≤ 72px) | bar | |
| 2 | Hero "Panggung" | stacked headline + full-width stage | Live public portfolio (iframe) with 4 theme tabs |
| 3 | Isinya dari kerja nyatamu | split (text left, proof right) | Owner's real verified skills with repo/commit evidence + video 1 |
| 4 | Satu link, dibaca recruiter | full-width media | Real component preview of a candidate as recruiters see it + video 2 |
| 5 | Lowongan yang cocok | compact list | 5 real open jobs + live total from new public endpoint |
| 6 | Untuk recruiter | single statement + CTA | |
| 7 | Harga | 3-column plan table | |
| 8 | Penutup | violet color block | |
| 9 | Footer | columns | |

### Copy (draft for owner review)

Nav: `GitHire` · Portfolio · Lowongan · Untuk recruiter · Harga · Masuk · **[Buat portfolio]** (signed in: **[Buka dashboard]**).

Hero
- H1: "Portfolio developer yang dibangun dari kode aslimu."
- Sub (≤ 20 words): "Disusun dari repo GitHub dan CV-mu, dengan skill terverifikasi dari commit. Pilih tampilan, bagikan satu link."
- Primary CTA: "Buat portfolio" → `/auth/sign-up` (signed in: `/dashboard/portfolio`). Secondary text link: "Lihat portfolio contoh" → `/p/{showcaseId}`.
- Stage tabs: Editorial · Developer · Professional · Maestro. Caption under frame: "Portfolio Muhammad Rozagi, dibuat dengan GitHire."

Section 3
- H2: "Isinya dari kerja nyatamu, bukan klaim."
- Three verb-led rows (no numbers): "Hubungkan GitHub" / "Upload CV" / "Pilih tampilan dan bagikan", one sentence each.
- Proof panel: "Skill terverifikasi dari commit" list of the showcase portfolio's `verified_skills` (top 6: skill, level, "{repos} repo · {commits} commit").

Section 4
- H2: "Satu link yang langsung dibaca recruiter."
- Body: "Recruiter melihat skill yang terbukti di repo, proyek yang kamu pilih, dan label GitHub terverifikasi sebelum membuka lamaran."
- Candidate preview (real components, showcase data): name, headline, `GithubVerifiedLabel`, top verified skills, 3 projects.

Section 5
- H2: "Lowongan IT yang sedang buka."
- Live list: 5 rows (title, company, location / remote). Footer line: "{total} lowongan aktif" + link "Lihat semua lowongan" → `/dashboard/jobs` (sign-in gate as today).

Section 6
- H2: "Merekrut developer?" Body one sentence. CTA "Daftar sebagai recruiter" → `/recruiter/apply`.

Section 7 (pricing, option 2)
| Plan | Price | Status | Features |
|---|---|---|---|
| Starter | Gratis | button "Mulai gratis" | Import CV dan GitHub; skill terverifikasi; 4 tema portfolio; publish portfolio; job match |
| Premium | Rp 79.000 / bulan | label "Segera", no button | Semua fitur Starter; subdomain `nama.githire.my.id` |
| Pro | Rp 159.000 / bulan | label "Segera", no button | Semua fitur Premium; custom domain; tambah dan susun section bebas |

Section 8 (violet block): H2 "Buat portfolio-mu hari ini." CTA "Buat portfolio".

Footer: logo + one line, links (Portfolio, Lowongan, Untuk recruiter, Harga, Privacy, Terms), © year.

## Live Portfolio Stage

- Iframe to the existing public route `/p/{showcaseId}` with two new query params:
  - `theme=editorial|developer|professional|maestro`: overrides the rendered theme only (content unchanged).
  - `embed=1`: hides the email contact and the floating "GitHub terverifikasi oleh GitHire" chip.
- Showcase id from env `NEXT_PUBLIC_SHOWCASE_PORTFOLIO_ID` (default `kBvAyQPhGD`).
- Rendered at 1280×800 inside a frame and scaled with CSS `transform: scale()` to the container width (ResizeObserver). Frame has a browser bar with the real URL. `loading="eager"` for the first theme; tab switch swaps `src` with an opacity crossfade. `title` attribute for a11y; `sandbox="allow-scripts allow-same-origin allow-popups"`.
- Mobile: tabs horizontally scrollable; frame scales down (still 1280 wide source).
- If the portfolio fetch fails or is unpublished, the stage shows a static fallback card linking to sign-up (no broken iframe).

Also fix: on the normal public page, do not render the floating verified chip for the Editorial theme (it already shows its own "GitHub verified" sticker).

## Videos (owner-recorded)

Slots in sections 3 and 4, framed like the hero. `<video muted loop playsInline autoPlay preload="none">` with `poster`, MP4 (H.264) + WebM, target ≤ 2 MB each, 1280×800, 6–10 s. Lazy start via IntersectionObserver; `prefers-reduced-motion` shows the poster only. Until files exist, the slot renders the poster image (a real screenshot) so the layout ships now.

Recording script (owner, logged in, light theme, browser at 1280×800, cursor visible, no notifications):
1. Video 1 "Dari GitHub ke portfolio": Data GitHub & CV page (verified) → Portfolio page → choose 4 repos → "Generate portfolio" → editor shows draft → switch theme preview. 8–10 s after trimming.
2. Video 2 "Yang dilihat recruiter": open `/p/{showcaseId}` → scroll to verified skills → open one project link hover. 6–8 s.
Claude trims, crops, speeds up dead time, encodes MP4 + WebM, extracts posters.

## Backend

`GET /public/jobs?limit=5` (no auth): `{ "total": int, "items": [{ "id", "title", "company", "location", "work_type", "is_remote" }] }` from `Job.is_closed == False`, newest first, `limit` clamped 1..10, `Cache-Control: public, max-age=300`. Unit test with sqlite fixture.

## Frontend Structure

- New route group: move the homepage to `app/(home)/page.tsx` with `app/(home)/layout.tsx` (no old Navbar/Footer, no Satoshi). Old `(marketing)` layout keeps serving the other pages.
- Components in `components/landing-v2/`: `landing-nav.tsx`, `portfolio-stage.tsx` (client), `verified-proof.tsx`, `recruiter-preview.tsx`, `jobs-preview.tsx`, `pricing-plans.tsx`, `product-video.tsx` (client), `landing-footer.tsx`, `landing-page.tsx` (composition).
- Data: `app/(home)/page.tsx` (server) fetches the showcase public portfolio and `/public/jobs` with `next: { revalidate: 300 }`; failures degrade per section.
- Motion: framer-motion `Reveal` (existing) for section entrances; no GSAP on the homepage. Respect reduced motion.
- Remove `components/landing/landing-redesign.tsx` usage from the homepage (file kept until the follow-up phase removes the old marketing pages' dependencies).

## Testing

- Backend unittest for `/public/jobs` (closed jobs excluded, limit clamp, shape).
- `tsc`, lint, build.
- Visual check on production at mobile (375) and tablet/desktop widths: hero fits viewport (headline ≤ 2 lines desktop, CTA visible), tabs switch themes, iframe scaled correctly, sections render with real data, pricing labels, no horizontal overflow.
- Taste-skill pre-flight items that apply: zero em-dash, one accent, one radius system, ≤ 2 eyebrows, no duplicate CTA intent with different labels, no fake UI, reduced-motion honored.

## Out of Scope

Other marketing pages and auth page restyle (next phase), candidate billing and waitlist, recording the videos themselves (owner), SEO metadata overhaul beyond title/description.
