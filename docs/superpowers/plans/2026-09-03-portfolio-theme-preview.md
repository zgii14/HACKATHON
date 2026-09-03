# Portfolio Theme Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let candidates select a visually distinct portfolio theme from small, live-data preview cards, and render each published theme with its own information hierarchy.

**Architecture:** A presentational `ThemePreviewCards` component receives the in-memory draft data and calls the existing editor theme setter. `PublicPortfolioView` splits rendering into three theme-specific layouts while preserving the current public API, contact filtering, and section toggles.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript strict mode, Tailwind CSS, existing Lucide React icons.

**Spec:** `docs/superpowers/specs/2026-09-03-portfolio-theme-preview-design.md`

## Global Constraints

- Do not add an API, database field, iframe, modal, screenshot generation, remote font, or dependency.
- Use the existing application fonts and existing dashboard primary colour tokens; do not change global theme tokens.
- Theme selection changes unsaved `PortfolioContent.theme` only; existing Save draft, Publish, and Update public portfolio actions persist it.
- Professional remains the fallback/default theme.
- Keep public contact and privacy rules unchanged; use only the public `PublicPortfolio` data contract.
- Preserve keyboard access, visible focus, `aria-pressed`, responsive layout, and reduced-motion-friendly interaction.

---

### Task 1: Build the visual theme selector

**Files:**
- Create: `linkify/src/components/portfolio/theme-preview-cards.tsx`
- Modify: `linkify/src/components/portfolio/portfolio-editor.tsx:29-33,304-310`
- Test: `linkify/tests/theme-preview-data.test.mts` using Node's built-in TypeScript test support

**Interfaces:**
- Consumes: `PortfolioContent` and `PortfolioTheme` from `./types`.
- Produces: `ThemePreviewCards({ content, onSelect }): JSX.Element`, where `onSelect(theme: PortfolioTheme): void` updates the unsaved editor state.

- [x] **Step 1: Establish a failing data-helper test**

Run: `node --test linkify/tests/theme-preview-data.test.mts`

Expected: FAIL because `theme-preview-data.ts` does not exist. The repository has no Vitest, Jest, Playwright, or Storybook test runner, so the pure preview-data behavior uses Node's built-in runner without introducing a dependency.

- [x] **Step 2: Create the selector with live-data fallbacks**

Create `theme-preview-cards.tsx` with a `THEME_META` record for `editorial`, `developer`, and `professional`. Each button must use `content.name || "Your name"`, `content.headline || "Your professional headline"`, `content.projects[0]?.repo_name || "Featured project"`, and `content.experience[0]?.role || "Experience"`. Render three compact layout thumbnails: editorial headline plus rule, developer terminal header plus code rows, professional avatar/metadata plus chronology rows. Add `type="button"`, `aria-pressed={selected}`, and an accessible `aria-label` naming the theme.

- [x] **Step 3: Replace text-only editor controls**

In `portfolio-editor.tsx`, replace the `THEMES.map(...)` button list with:

```tsx
<ThemePreviewCards
  content={form}
  onSelect={(theme) => setForm({ ...form, theme })}
/>
```

Keep the surrounding panel and save controls. Do not call an API in the preview component.

- [x] **Step 4: Verify compilation and interaction contract**

Run: `cd linkify; .\\node_modules\\.bin\\tsc.cmd --noEmit --incremental false`

Expected: PASS. Source review confirms each card only invokes `onSelect`, and `PortfolioEditor` only updates in-memory `form.theme`; the existing Save draft action remains responsible for persistence. A screenshot check was unavailable because no browser provider exists in this session.

### Task 2: Give public themes distinct structures

**Files:**
- Modify: `linkify/src/components/portfolio/public-portfolio.tsx:1-146`
- Test: `linkify/tests/public-portfolio-theme.test.mts`, TypeScript compiler check, and production route build

**Interfaces:**
- Consumes: `PublicPortfolio` and `apiBase` exactly as the existing `PublicPortfolioView` signature.
- Produces: the same public-page semantics for every `content.theme`, with no external contract change.

- [x] **Step 1: Establish the renderer preservation check**

Run: `cd linkify; .\\node_modules\\.bin\\tsc.cmd --noEmit --incremental false`

Expected: PASS before refactor. Retain helper behavior for initials, contact `href`, `has_photo`, verified-skill evidence, and disabled sections while changing only presentation hierarchy.

- [x] **Step 2: Extract shared safe content helpers**

Keep the existing data derivation at the top of `PublicPortfolioView`: projects, skills, experience, education, certifications, filtered contacts, and `sectionEnabled`. Add small shared JSX helpers only for photo and contact links so every layout retains the existing public-safe behavior.

- [x] **Step 3: Implement Editorial layout**

Render a parchment page with a large identity/bio lead, an editorial rule, and annotated selected work immediately after the introduction. Keep the work section above skills and chronology. Use plum for links and clay for small labels; use serif-like hierarchy only through the existing font stack/classes, not a remote font.

- [x] **Step 4: Implement Developer layout**

Render a charcoal terminal-style masthead, compact technical metadata, project modules with stack and GitHub metrics ahead of narrative sections, and a signal-green verified-skill treatment. Keep sufficient contrast and preserve ordinary links rather than turning the interface into a fake terminal.

- [x] **Step 5: Implement Professional layout**

Render a porcelain, recruiter-scannable profile summary with a chronology-first two-column desktop structure. Place experience/education near the top, then projects and skills. Keep the mobile order single-column and readable.

- [x] **Step 6: Verify type safety and public route output**

Run: `cd linkify; .\\node_modules\\.bin\\tsc.cmd --noEmit --incremental false`

Expected: PASS. The production build confirms `/p/[publicId]` remains dynamic. Source review confirms every optional section uses `sectionEnabled`, contacts retain the shared URL helper, and responsive grids collapse to one column. Screenshot inspection remains a manual follow-up because no browser provider exists in this session.

### Task 3: Review the finished UI and production build

**Files:**
- Modify: the two components above only if review exposes a defect.
- Test: focused lint, TypeScript, and Next production build.

**Interfaces:**
- Consumes: completed Task 1 and Task 2 components.
- Produces: a buildable portfolio editor and public route.

- [x] **Step 1: Run focused lint**

Run: `cd linkify; .\\node_modules\\.bin\\next.cmd lint --file src/components/portfolio/portfolio-editor.tsx --file src/components/portfolio/theme-preview-cards.tsx --file src/components/portfolio/public-portfolio.tsx`

Expected: PASS with no new lint errors.

- [x] **Step 2: Run strict TypeScript**

Run: `cd linkify; .\\node_modules\\.bin\\tsc.cmd --noEmit --incremental false`

Expected: PASS.

- [x] **Step 3: Run the production build**

Run: `cd linkify; node --env-file=D:\\HACKATHON\\linkify\\.env.local --max-old-space-size=4096 .\\node_modules\\next\\dist\\bin\\next build`

Expected: PASS; `/dashboard/portfolio` remains generated and `/p/[publicId]` remains dynamic.

- [x] **Step 4: Commit only implementation files**

Run: `git add linkify/src/components/portfolio/portfolio-editor.tsx linkify/src/components/portfolio/theme-preview-cards.tsx linkify/src/components/portfolio/theme-preview-data.ts linkify/src/components/portfolio/public-portfolio.tsx linkify/src/components/portfolio/public-portfolio-theme.ts linkify/tests/theme-preview-data.test.mts linkify/tests/public-portfolio-theme.test.mts docs/superpowers/plans/2026-09-03-portfolio-theme-preview.md; git commit -m "feat: add visual portfolio theme previews"`

Expected: commit excludes pre-existing unrelated changes in `linkify/package.json`, `linkify/pnpm-workspace.yaml`, and untracked user files.

## Self-review

- Spec coverage: Task 1 covers compact live-data preview cards, selection semantics, and the no-modal/no-API constraint. Task 2 covers all three layout identities and preserves public-contact/privacy behavior. Task 3 covers the required accessibility-adjacent compilation/lint/build verification and scoped commit.
- Placeholder scan: no TBD/TODO markers or unspecified implementation steps remain.
- Type consistency: `ThemePreviewCards` accepts `PortfolioContent` and returns a `PortfolioTheme` through its callback; `PortfolioEditor` already owns that state. `PublicPortfolioView` retains its existing signature and consumes `PublicPortfolio` throughout.
