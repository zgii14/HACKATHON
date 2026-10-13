# Dashboard Light Theme + Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Force a light theme in `/dashboard/*`, switch UI text to self-hosted Plus Jakarta Sans, and reserve JetBrains Mono for numbers and code in the candidate dashboard.

**Architecture:** next-themes `forcedTheme` keyed on pathname; fonts via `next/font/google` CSS variables wired into Tailwind `fontFamily`; marketing keeps Satoshi via a scoped class; mono cleanup is class-only edits.

**Tech Stack:** Next.js 14.2, next-themes, Tailwind 3, `next/font/google`.

Spec: `docs/superpowers/specs/2026-10-13-dashboard-light-typography-design.md`

## Global Constraints
- `--primary` and all color tokens unchanged (violet locked).
- No new dependencies.
- Landing/marketing must look unchanged (Satoshi, dark).
- Class-only edits in Task 3: no logic, layout or copy changes; no em-dash added.
- Do NOT push until the user approves.

---

### Task 1: Force light theme in the dashboard

**Files:** Modify `linkify/src/components/providers/providers.tsx` (ThemeProvider, ~line 68), `linkify/src/components/dashboard/dashboard-shell.tsx` (remove ThemeToggle import line 8 and usage ~line 409).

- [ ] **Step 1:** In `providers.tsx` add `import { usePathname } from "next/navigation";`, inside the component `const pathname = usePathname();`, and on `<ThemeProvider>` add `forcedTheme={pathname?.startsWith("/dashboard") ? "light" : undefined}`.
- [ ] **Step 2:** In `dashboard-shell.tsx` delete `import { ThemeToggle } from "@/components/theme-toggle";` and the `<ThemeToggle />` element.
- [ ] **Step 3:** `npx tsc --noEmit` → exit 0.
- [ ] **Step 4:** Commit `feat(dashboard): force light theme in dashboard`.

### Task 2: Self-hosted fonts

**Files:** Modify `linkify/src/utils/constants/fonts.ts`, `linkify/src/utils/index.ts`, `linkify/src/app/layout.tsx`, `linkify/tailwind.config.ts:80-84`, `linkify/src/styles/globals.css:1-3,90-96`, `linkify/src/app/(marketing)/layout.tsx`.

- [ ] **Step 1:** Replace `fonts.ts` content:

```ts
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";

export const jakarta = Plus_Jakarta_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700", "800"],
    variable: "--font-jakarta",
    display: "swap",
});

export const jetbrains = JetBrains_Mono({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    variable: "--font-jetbrains",
    display: "swap",
});
```

- [ ] **Step 2:** `utils/index.ts`: import/export `jakarta, jetbrains` instead of `aeonik, inter`. `app/layout.tsx`: use `jakarta.variable, jetbrains.variable` instead of `aeonik.variable, inter.variable`. Grep `aeonik|inter\b` imports from `@/utils` elsewhere and fix any.
- [ ] **Step 3:** Tailwind `fontFamily`:

```ts
"heading": ["var(--font-jakarta)", "Plus Jakarta Sans", "sans-serif"],
"default": ["var(--font-jakarta)", "Plus Jakarta Sans", "sans-serif"],
"satoshi": ["Satoshi", "var(--font-jakarta)", "sans-serif"],
"mono": ["var(--font-jetbrains)", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
```

- [ ] **Step 4:** `globals.css`: delete the two `fonts.googleapis.com` `@import` lines (keep the Fontshare Satoshi one, add a comment that marketing still uses it). Change `html, body { font-family: ... !important; }` to `font-family: var(--font-jakarta), "Plus Jakarta Sans", sans-serif;` (no `!important`). Change `.landing-satoshi .font-heading` to `.landing-satoshi, .landing-satoshi .font-heading { font-family: "Satoshi", var(--font-jakarta), sans-serif; }`.
- [ ] **Step 5:** `(marketing)/layout.tsx`: add `font-satoshi` to the outermost wrapper element's className.
- [ ] **Step 6:** `npx tsc --noEmit` and `npx next build` → pass.
- [ ] **Step 7:** Commit `feat(fonts): self-host Plus Jakarta Sans and JetBrains Mono`.

### Task 3: Mono reduction in the candidate dashboard

**Files:** candidate dashboard pages and components listed in the spec.

Rule per occurrence of `font-mono`:
- KEEP if the element renders a number (score, count, %, CountUp, MatchCell, salary digits), a repo name, code, an ID, or tabular date column. Add `tabular-nums` if numbers align in a column.
- REMOVE `font-mono` if the element is a breadcrumb/crumb, uppercase label or section title, text badge/status pill, helper/meta sentence, or heading. If it also has `tracking-[0.1em]` or wider, change to `tracking-wider`; `tracking-[0.05em]`-`tracking-[0.08em]` → `tracking-wide`.

- [ ] **Step 1:** Shared primitives first: `components/dashboard/ui.tsx` (`Crumb`, `SecTitle`, `PageHeader`, `EmptyState`, `MatchCell`, `ActionLink`), `dashboard-shell.tsx` (nav headings, XP chip).
- [ ] **Step 2:** Pages: `dashboard/page.tsx`, `profile`, `onboarding`, `jobs`, `jobs/[id]`, `jobs/recommended`, `skill-gap`, `roadmap`, `my-roadmaps`, `applications`, `cv-generator`, `account`; components `chat/*`, `cv-generator/*`, `portfolio/portfolio-editor.tsx`, `dashboard/verified-skills.tsx`.
- [ ] **Step 3:** Verify: `grep -c "font-mono"` per file before/after recorded; `grep -rn "—"` shows no new em-dash in diff (`git diff | grep "^+" | grep "—"` empty); `npx tsc --noEmit`, `next lint` on changed files, `next build` pass.
- [ ] **Step 4:** Commit `style(dashboard): reserve mono for numbers and code`.

### Task 4: Deploy (with approval) and verify

- [ ] **Step 1:** Ask user to approve push; then `git push origin master`; confirm Vercel success via GitHub commit status API.
- [ ] **Step 2:** Production check with cache-busting `?v=<sha>`: `document.documentElement.classList.contains('light')` (or not `dark`) on dashboard pages; computed `font-family` of body starts with the Jakarta variable font; screenshots of Ringkasan, Semua Lowongan, Detail job, Skill Gap, Roadmap, CV, Portfolio, Kelola Akun at desktop and mobile; landing `/` still dark with Satoshi.
