# Arcade Portfolio Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `arcade` public portfolio theme (retro/holographic game UI, inspired by lars-olson.com) end to end.

**Architecture:** Pure helpers in `arcade-portfolio-config.ts` (unit-tested with `node:test`), one client component
`arcade-portfolio.tsx` routed from `PublicPortfolioView`, plus registration in the 8 other places listed in
`docs/prompts/portfolio-theme-prompt.md`. Spec: `docs/superpowers/specs/2026-10-15-arcade-portfolio-theme-design.md`.

**Tech Stack:** Next.js 14 app router, TypeScript, Tailwind v3, framer-motion 11, lucide-react, `next/font/google`
(Yellowtail); FastAPI + pydantic backend, `unittest`.

## Global Constraints

- Key `arcade`, label `Arcade`, picker detail `Retro hologram ala game`, icon `Gamepad2`.
- Palette: bg `#0B0D17`, dots `#2A2F55`, holo `#5EEAD4 → #A78BFA → #F0ABFC → #FDE68A`, accent `#5B3FD9`,
  text `#F5F3EE`, muted `#9AA0C3`. Holo gradient only on hero window border/title bar, name fill, wavy dividers.
- Square corners everywhere (radius 0). No em-dash in UI copy.
- Fonts: Yellowtail via `next/font/google` in the theme file only; otherwise `var(--font-jakarta)`, `var(--font-jetbrains)`.
- No new npm dependencies. framer-motion transform/opacity only; `useReducedMotion()` disables all motion.
- All labels id + en via `Copy`; `<main lang={content.language}>`.
- Section shows only when `content.sections?.[key] !== false` and data non-empty.
- Verified skills label: "Terverifikasi dari GitHub" (id) / "Verified from GitHub" (en).
- Photo: `${apiBase}/portfolios/${portfolio.public_id}/photo` via plain `<img>`.
- Do not touch other themes, the editor, or other APIs.

---

### Task 1: Pure helpers (`arcade-portfolio-config.ts`)

**Files:**
- Create: `linkify/src/components/portfolio/arcade-portfolio-config.ts`
- Test: `linkify/tests/arcade-portfolio.test.mts`

**Interfaces:**
- Produces:
  - `splitHeadline(headline: string): string[]`
  - `pickSkills(skills: string[], verified: VerifiedSkill[]): { verified: VerifiedSkill[]; others: string[] }`
    where `VerifiedSkill = PublicPortfolio["verified_skills"][number]`
  - `formatCount(n?: number | null): string`
  - `contactHref(kind: string, value: string): string | null`
  - `getArcadeCopy(language: PortfolioLanguage): ArcadeCopy` and `type ArcadeCopy`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
    contactHref,
    formatCount,
    getArcadeCopy,
    pickSkills,
    splitHeadline,
} from "../src/components/portfolio/arcade-portfolio-config.ts";

test("splits headline into at most three script segments", () => {
    assert.deepEqual(splitHeadline("Frontend × React × UI"), ["Frontend", "React", "UI"]);
    assert.deepEqual(splitHeadline("Backend | Python / Go"), ["Backend", "Python", "Go"]);
    assert.deepEqual(splitHeadline("Web x Mobile"), ["Web", "Mobile"]);
    assert.deepEqual(splitHeadline("A, B, C, D"), ["A", "B", "C"]);
    assert.deepEqual(splitHeadline("Full-stack developer"), ["Full-stack developer"]);
    assert.deepEqual(splitHeadline("  "), []);
    assert.deepEqual(splitHeadline("Next.js • Tailwind"), ["Next.js", "Tailwind"]);
});

test("does not split on x inside words", () => {
    assert.deepEqual(splitHeadline("Nginx expert"), ["Nginx expert"]);
});

test("separates verified skills from the rest without duplicates", () => {
    const verified = [{ skill: "React" }, { skill: "Python", level: "advanced" }];
    const result = pickSkills(["react", "Go", "PYTHON", "Docker"], verified);
    assert.deepEqual(result.verified.map((item) => item.skill), ["React", "Python"]);
    assert.deepEqual(result.others, ["Go", "Docker"]);
});

test("caps verified at 8 and others at 16", () => {
    const verified = Array.from({ length: 10 }, (_, i) => ({ skill: `V${i}` }));
    const skills = Array.from({ length: 20 }, (_, i) => `S${i}`);
    const result = pickSkills(skills, verified);
    assert.equal(result.verified.length, 8);
    assert.equal(result.others.length, 16);
});

test("formats counts compactly", () => {
    assert.equal(formatCount(undefined), "0");
    assert.equal(formatCount(-3), "0");
    assert.equal(formatCount(42), "42");
    assert.equal(formatCount(1234), "1.2k");
    assert.equal(formatCount(1000), "1k");
});

test("builds contact hrefs", () => {
    assert.equal(contactHref("email", "a@b.co"), "mailto:a@b.co");
    assert.equal(contactHref("whatsapp", "+62 812-3456"), "https://wa.me/628123456");
    assert.equal(contactHref("github", "github.com/me"), "https://github.com/me");
    assert.equal(contactHref("website", "https://me.dev"), "https://me.dev");
    assert.equal(contactHref("fax", "123"), null);
});

test("provides id and en copy with the verified label", () => {
    assert.equal(getArcadeCopy("id").verified, "Terverifikasi dari GitHub");
    assert.equal(getArcadeCopy("en").verified, "Verified from GitHub");
    assert.equal(getArcadeCopy("en").projects, "Projects");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd linkify && node --test tests/arcade-portfolio.test.mts`
Expected: FAIL, cannot find module `arcade-portfolio-config.ts`.

- [ ] **Step 3: Write implementation**

```ts
import type { PortfolioLanguage, PublicPortfolio } from "./types";

type VerifiedSkill = PublicPortfolio["verified_skills"][number];

export type ArcadeCopy = {
    about: string;
    projects: string;
    skills: string;
    verified: string;
    otherSkills: string;
    experience: string;
    education: string;
    certifications: string;
    contact: string;
    githubVerified: string;
    commits: string;
    repos: string;
    stars: string;
    openRepo: string;
    scroll: string;
    madeWith: string;
};

const COPY: Record<PortfolioLanguage, ArcadeCopy> = {
    id: {
        about: "Tentang",
        projects: "Proyek",
        skills: "Skill",
        verified: "Terverifikasi dari GitHub",
        otherSkills: "Skill lainnya",
        experience: "Pengalaman",
        education: "Pendidikan",
        certifications: "Sertifikasi",
        contact: "Kontak",
        githubVerified: "GitHub terverifikasi",
        commits: "commit",
        repos: "repo",
        stars: "bintang",
        openRepo: "Buka repository",
        scroll: "Gulir ke bawah",
        madeWith: "Dibuat dengan",
    },
    en: {
        about: "About",
        projects: "Projects",
        skills: "Skills",
        verified: "Verified from GitHub",
        otherSkills: "Other skills",
        experience: "Experience",
        education: "Education",
        certifications: "Certifications",
        contact: "Contact",
        githubVerified: "GitHub verified",
        commits: "commits",
        repos: "repos",
        stars: "stars",
        openRepo: "Open repository",
        scroll: "Scroll down",
        madeWith: "Created with",
    },
};

export function getArcadeCopy(language: PortfolioLanguage): ArcadeCopy {
    return COPY[language] ?? COPY.id;
}

export function splitHeadline(headline: string): string[] {
    const trimmed = (headline ?? "").trim();
    if (!trimmed) return [];
    const parts = trimmed
        .split(/\s*[×|/·•,]\s*|\s+x\s+/i)
        .map((part) => part.trim())
        .filter(Boolean);
    return (parts.length ? parts : [trimmed]).slice(0, 3);
}

export function pickSkills(skills: string[], verified: VerifiedSkill[]) {
    const verifiedList = (verified ?? []).filter((item) => item?.skill).slice(0, 8);
    const seen = new Set(verifiedList.map((item) => item.skill.toLowerCase()));
    const others: string[] = [];
    for (const skill of skills ?? []) {
        const key = skill.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        others.push(skill.trim());
        if (others.length === 16) break;
    }
    return { verified: verifiedList, others };
}

export function formatCount(n?: number | null): string {
    if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return "0";
    if (n < 1000) return String(Math.round(n));
    return `${Number((n / 1000).toFixed(1))}k`;
}

export function contactHref(kind: string, value: string): string | null {
    const v = value.trim();
    if (!v) return null;
    if (kind === "email") return `mailto:${v}`;
    if (kind === "whatsapp") return `https://wa.me/${v.replace(/\D/g, "")}`;
    if (kind === "github" || kind === "linkedin" || kind === "website") {
        return /^https?:\/\//i.test(v) ? v : `https://${v}`;
    }
    return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd linkify && node --test tests/arcade-portfolio.test.mts` → all PASS.

- [ ] **Step 5: Commit** `feat(portfolio): arcade theme helpers`

---

### Task 2: Register `arcade` everywhere except the renderer + preview

**Files:**
- Modify: `linkify/src/components/portfolio/types.ts:1` — `PortfolioTheme` union adds `"arcade"`.
- Modify: `linkify/src/components/portfolio/public-portfolio-theme.ts` — add
  `arcade: { key: "arcade", label: "Arcade portfolio", sectionOrder: ["projects", "skills", "experience", "education", "certifications"] }`.
- Modify: `linkify/src/components/portfolio/public-portfolio-page.tsx:7` — `THEMES` adds `"arcade"`.
- Modify: `backend/app/services/portfolio.py:6` — `PORTFOLIO_THEMES` adds `"arcade"`.
- Modify: `backend/app/schemas.py:184` — `Literal[..., "arcade"]`.
- Test: `linkify/tests/public-portfolio-theme.test.mts`, `backend/test_portfolio.py`.

- [ ] **Step 1: Failing tests**

Append to `linkify/tests/public-portfolio-theme.test.mts`:
```ts
test("uses proof-first ordering for Arcade", () => {
    assert.deepEqual(getPublicThemePlan("arcade"), {
        key: "arcade",
        label: "Arcade portfolio",
        sectionOrder: ["projects", "skills", "experience", "education", "certifications"],
    });
});
```
Add to `backend/test_portfolio.py` beside the maestro tests (same class, same fixtures):
```python
    def test_patch_accepts_arcade_theme(self):
        patch = PortfolioPatch(theme="arcade")
        self.assertEqual(patch.theme, "arcade")

    def test_public_view_preserves_arcade_theme(self):
        # mirror test_public_view_preserves_maestro_theme with theme "arcade"
```
(copy the body of `test_public_view_preserves_maestro_theme` exactly, replacing `"maestro"` with `"arcade"`).

- [ ] **Step 2:** Run `node --test tests/public-portfolio-theme.test.mts` and `python -m unittest test_portfolio` → FAIL.
- [ ] **Step 3:** Apply the five registrations above.
- [ ] **Step 4:** Re-run both → PASS. `npx tsc --noEmit` will now FAIL on `themeMeta`/`themeIcons` records (expected; fixed in Task 4).
- [ ] **Step 5: Commit** `feat(portfolio): register arcade theme key`

---

### Task 3: `ArcadePortfolio` renderer + router branch

**Files:**
- Create: `linkify/src/components/portfolio/arcade-portfolio.tsx`
- Modify: `linkify/src/components/portfolio/public-portfolio.tsx` — import + `if (theme === "arcade") return <ArcadePortfolio portfolio={portfolio} apiBase={apiBase} contacts={contacts} />;`
- Test: `linkify/tests/arcade-public-renderer.test.mts`

**Interfaces:**
- Consumes: all Task 1 exports.
- Produces: `export function ArcadePortfolio({ portfolio, apiBase, contacts }: { portfolio: PublicPortfolio; apiBase: string; contacts: Array<[string, string]> })`.

- [ ] **Step 1: Failing source-level test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const renderer = readFileSync(new URL("../src/components/portfolio/arcade-portfolio.tsx", import.meta.url), "utf8");
const router = readFileSync(new URL("../src/components/portfolio/public-portfolio.tsx", import.meta.url), "utf8");

test("builds the Arcade public page", () => {
    assert.match(renderer, /^"use client";/);
    assert.match(renderer, /export function ArcadePortfolio/);
    assert.match(renderer, /useReducedMotion/);
    assert.match(renderer, /Yellowtail/);
    assert.match(renderer, /portfolios\/\$\{portfolio\.public_id\}\/photo/);
    assert.match(renderer, /copy\.verified/);
    assert.match(renderer, /lang=\{content\.language\}/);
    for (const id of ["about", "projects", "skills", "experience", "education", "certifications"]) {
        assert.match(renderer, new RegExp(`id=["']${id}["']`));
    }
    assert.match(renderer, /GitHire/);
});

test("respects section toggles", () => {
    assert.match(renderer, /sections\?\.\[key\] !== false/);
});

test("routes only the Arcade theme to the Arcade renderer", () => {
    assert.match(router, /import \{ ArcadePortfolio \} from "\.\/arcade-portfolio"/);
    assert.match(router, /theme === "arcade"/);
    assert.match(router, /<ArcadePortfolio/);
});
```

- [ ] **Step 2:** `node --test tests/arcade-public-renderer.test.mts` → FAIL (file missing).
- [ ] **Step 3: Implement component** with this structure (all styles per Global Constraints):
  - Module scope: `const yellowtail = Yellowtail({ weight: "400", subsets: ["latin"], display: "swap", variable: "--font-arcade-script" });`
  - `Window({ title?, holo?, children, className })`: frame (`border-2`, violet or holo via gradient wrapper `p-[2px] bg-[linear-gradient(...)]`), title bar with 3 outlined squares; `motion.div` boot animation `initial={{opacity:0, scale:0.96}} whileInView={{opacity:1, scale:1}} viewport={{once:true, amount:0.2}}`, replaced by plain final state when `reduceMotion`.
  - `WavyDivider`: inline SVG path, stroke `url(#arcade-holo)` linear gradient, `aria-hidden`.
  - `SectionTitle`: holo-free, Jakarta 800, cyan `#5EEAD4` text, `id` on the `<section>`.
  - Hero: dotted bg, holo `Window` containing name (`bg-clip-text text-transparent` holo gradient, `break-words`), headline segments in Yellowtail joined by `×` span in `#F0ABFC`, `github_verified` badge (BadgeCheck icon + `copy.githubVerified`), contact icon links via `contactHref`; side art: photo with `grayscale contrast-125` + violet `mix-blend-multiply` overlay + dot mask overlay (`radial-gradient` bg-size 6px), else dotted circle/triangle ornaments; dashed arrow with bobbing motion.
  - About: `Window` with bio, only when bio non-empty.
  - Projects: `grid gap-10 md:grid-cols-2`; each card = `<a href target="_blank" rel="noreferrer">` violet `Window`, body `min-h-40` with repo name, description (if any), chips (`tech_stack.slice(0,5)`), status bar `★ formatCount(stars) copy.stars · formatCount(own_commits) copy.commits`; title below with corner bracket (absolute L-border `#5B3FD9`); hover `-translate-y-0.5` disabled with `motion-reduce:`.
  - Skills: `pickSkills`; verified as achievement tiles (`grid sm:grid-cols-2 lg:grid-cols-4`) with level and `evidence.own_commits`/`evidence.repos`; label `copy.verified`; others as square chips under `copy.otherSkills`.
  - Experience / Education: timeline (`border-l-2 border-[#5B3FD9]`, square markers) in `Window`s.
  - Certifications: list in `Window`.
  - Footer: contact icons + `© year name` + `copy.madeWith GitHire`.
  - `sectionOn(key)` = `content.sections?.[key] !== false`.
- [ ] **Step 4:** test → PASS; `npx eslint src/components/portfolio` clean.
- [ ] **Step 5: Commit** `feat(portfolio): arcade public renderer`

---

### Task 4: Theme picker preview card

**Files:**
- Modify: `linkify/src/components/portfolio/theme-preview-cards.tsx`
- Test: `linkify/tests/arcade-theme-preview.test.mts`

- [ ] **Step 1: Failing test**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/components/portfolio/theme-preview-cards.tsx", import.meta.url), "utf8");

test("registers the Arcade selector and preview", () => {
    assert.match(source, /arcade:\s*\{\s*label:\s*"Arcade"/);
    assert.match(source, /Retro hologram ala game/);
    assert.match(source, /function ArcadePreview/);
    assert.match(source, /theme === "arcade"/);
    assert.match(source, /arcade: Gamepad2/);
});
```

- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3:** add `themeMeta.arcade = { label: "Arcade", detail: "Retro hologram ala game" }`; `ArcadePreview` (`h-28 overflow-hidden bg-[#0B0D17]`, `aria-hidden`, dotted bg, mini holo window with 3 squares + name in holo gradient + headline in mono, small violet project window with `projectName`); `if (theme === "arcade") return <ArcadePreview {...data} />;`; import `Gamepad2`, `themeIcons.arcade = Gamepad2`.
- [ ] **Step 4:** test PASS; `npx tsc --noEmit` clean.
- [ ] **Step 5: Commit** `feat(portfolio): arcade theme picker preview`

---

### Task 5: Full verification

- [ ] `cd linkify && npx tsc --noEmit && npx eslint src/components/portfolio && node --test tests/*.test.mts && pnpm build`
- [ ] `cd backend && python -m unittest discover -p "test_*.py"`
- [ ] Browser: run `pnpm dev`, open `/p/<publicId>?theme=arcade` against production API data (or local), at 375 / 768 / 1280 widths, with reduced motion, and `&embed=1` at 1280×800. Check no horizontal scroll, long name wraps, sections toggle.
- [ ] Fix anything found, commit, report. Push only with user approval.
