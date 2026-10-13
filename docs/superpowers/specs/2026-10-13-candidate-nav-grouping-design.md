# Candidate Sidebar Navigation: Grouping by Purpose

Date: 2026-10-13
Scope: candidate sidebar navigation only. Page content (including Overview) is out of scope. Recruiter and admin navigation are unchanged.

## Problem

The candidate sidebar is a flat list of 13 items with mixed English/Indonesian labels and an order that does not follow how candidates use the app:

```
Overview, Profil & Skill, CV Generator, Portfolio, Browse Jobs, Rekomendasi,
Skill Gap, My Roadmaps, Lamaranku, Chat, Roadmap Generik, Onboarding, Kelola Akun
```

- "Roadmap Generik" and "My Roadmaps" are two tabs of one roadmap experience but sit far apart.
- "Onboarding" (GitHub + CV sync, the first step) is near the bottom.
- Active-state bug: on `/dashboard/jobs/recommended`, both "Rekomendasi" and "Browse Jobs" highlight, because matching is `pathname.startsWith(href)`.

## Design

### Structure and labels (grouped by user goal)

```
Ringkasan                      /dashboard

PROFIL SAYA
  Data GitHub & CV             /dashboard/onboarding        (was "Onboarding")
  Profil & Skill               /dashboard/profile
  CV                           /dashboard/cv-generator      (was "CV Generator")
  Portfolio                    /dashboard/portfolio

CARI KERJA
  Rekomendasi                  /dashboard/jobs/recommended
  Semua Lowongan               /dashboard/jobs              (was "Browse Jobs")
  Lamaranku          [count]   /dashboard/applications
  Chat                         /dashboard/chat

TINGKATKAN SKILL
  Skill Gap                    /dashboard/skill-gap
  Roadmap            [count]   /dashboard/roadmap           (merges "Roadmap Generik" + "My Roadmaps")

(divider)
Kelola Akun                    /dashboard/account
```

- 13 items become 12. The single "Roadmap" item is active on both `/dashboard/roadmap` and `/dashboard/my-roadmaps` (the two pages already link to each other as tabs). The bookmark count badge moves from "My Roadmaps" to "Roadmap".
- Labels are Indonesian, except established terms (CV, Portfolio, Skill Gap, Roadmap, Chat).
- No route changes. `linkify/src/utils/constants/roles.ts` route protection is unaffected.

### Data model

`DASHBOARD_LINKS` in `linkify/src/utils/constants/nav-links.ts` becomes grouped data and stays the single source of truth:

- A group has an optional `label` (no label for the top "Ringkasan" and bottom "Kelola Akun" groups).
- A link has `title`, `href`, `icon`, and optional `match: string[]` (extra path prefixes that also activate it; used by Roadmap for `/dashboard/my-roadmaps`) and optional `badge: "bookmarks" | "applications"`.
- Badges are declared on the link instead of the current `isMyRoadmaps` / `isApplications` href checks in `dashboard-shell.tsx`.

### Active state

Longest-prefix match: among all candidate links (href plus `match` prefixes), the one whose prefix is the longest match for the current pathname is active. `/dashboard` only matches exactly. Exactly one item is active per page. This fixes the Rekomendasi / Browse Jobs double highlight.

### Rendering (`dashboard-shell.tsx`)

- Group headings reuse the existing Admin heading style: `font-mono text-micro uppercase tracking-widest text-muted-foreground`. Plain words, no numbering.
- Collapsed sidebar (icon-only): headings become a thin `h-px bg-border` divider, same as Admin today.
- Recruiter navigation keeps its current flat list. Admin group stays at the bottom, unchanged.
- No new dependencies, no new colors (violet theme locked), no decorative dots, no em-dashes in labels.

### Reference: taste-skill

`design-taste-frontend` declares dashboards out of scope (Section 13). Only rules that apply to navigation are used: no numbered eyebrows (9.F), no decorative status dots (9.F), no em-dash in labels (9.G), no silent nav-label or URL changes (11.F, labels changed with user approval), one accent and one radius system (4.2, 4.4, violet allowed under the LILA override), contrast in light and dark mode (6.C, 8). The "no border on every row" and landing-page rules are intentionally not applied; they conflict with the locked Workbench aesthetic.

## Testing

- `npx tsc --noEmit`, `next lint`, `next build` pass.
- Active-state helper is a pure function. The frontend has no test runner, so verify it with a throwaway script (`npx tsx`, outside the repo): `/dashboard` → Ringkasan, `/dashboard/jobs` → Semua Lowongan, `/dashboard/jobs/recommended` → Rekomendasi, `/dashboard/jobs/<id>` → Semua Lowongan, `/dashboard/roadmap` and `/dashboard/my-roadmaps` → Roadmap. Each resolves to exactly one item.
- Visual check on production after deploy: expanded sidebar, collapsed sidebar, mobile drawer, light and dark mode; badges still show counts.

## Out of scope

Overview page layout, page content, recruiter/admin navigation, route changes.
