# Candidate Sidebar Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Group the candidate sidebar into purpose-based sections (Profil Saya, Cari Kerja, Tingkatkan Skill) with Indonesian labels and exactly one active item per page.

**Architecture:** A pure helper resolves the active nav href by longest-prefix match. `nav-links.ts` exports grouped candidate nav data (the single source of truth), and `dashboard-shell.tsx` renders groups with headings, reading badges and extra match prefixes from the data instead of hard-coded href checks.

**Tech Stack:** Next.js 14, TypeScript, Tailwind, lucide-react (already used), Node 24 type-stripping for the throwaway helper check.

Spec: `docs/superpowers/specs/2026-10-13-candidate-nav-grouping-design.md`

## Global Constraints

- No route changes; `linkify/src/utils/constants/roles.ts` untouched.
- Recruiter and admin navigation unchanged.
- No new dependencies. Violet theme locked: no new colors.
- No numbered group headings, no decorative dots, no em-dash (`—`) in any nav label.
- Group heading style: `font-mono text-micro uppercase tracking-widest text-muted-foreground` (same as existing Admin heading). Collapsed sidebar: `h-px bg-border` divider.
- Do NOT push to remote until the user approves (user instruction).
- Frontend has no test runner; the helper is checked with a script in the session scratchpad, not committed.

---

### Task 1: Active-state helper

**Files:**
- Create: `linkify/src/utils/functions/nav-active.ts`
- Test (not committed): `<scratchpad>/nav-active.check.ts`

**Interfaces:**
- Produces: `export type NavMatchable = { href: string; match?: string[] }` and `export function findActiveHref(pathname: string, links: NavMatchable[]): string | null`. Returns the `href` of the link whose `href` or `match` prefix is the longest match. `"/dashboard"` (and any prefix equal to `"/dashboard"`) matches only exactly. A prefix matches when `pathname === prefix` or `pathname.startsWith(prefix + "/")`.

- [ ] **Step 1: Write the failing check script**

`<scratchpad>/nav-active.check.ts` (scratchpad = `C:/Users/muham/AppData/Local/Temp/claude/D--HACKATHON/b998aef9-e0a4-42d1-b4ff-ec7079a635b7/scratchpad`):

```ts
import { findActiveHref } from "file:///D:/HACKATHON/linkify/src/utils/functions/nav-active.ts";

const links = [
    { href: "/dashboard" },
    { href: "/dashboard/jobs/recommended" },
    { href: "/dashboard/jobs" },
    { href: "/dashboard/roadmap", match: ["/dashboard/my-roadmaps"] },
    { href: "/dashboard/account" },
];
const cases: Array<[string, string | null]> = [
    ["/dashboard", "/dashboard"],
    ["/dashboard/jobs", "/dashboard/jobs"],
    ["/dashboard/jobs/recommended", "/dashboard/jobs/recommended"],
    ["/dashboard/jobs/abc-123", "/dashboard/jobs"],
    ["/dashboard/roadmap", "/dashboard/roadmap"],
    ["/dashboard/my-roadmaps", "/dashboard/roadmap"],
    ["/dashboard/accountx", null],
    ["/dashboard/unknown", null],
];
let failed = 0;
for (const [path, expected] of cases) {
    const got = findActiveHref(path, links);
    if (got !== expected) { failed++; console.log(`FAIL ${path}: expected ${expected}, got ${got}`); }
}
console.log(failed ? `${failed} failed` : `all ${cases.length} passed`);
process.exit(failed ? 1 : 0);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node "<scratchpad>/nav-active.check.ts"`
Expected: error `Cannot find module ... nav-active.ts`.

- [ ] **Step 3: Implement the helper**

`linkify/src/utils/functions/nav-active.ts`:

```ts
export type NavMatchable = { href: string; match?: string[] };

const ROOT = "/dashboard";

function matches(pathname: string, prefix: string): boolean {
    if (prefix === ROOT) return pathname === ROOT;
    return pathname === prefix || pathname.startsWith(prefix + "/");
}

// Longest-prefix match so nested routes (e.g. /dashboard/jobs/recommended)
// activate only their own item, never their parent as well.
export function findActiveHref(pathname: string, links: NavMatchable[]): string | null {
    let best: { href: string; length: number } | null = null;
    for (const link of links) {
        for (const prefix of [link.href, ...(link.match ?? [])]) {
            if (matches(pathname, prefix) && (!best || prefix.length > best.length)) {
                best = { href: link.href, length: prefix.length };
            }
        }
    }
    return best?.href ?? null;
}
```

- [ ] **Step 4: Run the check to verify it passes**

Run: `node "<scratchpad>/nav-active.check.ts"`
Expected: `all 8 passed`

- [ ] **Step 5: Commit**

```bash
git add linkify/src/utils/functions/nav-active.ts
git commit -m "feat(nav): add longest-prefix active nav resolver"
```

---

### Task 2: Grouped candidate nav data

**Files:**
- Modify: `linkify/src/utils/constants/nav-links.ts:1-49`
- Modify: `linkify/src/utils/index.ts` (export the new names)

**Interfaces:**
- Consumes: `NavMatchable` from `@/utils/functions/nav-active` (Task 1).
- Produces:
  ```ts
  export type NavBadge = "bookmarks" | "applications";
  export type DashboardNavLink = NavMatchable & { title: string; icon: LucideIcon; badge?: NavBadge };
  export type DashboardNavGroup = { label?: string; links: DashboardNavLink[] };
  export const CANDIDATE_NAV_GROUPS: DashboardNavGroup[];
  ```
  `DASHBOARD_LINKS` is removed (its only consumer is `dashboard-shell.tsx`, updated in Task 3).

- [ ] **Step 1: Replace `DASHBOARD_LINKS` with grouped data**

In `linkify/src/utils/constants/nav-links.ts`, replace the lucide import block and the `DASHBOARD_LINKS` export (keep `NAV_LINKS` as is):

```ts
import {
    BookmarkIcon,
    BriefcaseIcon,
    CompassIcon,
    LayoutDashboardIcon,
    MessageCircle,
    SendIcon,
    SparklesIcon,
    TargetIcon,
    UserIcon,
    UserCircle2,
    FileText as FileTextIcon,
    PanelsTopLeft,
    type LucideIcon,
} from "lucide-react";
import type { NavMatchable } from "@/utils/functions/nav-active";
```

```ts
export type NavBadge = "bookmarks" | "applications";
export type DashboardNavLink = NavMatchable & { title: string; icon: LucideIcon; badge?: NavBadge };
export type DashboardNavGroup = { label?: string; links: DashboardNavLink[] };

// Sidebar kandidat, dikelompokkan per tujuan. Satu-satunya sumber menu kandidat.
export const CANDIDATE_NAV_GROUPS: DashboardNavGroup[] = [
    { links: [{ title: "Ringkasan", href: "/dashboard", icon: LayoutDashboardIcon }] },
    {
        label: "Profil saya",
        links: [
            { title: "Data GitHub & CV", href: "/dashboard/onboarding",   icon: UserIcon },
            { title: "Profil & Skill",   href: "/dashboard/profile",      icon: SparklesIcon },
            { title: "CV",               href: "/dashboard/cv-generator", icon: FileTextIcon },
            { title: "Portfolio",        href: "/dashboard/portfolio",    icon: PanelsTopLeft },
        ],
    },
    {
        label: "Cari kerja",
        links: [
            { title: "Rekomendasi",    href: "/dashboard/jobs/recommended", icon: CompassIcon },
            { title: "Semua Lowongan", href: "/dashboard/jobs",             icon: BriefcaseIcon },
            { title: "Lamaranku",      href: "/dashboard/applications",     icon: SendIcon, badge: "applications" },
            { title: "Chat",           href: "/dashboard/chat",             icon: MessageCircle },
        ],
    },
    {
        label: "Tingkatkan skill",
        links: [
            { title: "Skill Gap", href: "/dashboard/skill-gap", icon: TargetIcon },
            { title: "Roadmap",   href: "/dashboard/roadmap",   icon: BookmarkIcon, match: ["/dashboard/my-roadmaps"], badge: "bookmarks" },
        ],
    },
    { label: "", links: [{ title: "Kelola Akun", href: "/dashboard/account", icon: UserCircle2 }] },
];
```

Note: `label: ""` marks a divider-only group (rendered as a divider, no heading text); `label` undefined means no divider (top group). Headings are rendered uppercase by CSS, so source labels stay sentence case.

- [ ] **Step 2: Update the barrel export**

In `linkify/src/utils/index.ts`, change the import line and the export list:

```ts
import { CANDIDATE_NAV_GROUPS, NAV_LINKS } from "./constants/nav-links";
```

Replace `DASHBOARD_LINKS,` with `CANDIDATE_NAV_GROUPS,` in the `export { ... }` list.

- [ ] **Step 3: Typecheck (expect only the shell to fail)**

Run: `cd linkify && npx tsc --noEmit`
Expected: errors only in `src/components/dashboard/dashboard-shell.tsx` about `DASHBOARD_LINKS` (fixed in Task 3). Do not commit yet; Task 3 commits both.

---

### Task 3: Render grouped nav in the shell

**Files:**
- Modify: `linkify/src/components/dashboard/dashboard-shell.tsx:3` (import) and `:219-293` (`NavLinks`)

**Interfaces:**
- Consumes: `CANDIDATE_NAV_GROUPS`, `DashboardNavLink`, `NavBadge` (Task 2); `findActiveHref` (Task 1). Existing locals `bookmarkCount`, `applicationCount`, `RECRUITER_LINKS`, `ADMIN_LINKS`, `profile`, `role`, `pathname`.

- [ ] **Step 1: Update imports**

Line 3 becomes:

```ts
import { cn, CANDIDATE_NAV_GROUPS } from "@/utils";
import type { DashboardNavLink, NavBadge } from "@/utils/constants/nav-links";
import { findActiveHref } from "@/utils/functions/nav-active";
```

- [ ] **Step 2: Replace the `NavLinks` component body**

Replace lines 219-293 (from `const NavLinks = ...` through its closing `};`) with:

```tsx
    const NavLinks = ({ showLabel = true }: { showLabel?: boolean }) => {
        // Role belum dipilih → jangan tampilkan menu apa pun (user sedang di role picker)
        if (role == null) return null;
        const showAdmin = !!profile?.is_admin;
        const groups: { label?: string; links: DashboardNavLink[] }[] =
            role === "recruiter" ? [{ links: RECRUITER_LINKS }] : CANDIDATE_NAV_GROUPS;
        const activeHref = findActiveHref(pathname, groups.flatMap((group) => group.links));
        const badgeCount: Record<NavBadge, number> = { bookmarks: bookmarkCount, applications: applicationCount };
        const badgeTone: Record<NavBadge, string> = {
            bookmarks: "border-primary/40 bg-primary/10 text-primary",
            applications: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
        };

        const heading = (label: string) => (
            <div className="mt-4 mb-1 px-3">
                {showLabel && label && <p className="font-mono text-micro uppercase tracking-widest text-muted-foreground">{label}</p>}
                {(!showLabel || !label) && <div className="h-px bg-border" />}
            </div>
        );

        return (
            <nav className="flex flex-col gap-1">
                {groups.map((group, groupIndex) => (
                    <div key={group.label ?? `group-${groupIndex}`} className="flex flex-col gap-1">
                        {group.label !== undefined && heading(group.label)}
                        {group.links.map((item) => {
                            const active = item.href === activeHref;
                            const count = item.badge ? badgeCount[item.badge] : 0;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    prefetch={false}
                                    title={!showLabel ? item.title : undefined}
                                    aria-current={active ? "page" : undefined}
                                    className={cn(
                                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-150",
                                        showLabel ? "justify-start" : "justify-center",
                                        active
                                            ? "bg-primary/10 text-foreground font-medium"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <item.icon className="size-4 shrink-0" />
                                    {showLabel && <span className="truncate flex-1">{item.title}</span>}
                                    {showLabel && item.badge && count > 0 && (
                                        <span className={cn("ml-auto rounded-[3px] border px-1.5 py-px font-mono text-micro font-semibold", badgeTone[item.badge])}>
                                            {count > 9 ? "9+" : count}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                ))}
                {showAdmin && (
                    <>
                        {heading("Admin")}
                        {ADMIN_LINKS.map((item) => {
                            const active = pathname === item.href || pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    prefetch={false}
                                    title={!showLabel ? item.title : undefined}
                                    className={cn(
                                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-all duration-150",
                                        showLabel ? "justify-start" : "justify-center",
                                        active ? "bg-amber-500/10 text-amber-600 font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <item.icon className="size-4 shrink-0" />
                                    {showLabel && <span className="truncate flex-1">{item.title}</span>}
                                </Link>
                            );
                        })}
                    </>
                )}
            </nav>
        );
    };
```

Notes: recruiter links render as one unlabeled group (`label` undefined → no heading), same visual as today but now with the single-active resolver. Admin keeps its own amber active logic, unchanged. `RECRUITER_LINKS` items have `{title, href, icon}` which satisfies `DashboardNavLink`; if TypeScript complains about the icon type, annotate `RECRUITER_LINKS` as `DashboardNavLink[]`.

- [ ] **Step 3: Typecheck and lint**

Run: `cd linkify && npx tsc --noEmit` → Expected: exit 0, no output.
Run: `cd linkify && npx next lint --file src/components/dashboard/dashboard-shell.tsx --file src/utils/constants/nav-links.ts --file src/utils/functions/nav-active.ts` → Expected: `No ESLint warnings or errors`.

- [ ] **Step 4: Check no em-dash in nav labels**

Run: `grep -n "—" linkify/src/utils/constants/nav-links.ts` → Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add linkify/src/utils/constants/nav-links.ts linkify/src/utils/index.ts linkify/src/components/dashboard/dashboard-shell.tsx
git commit -m "feat(nav): group candidate sidebar by purpose"
```

---

### Task 4: Build, deploy (with approval), visual verification

**Files:** none modified unless a defect is found.

- [ ] **Step 1: Production build**

Run: `cd linkify && npx next build` → Expected: `✓ Compiled successfully`.

- [ ] **Step 2: Ask the user to approve the push**

Push is blocked until the user says yes (Global Constraints). On approval: `git push origin master`. Vercel deploys in ~15s; confirm with `curl -s https://api.github.com/repos/zgii14/HACKATHON/commits/<sha>/status` showing `Vercel success`.

- [ ] **Step 3: Visual check on production (logged-in candidate session in the browser pane)**

Open `https://www.githire.my.id/dashboard?v=<sha>` (cache-busting) and verify:
- Expanded sidebar shows: Ringkasan; PROFIL SAYA (4); CARI KERJA (4); TINGKATKAN SKILL (2); divider; Kelola Akun.
- Exactly one item has `aria-current="page"` on each of: `/dashboard`, `/dashboard/jobs`, `/dashboard/jobs/recommended`, `/dashboard/roadmap`, `/dashboard/my-roadmaps` (Roadmap active on both).
  Check with JS (desktop sidebar and mobile drawer may both be in the DOM, so check per `<nav>`): `[...document.querySelectorAll('nav')].every(n => n.querySelectorAll('[aria-current="page"]').length <= 1)` and at least one nav has exactly 1.
- Collapsed sidebar: group headings become thin dividers.
- Mobile width: drawer shows the same groups.
- Light and dark mode: headings readable.
