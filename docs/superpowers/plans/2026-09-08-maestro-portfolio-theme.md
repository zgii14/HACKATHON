# Maestro Portfolio Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fourth `maestro` portfolio theme that adapts MaestroClass's cinematic editorial layout and motion to GitHire's existing public portfolio data.

**Architecture:** Extend the existing JSON theme contract without a database migration, then add an isolated `MaestroPortfolio` renderer backed by pure deterministic motion/content helpers. Keep the editor, public route, security projection, and current three themes intact; all heavy choreography uses the installed Framer Motion and CSS with sequential reduced-motion/mobile fallbacks.

**Tech Stack:** FastAPI, Pydantic v2, Python unittest, Next.js 14 App Router, React, TypeScript, Tailwind CSS, Framer Motion v11.9.0, Node test runner

**Spec:** `docs/superpowers/specs/2026-09-08-maestro-portfolio-theme-design.md`

## Global Constraints

- Preserve the existing Editorial, Developer, and Professional themes.
- The canonical identifier is `maestro`; the editor label is `Maestro`.
- Do not add database columns or migrations; the theme remains JSON content.
- Do not add an animation dependency; use `framer-motion` v11.9.0 and CSS.
- Do not copy MaestroClass text, proprietary source code, photography, Framer badges, or purchase UI.
- Use only public portfolio data, the candidate photo, and original project-owned visual treatments.
- `Verified from GitHub` evidence remains server-derived and uneditable.
- Keep the existing six-project cap, draft/publish lifecycle, section visibility, and opt-in contacts.
- Preserve a complete document-flow experience for mobile and `prefers-reduced-motion` users.
- Do not modify `linkify/src/components/landing/landing-redesign.tsx` or `pitch-deck/`.

---

### Task 1: Extend the backend theme contract

**Files:**
- Modify: `backend/test_portfolio.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/services/portfolio.py`

**Interfaces:**
- Consumes: `PortfolioPatch(theme=...)` and `public_view(public_id, content, verified_skills, has_photo)`.
- Produces: `maestro` as an accepted, persisted, and publicly sanitized theme identifier.

- [ ] **Step 1: Write failing theme-contract tests**

Add tests beside `test_patch_rejects_unknown_theme` and `test_public_view_normalizes_nullable_fields`:

```python
def test_patch_accepts_maestro_theme(self):
    patch = PortfolioPatch(theme="maestro")
    self.assertEqual(patch.theme, "maestro")

def test_public_view_preserves_maestro_theme(self):
    result = public_view(
        "opaque-id",
        {"name": "Candidate", "headline": "Developer", "theme": "maestro"},
        [],
        False,
    )
    self.assertEqual(result["content"]["theme"], "maestro")
```

- [ ] **Step 2: Run the focused backend tests and confirm RED**

Run from `backend`:

```powershell
.venv\Scripts\python.exe -m unittest test_portfolio.PortfolioDomainTests.test_patch_accepts_maestro_theme test_portfolio.PortfolioDomainTests.test_public_view_preserves_maestro_theme
```

Expected: the Pydantic literal rejects `maestro`, and `public_view` normalizes it to `professional`.

- [ ] **Step 3: Extend both backend allow-lists**

Change the definitions to:

```python
PORTFOLIO_THEMES = {"editorial", "developer", "professional", "maestro"}
```

```python
theme: Literal["editorial", "developer", "professional", "maestro"] | None = None
```

- [ ] **Step 4: Run the focused tests and confirm GREEN**

Run the command from Step 2. Expected: 2 tests pass.

- [ ] **Step 5: Run backend portfolio regression tests**

```powershell
.venv\Scripts\python.exe -m unittest test_portfolio
.venv\Scripts\python.exe -m py_compile app\schemas.py app\services\portfolio.py
```

Expected: all existing portfolio tests pass and both edited files compile.

- [ ] **Step 6: Commit the backend contract**

```powershell
git add -- backend/test_portfolio.py backend/app/schemas.py backend/app/services/portfolio.py
git commit -m "feat: allow maestro portfolio theme"
```

### Task 2: Register Maestro in the frontend theme selector

**Files:**
- Modify: `linkify/src/components/portfolio/types.ts`
- Modify: `linkify/src/components/portfolio/public-portfolio-theme.ts`
- Modify: `linkify/src/components/portfolio/theme-preview-cards.tsx`
- Modify: `linkify/tests/public-portfolio-theme.test.mts`
- Create: `linkify/tests/maestro-theme-preview.test.mts`

**Interfaces:**
- Consumes: existing `PortfolioContent`, `PortfolioTheme`, and `getThemePreviewData(content)`.
- Produces: `PortfolioTheme` containing `maestro`, a `PublicThemePlan`, and an editor preview labeled `Maestro`.

- [ ] **Step 1: Write failing plan and preview-source tests**

Add to `public-portfolio-theme.test.mts`:

```ts
test("uses cinematic proof-first ordering for Maestro", () => {
    assert.deepEqual(getPublicThemePlan("maestro"), {
        key: "maestro",
        label: "Maestro portfolio",
        sectionOrder: ["projects", "experience", "skills", "education", "certifications"],
    });
});
```

Create `maestro-theme-preview.test.mts` to assert that the selector source contains the `maestro` metadata and preview branch:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
    new URL("../src/components/portfolio/theme-preview-cards.tsx", import.meta.url),
    "utf8",
);

test("registers the Maestro selector and candidate-driven preview", () => {
    assert.match(source, /maestro:\s*\{\s*label:\s*"Maestro"/);
    assert.match(source, /function MaestroPreview/);
    assert.match(source, /theme === "maestro"/);
    assert.match(source, /Sinematik, editorial, dan immersive/);
});
```

- [ ] **Step 2: Run tests and confirm RED**

```powershell
node --experimental-strip-types tests/public-portfolio-theme.test.mts
node --experimental-strip-types tests/maestro-theme-preview.test.mts
```

Expected: `maestro` is not assignable/registered.

- [ ] **Step 3: Extend the type and theme plan**

Use:

```ts
export type PortfolioTheme = "editorial" | "developer" | "professional" | "maestro";
```

Register:

```ts
maestro: {
    key: "maestro",
    label: "Maestro portfolio",
    sectionOrder: ["projects", "experience", "skills", "education", "certifications"],
},
```

- [ ] **Step 4: Add a candidate-driven miniature preview**

Add theme metadata:

```ts
maestro: { label: "Maestro", detail: "Sinematik, editorial, dan immersive" },
```

Implement `MaestroPreview` with a sage background, italic serif headline, dark rounded project stage, and values from `getThemePreviewData`. Add a `Sparkles` icon to `themeIcons` and route `theme === "maestro"` to this preview.

- [ ] **Step 5: Run focused tests and TypeScript**

```powershell
node --experimental-strip-types tests/public-portfolio-theme.test.mts
node --experimental-strip-types tests/maestro-theme-preview.test.mts
& .\node_modules\.bin\tsc.cmd --noEmit
```

Expected: both focused tests and TypeScript pass.

- [ ] **Step 6: Commit theme registration**

```powershell
git add -- src/components/portfolio/types.ts src/components/portfolio/public-portfolio-theme.ts src/components/portfolio/theme-preview-cards.tsx tests/public-portfolio-theme.test.mts tests/maestro-theme-preview.test.mts
git commit -m "feat: register maestro portfolio theme"
```

### Task 3: Build deterministic Maestro presentation helpers

**Files:**
- Create: `linkify/src/components/portfolio/maestro-portfolio-config.ts`
- Create: `linkify/tests/maestro-portfolio.test.mts`

**Interfaces:**
- Consumes: `PortfolioProject` from `types.ts`.
- Produces: `getMaestroProjects`, `getMaestroChapterProgress`, `getMaestroCardTransform`, `getMaestroProjectPalette`, `getMaestroMetaItems`, `splitMaestroWords`, and `MAESTRO_PROJECT_TITLE_WRAP`.

- [ ] **Step 1: Write failing pure-helper tests**

Create tests that require these exact outcomes:

```ts
assert.equal(getMaestroProjects(projects).length, 6);
assert.equal(getMaestroChapterProgress(-0.2, 5), 0);
assert.equal(getMaestroChapterProgress(1.2, 5), 4);
assert.deepEqual(getMaestroCardTransform(0, 0, true), {
    x: 0, y: 0, rotate: 0, scale: 1, opacity: 1,
});
assert.deepEqual(splitMaestroWords("Backend  & AI Engineer"), ["Backend", "&", "AI", "Engineer"]);
assert.deepEqual(getMaestroMetaItems(projects[0]), ["TypeScript", "FastAPI", "3 stars", "0 commits"]);
assert.equal(getMaestroProjectPalette(0).surface, "#B1C6C0");
```

Also assert clamping for zero projects, stable repeating palettes, deterministic card transforms, and `overflowWrap: "anywhere"`.

- [ ] **Step 2: Run the helper test and confirm RED**

```powershell
node --experimental-strip-types tests/maestro-portfolio.test.mts
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement minimal pure helpers**

Use a six-item project slice, a fixed original palette array, whitespace-safe word splitting, and a fixed transform matrix. `getMaestroChapterProgress(progress, count)` must clamp `progress` to `0..1`, multiply by the available index range, and round to a valid project index. `getMaestroCardTransform(..., reduceMotion=true)` must always return the stable transform asserted above.

- [ ] **Step 4: Run helper tests and confirm GREEN**

Run the command from Step 2. Expected: all Maestro helper tests pass.

- [ ] **Step 5: Commit the pure presentation layer**

```powershell
git add -- src/components/portfolio/maestro-portfolio-config.ts tests/maestro-portfolio.test.mts
git commit -m "feat: add maestro motion helpers"
```

### Task 4: Implement the isolated Maestro public renderer

**Files:**
- Create: `linkify/src/components/portfolio/maestro-portfolio.tsx`
- Modify: `linkify/src/components/portfolio/public-portfolio.tsx`
- Create: `linkify/tests/maestro-public-renderer.test.mts`

**Interfaces:**
- Consumes: `PublicPortfolio`, sanitized contacts, the helpers from Task 3, and the existing public photo endpoint.
- Produces: `MaestroPortfolio({ portfolio, apiBase, contacts })` and public-view routing for `theme === "maestro"`.

- [ ] **Step 1: Write failing renderer structure tests**

Create source-level tests that assert the renderer exports `MaestroPortfolio`, imports `useScroll`, `useTransform`, and `useReducedMotion`, contains section IDs `work`, `about`, `proof`, `background`, and `contact`, renders the exact `Verified from GitHub` label, and uses the public photo URL. Assert `public-portfolio.tsx` imports and returns `MaestroPortfolio` only for `maestro`.

- [ ] **Step 2: Run renderer tests and confirm RED**

```powershell
node --experimental-strip-types tests/maestro-public-renderer.test.mts
```

Expected: renderer module/registration is missing.

- [ ] **Step 3: Build shared renderer primitives inside the isolated file**

Implement focused local components:

```ts
type MaestroPortfolioProps = {
    portfolio: PublicPortfolio;
    apiBase: string;
    contacts: Array<[string, string]>;
};
```

Add `MaestroNav`, `MaestroPhoto`, `SplitDisplay`, `ProjectStrip`, `ProjectChapters`, `AboutSection`, `ProjectGallery`, `ProofStack`, `BackgroundSection`, `ContactSection`, and `MaestroFooter`. Keep contact URL mapping equivalent to the existing public renderer and use semantic links/headings.

- [ ] **Step 4: Implement scroll choreography**

Use a sticky wrapper only at `lg` widths. Bind wrapper progress with `useScroll({ target, offset: ["start start", "end end"] })`. Derive image translation, rotation, scale, text opacity, and counter content from motion values; do not update React state on every frame. Use `whileInView` for one-shot secondary entrances.

- [ ] **Step 5: Implement responsive and reduced-motion fallbacks**

Use `useReducedMotion()` to select stable helper transforms, short/zero transition durations, and normal-flow chapters. Add `motion-reduce:*` utilities. Use `overflow-x-auto`, `snap-x`, and focusable project links for the mobile gallery. Disable pointer tilt for coarse pointers through CSS media queries or feature checks.

- [ ] **Step 6: Register the public renderer**

Import `MaestroPortfolio` and add:

```tsx
if (theme === "maestro") return <MaestroPortfolio portfolio={portfolio} apiBase={apiBase} contacts={contacts} />;
```

before the Professional fallback.

- [ ] **Step 7: Run renderer tests and TypeScript**

```powershell
node --experimental-strip-types tests/maestro-public-renderer.test.mts
& .\node_modules\.bin\tsc.cmd --noEmit
```

Expected: renderer tests and TypeScript pass.

- [ ] **Step 8: Commit the renderer**

```powershell
git add -- src/components/portfolio/maestro-portfolio.tsx src/components/portfolio/public-portfolio.tsx tests/maestro-public-renderer.test.mts
git commit -m "feat: build maestro portfolio experience"
```

### Task 5: Run the full verification story

**Files:**
- Modify only if verification exposes a Maestro-specific defect.

**Interfaces:**
- Consumes: the complete backend and frontend implementation.
- Produces: evidence that theme selection, sanitization, rendering, responsive behavior, and fallbacks work without regressing existing themes.

- [ ] **Step 1: Run all portfolio-focused tests**

```powershell
Set-Location backend
.venv\Scripts\python.exe -m unittest test_portfolio
Set-Location ..\linkify
node --experimental-strip-types tests/public-portfolio-theme.test.mts
node --experimental-strip-types tests/theme-preview-data.test.mts
node --experimental-strip-types tests/editorial-portfolio.test.mts
node --experimental-strip-types tests/maxfolio-portfolio.test.mts
node --experimental-strip-types tests/maestro-theme-preview.test.mts
node --experimental-strip-types tests/maestro-portfolio.test.mts
node --experimental-strip-types tests/maestro-public-renderer.test.mts
```

Expected: every command passes.

- [ ] **Step 2: Run static and production checks**

```powershell
& .\node_modules\.bin\tsc.cmd --noEmit
pnpm build
Set-Location ..
git diff --check
```

Expected: TypeScript and production compilation pass. If Next.js compiles and later fails only with Windows worker `spawn EPERM`, record that separately as an environment process-spawn limitation.

- [ ] **Step 3: Verify the editor and public renderer in a browser**

Run the app with its available local data/API setup. Verify:

- Maestro is the fourth selector card and selecting it updates the draft preview.
- A published Maestro URL renders candidate content, not reference copy.
- Desktop hero, project strip, numbered sticky chapters, card stack, gallery, proof, background, contact, and footer are visible.
- Scrolling never shows an empty pinned stage.
- Project and contact links are focusable and work.
- Disabled sections and disabled contacts are absent.

- [ ] **Step 4: Verify mobile and reduced motion**

At a mobile viewport, confirm sequential content, scroll-snap project gallery, readable typography, and no overlap over controls. Emulate `prefers-reduced-motion: reduce` and confirm all content is immediately available without parallax, tilt, rotation, or scrub dependency.

- [ ] **Step 5: Compare palette against the measured DNA**

Capture a desktop hero screenshot and verify that the intended dominant surfaces are `#F2F4D9`, `#DFE5D7`, `#B1C6C0`, `#2F362B`, and `#151B13`. Fix any accidental GitHire-dashboard palette leakage inside the public theme.

- [ ] **Step 6: Commit verification fixes, if any**

Stage only Maestro-related files and use:

```powershell
git commit -m "fix: polish maestro portfolio verification"
```

Skip this commit when verification required no code changes.
