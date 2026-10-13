# Dashboard: Light Theme Only + Typography Refresh

Date: 2026-10-13
Scope: `/dashboard/*` (candidate first; recruiter/admin get the theme and font but no mono cleanup). Landing/marketing pages keep their current look until a later phase.

## Why

Users dislike the dark dashboard. Research (2026-10-13, computed styles read live) of Glints, Kalibrr, Jobstreet, Wellfound (all white backgrounds; neutral readable sans) and Linear, Vercel, GitHub (sans UI text, mono reserved for code/numbers) shows the professional pattern. GitHire uses `font-mono` in 374 places, which reads as a "terminal", and loads fonts via render-blocking remote `@import`.

Design read (taste-skill 0.B): redesign-preserve career dashboard for Indonesian developer job seekers, light, clean and friendly, on the existing Tailwind tokens with the locked GitHire violet and self-hosted fonts via `next/font`. Taste-skill marks dashboards out of scope (Section 13); only typography (4.1, 3.A fonts), redesign-preserve (11) and theme/contrast rules (4.11, 8) are applied.

## Design

### Theme
- `ThemeProvider` in `linkify/src/components/providers/providers.tsx` gets `forcedTheme="light"` when `pathname` starts with `/dashboard`; elsewhere behavior is unchanged (default dark). A stored dark preference no longer applies in the dashboard.
- Remove `<ThemeToggle />` from the dashboard header (`dashboard-shell.tsx`). `theme-toggle.tsx` stays.
- Light tokens in `:root` (`globals.css`) unchanged; `--primary` violet locked.
- Landing uses zero theme tokens (verified), so it is unaffected.

### Fonts
- Load **Plus Jakarta Sans** (400/500/600/700/800) and **JetBrains Mono** (400/500/600) with `next/font/google` in `linkify/src/utils/constants/fonts.ts` as CSS variables `--font-jakarta` and `--font-jetbrains`.
- Tailwind `fontFamily`: `default` and `heading` → `var(--font-jakarta)` + fallbacks; `mono` → `var(--font-jetbrains)` + fallbacks; add `satoshi` → `"Satoshi", var(--font-jakarta), sans-serif`.
- `globals.css`: drop the Google Fonts `@import`s (Plus Jakarta Sans, JetBrains Mono); `html, body` font-family → `var(--font-jakarta)`. Keep the Fontshare Satoshi `@import` only because marketing still uses it (removed in the landing phase).
- Marketing layout root gets `font-satoshi` and `.landing-satoshi .font-heading` keeps Satoshi, so landing typography is unchanged.
- Remove unused `aeonik` and `inter` local fonts from `layout.tsx` and `fonts.ts` (files in `public/fonts` left in place).

### Mono reduction (candidate dashboard + its components)
Files: `app/(main)/dashboard/{page,profile,cv-generator,portfolio,jobs,jobs/[id],jobs/recommended,skill-gap,roadmap,my-roadmaps,applications,onboarding,account,chat}`, `components/dashboard/*`, `components/chat/*`, `components/cv-generator/*`, `components/portfolio/portfolio-editor.tsx`.
- Keep `font-mono` on: numbers (scores, counts, percentages, `CountUp`, `MatchCell`), repo names, code, IDs, dates in tables.
- Remove `font-mono` from: breadcrumbs/crumbs, uppercase labels and section titles, text badges/status pills, helper/meta sentences, nav group headings.
- Where an uppercase label loses mono, reduce wide tracking (`tracking-[0.2em]`+ → `tracking-wider`) so it stays legible. Add `tabular-nums` where numbers keep alignment.
- No logic, layout or copy changes.

## Testing
- `npx tsc --noEmit`, `next lint`, `next build` pass.
- Production visual check (logged-in candidate): Ringkasan, Semua Lowongan, Detail job, Skill Gap, Roadmap, CV, Portfolio, Kelola Akun at desktop and mobile; light theme forced even with a stored dark preference.
- `muted-foreground` text on white meets WCAG AA (4.5:1) for body-size text.
- Landing visually unchanged (Satoshi, dark).

## Out of scope
Landing/marketing redesign, auth pages theme, public portfolio themes, recruiter/admin mono cleanup, color token changes.
