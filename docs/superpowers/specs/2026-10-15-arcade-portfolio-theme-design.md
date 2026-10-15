# Arcade portfolio theme — design

Date: 2026-10-15
Status: approved (brainstorming)
Reference: https://www.lars-olson.com/ (visual language only; no assets copied)
Registration checklist: `docs/prompts/portfolio-theme-prompt.md` (all 10 files apply)

## Goal

Add a fifth public portfolio theme, `arcade`: a retro/holographic "game UI" look inspired by Lars Olson's
portfolio, adapted to GitHire data (GitHub repos without images, verified skills, CV sections).

## Identity

| Field | Value |
|---|---|
| Key | `arcade` |
| Label | `Arcade` |
| Picker detail (id) | `Retro hologram ala game` |
| Icon (lucide) | `Gamepad2` |

`retro` and `neon` stay unused (tests use them as invalid keys).

## Visual language

- Background `#0B0D17` with a dotted grid (`radial-gradient` dots `#2A2F55`, ~24px pitch).
- Holographic gradient `#5EEAD4 → #A78BFA → #F0ABFC → #FDE68A`. Used ONLY on: the hero window border/title bar,
  the name fill, and the wavy section dividers.
- Single accent: violet `#5B3FD9` (project window frames, focus rings, links). Text `#F5F3EE`, muted `#9AA0C3`.
- "Window" primitive: frame with a title bar holding three small outlined squares. One radius system: 0 (square).
- Corner bracket accent (L-shaped outline) behind project titles.
- Wavy divider: inline SVG path stroked with the holo gradient.
- Dashed vertical arrow under the hero.

### Fonts

- Name: `var(--font-jakarta)` weight 800, holo gradient fill (`bg-clip-text`) with a thin light outline.
- Headline: **Yellowtail** script, loaded with `next/font/google` (weight 400, `subsets: ["latin"]`,
  `display: "swap"`) at module scope inside `arcade-portfolio.tsx`, exposed as a CSS variable on the theme root.
  next/font self-hosts at build time, so there is no remote `@import`/`<link>`; the font ships only with this
  theme's chunk. This is a deliberate, user-approved exception to "no new fonts" for this theme only.
- Body: `var(--font-jakarta)`; metadata/stats: `var(--font-jetbrains)`.

## Sections (order)

`themePlans.arcade.sectionOrder`: `projects, skills, experience, education, certifications`.

1. **Hero window** (always): name, headline rendered as script segments separated by a styled `×`
   (split by helper, see below), `github_verified` badge, contact icons. Side art:
   - `has_photo` → candidate photo with CSS halftone/duotone treatment (dot mask + violet/teal blend), plain `<img>`.
   - no photo → geometric dotted ornaments (circle, triangle) built from CSS.
   Dashed arrow below. At 1280×800 the whole hero plus the top of the next section is visible without scroll.
2. **About** (when `bio` non-empty): bio inside a small window.
3. **Projects**: grid of violet windows, 2 columns ≥768px, 1 column below. Window body = text "screen":
   repo name, description (omitted when empty), tech chips; status bar: `★ stars` and `own_commits` commits.
   Title under the window with the corner bracket; whole card links to `url` (new tab, `rel="noreferrer"`).
4. **Skills**: verified skills as "achievements" (skill, level when present, commits/repos evidence) labelled
   "Terverifikasi dari GitHub" / "Verified from GitHub"; remaining `skills[]` not already verified as chips.
5. **Experience** and 6. **Education**: vertical timeline inside a window.
7. **Certifications**: compact list.
8. **Footer**: contact icons + GitHire credit (same pattern as `Footer` in `public-portfolio.tsx`).

Each optional section renders only when `content.sections?.[key] !== false` AND its data is non-empty.

## Copy

All theme-owned labels (section titles, badges, stat units, footer, empty states) in a `Copy` object
with `id` and `en`, picked from `content.language`. Root `<main lang={content.language}>`.

## Pure helpers (`arcade-portfolio-config.ts`)

- `splitHeadline(headline: string): string[]` — split on `×`, `x` surrounded by spaces, `|`, `/`, `·`, `,`
  and `•`; trim; drop empties; max 3 segments; fallback `[headline]`; `[]` for empty input.
- `pickSkills(skills, verified)` → `{ verified: VerifiedSkill[]; others: string[] }`; others exclude
  case-insensitive duplicates of verified skills; caps: verified 8, others 16.
- `formatCount(n?: number): string` — `undefined`/negative → `"0"`, ≥1000 → `"1.2k"`.
- `contactHref(kind, value): string | null` — `mailto:`, `https://wa.me/<digits>`, URL as-is
  (prepend `https://` when missing scheme), unknown kind → `null`.
- `copyFor(language)` → the `Copy` object.

## Motion

framer-motion only, transform/opacity only:
- windows "boot" on entering viewport (scale 0.96→1, opacity 0→1, `EASE_OUT`-style curve), once;
- arrow bobs slowly (translateY loop);
- project card hover lifts 2px.
`useReducedMotion()` disables all of it (render final state).

## Edge cases that must look correct

Very long name (wraps, no overflow), 2-line headline, empty bio, 0 projects, 6 projects, empty project
description, no photo, no contacts, every optional section off, email removed in embed mode.
Responsive 375–1440px with no horizontal scroll.

## Files

1. `linkify/src/components/portfolio/types.ts` — add `"arcade"` to `PortfolioTheme`.
2. `backend/app/services/portfolio.py` — add to `PORTFOLIO_THEMES`.
3. `backend/app/schemas.py` — add to the `theme` `Literal[...]`.
4. `linkify/src/components/portfolio/public-portfolio-theme.ts` — `themePlans.arcade`.
5. New `linkify/src/components/portfolio/arcade-portfolio.tsx` — `export function ArcadePortfolio(props)`.
6. New `linkify/src/components/portfolio/arcade-portfolio-config.ts` — helpers above.
7. `linkify/src/components/portfolio/public-portfolio.tsx` — branch in `PublicPortfolioView`.
8. `linkify/src/components/portfolio/public-portfolio-page.tsx` — add to `THEMES`.
9. `linkify/src/components/portfolio/theme-preview-cards.tsx` — `themeMeta.arcade`, `ArcadePreview`
   (`h-28`, `aria-hidden`, data from `getThemePreviewData`), selector branch, `themeIcons.arcade`.
10. New `linkify/tests/arcade-portfolio.test.mts` (helpers) and
    `linkify/tests/arcade-public-renderer.test.mts` (mirrors `maestro-public-renderer.test.mts`).
    Backend: extend `backend/test_portfolio.py` to assert `arcade` survives `public_view()`.

No changes to other themes, the editor, or other APIs.

## Verification

`npx tsc --noEmit`, `npx eslint src/components/portfolio`, `node --test tests/*.test.mts`, `pnpm build`,
`python -m unittest discover -p "test_*.py"`. Then real checks: saved theme returns `"theme": "arcade"` from
`GET /portfolios/<publicId>`; picker card uses `ArcadePreview`; `/p/<id>?theme=arcade` renders at 375/768/1280,
with reduced motion, and in `embed=1` at 1280×800.

## Out of scope

Landing poster (`portfolio-arcade.webp`, `portfolio-stage.tsx`, `auth-backdrop.tsx`) — optional follow-up.
