# Maestro Portfolio Theme Design

Date: 2026-09-08  
Status: Approved in chat; awaiting written-spec review  
Project: GitHire public portfolio generator

## Summary

Add `maestro` as a fourth curated GitHire portfolio theme. The theme adapts the visual language and interaction choreography of the MaestroClass reference into a public developer portfolio: cinematic editorial typography, sage and charcoal surfaces, photographic project storytelling, sticky scroll chapters, rotating image stacks, horizontal galleries, and restrained interactive details.

The implementation will reproduce the reference's design principles and motion behavior without copying its text, proprietary source code, Framer branding, or photography. Candidate data, GitHub evidence, uploaded profile photo, existing GitHire assets, and generated project treatments remain the content source.

## Goals

- Preserve the existing Editorial, Developer, and Professional themes.
- Add a selectable `Maestro` theme to the portfolio editor and public renderer.
- Translate existing portfolio fields into a complete long-form visual story.
- Recreate the defining motion choreography with the installed `framer-motion` version.
- Keep public-data boundaries, draft/publish behavior, project limits, and verified-skill integrity unchanged.
- Provide usable responsive, reduced-motion, keyboard, and low-performance fallbacks.

## Non-goals

- Do not replace or redesign existing themes.
- Do not add a contact form, CV download, analytics, theme-specific backend storage, or new database columns.
- Do not change the main GitHire dashboard or marketing landing page.
- Do not add GSAP, Three.js, WebGL, Canvas, or another animation dependency.
- Do not download or redistribute assets from the reference site.

## Theme Contract

The canonical identifier is `maestro`, with the editor label `Maestro` and description `Sinematik, editorial, dan immersive`.

`maestro` is added to the frontend `PortfolioTheme` union and backend theme allow-list/schema literal. Existing records remain valid. Unknown or missing values continue to fall back to `professional`.

The default section order is:

1. Projects
2. Experience
3. Skills
4. Education
5. Certifications

Hidden sections remain hidden. Empty sections do not render placeholder shells.

## Content Mapping

### Navigation

- Brand: candidate name or `GitHire Portfolio` fallback.
- Anchors: Work, About, Proof, Background, Contact.
- Primary CTA: first enabled contact link, or GitHub when available.

### Hero

- Display: candidate headline, falling back to name and then a deterministic developer headline.
- Supporting copy: candidate bio.
- Background: profile photo when appropriate, otherwise an original atmospheric CSS composition using project colors and neutral gradients.
- Project strip: up to four selected projects, reusing available project metadata and theme-owned abstract artwork.

### Project Chapters

- Up to five selected projects become numbered `001` through `005` scroll chapters.
- Each chapter shows repository name, description, technology stack, stars, commit count, and repository link.
- Fewer than five projects produce only the available chapters; no fabricated repositories are added.

### About

- Candidate photo or initials fallback.
- Bio, headline, and enabled contacts.
- First meaningful experience entry may appear as a supporting credential.

### Gallery

- Selected projects appear as a horizontal gallery on wide screens.
- On touch and narrow screens it becomes native horizontal scroll with snap points.
- Keyboard users can focus every project link without drag interaction.

### Proof and Background

- Verified skills render separately under the exact label `Verified from GitHub`.
- Verification badges and evidence remain system-derived and cannot be authored by theme code.
- Non-verified skills, experience, education, and certifications use the existing public allow-listed content.

### Contact and Footer

- Contact uses only enabled opt-in links supplied by the public portfolio payload.
- No message form is introduced.
- Footer includes candidate identity, local section navigation, enabled contact links, and `Created with GitHire`.

## Visual Design DNA

### Color

- Background ivory: `#F2F4D9`
- Main sage surface: `#DFE5D7`
- Atmospheric sage: `#B1C6C0`
- Muted accent: `#829791`
- Charcoal surface: `#2F362B`
- Primary foreground: `#151B13`

The theme alternates high-contrast ivory-on-charcoal stages with dark-on-sage editorial sections. GitHire violet is reserved for a quiet product attribution or focus treatment and does not replace the theme palette.

### Typography

- Display: serif or italic serif using locally available/project-safe font loading with a `Georgia, serif` fallback.
- Body: existing sans-serif font stack.
- Display scale: `clamp(4rem, 9vw, 9rem)` with approximately `0.82` line height.
- Body copy remains at least 16px on primary reading surfaces.

No reference-site font files are copied. If the exact family is not already legally available in the project, a compatible locally hosted or platform-safe substitute is used.

### Shape and Composition

- Large section transitions use approximately 28-32px radius on desktop and smaller radii on mobile.
- Primary controls use pill shapes.
- Depth comes from overlap, scale, and soft photographic shadows rather than dashboard-card chrome.
- Layout uses a twelve-column maximum-width system with deliberate asymmetric image placement.

## Motion Choreography

All motion uses `framer-motion` v11.9.0 and CSS. Shared deterministic values live in a config/helper module so tests can cover them without rendering the full page.

### Initial Entrance

- Navigation fades and moves down by a small amount.
- Hero display reveals by word or line through a clipped container.
- Hero supporting copy follows after the display.
- Hero backdrop starts slightly enlarged and settles to scale `1`.
- Project-strip images enter with staggered vertical offsets.

### Scroll Chapters

- A multi-viewport wrapper drives a sticky viewport-stage.
- Scroll progress maps to the active project index.
- The current counter changes from `001` upward.
- Incoming content fades, translates, and sharpens while outgoing content fades and moves away.
- Project imagery changes scale, rotation, position, and z-index at deterministic thresholds.
- Progress is clamped so rapid scroll cannot expose an empty stage.

### Dark Stack Stage

- Oversized italic background text transitions from muted to high-contrast ivory.
- Project or capability cards enter as a centered stack.
- Cards rotate and translate outward according to scroll progress.
- One card remains visually dominant at a time.

### Gallery and Secondary Entrances

- Gallery items reveal with clipping and slight scale changes.
- Project images use subtle parallax on devices that support it.
- Experience, skills, education, and certification groups use one-shot viewport entrances.
- Buttons and featured cards use restrained pointer tilt or magnetic translation.

### Reduced Motion

When `prefers-reduced-motion: reduce` is active:

- Sticky progress stages become normal document-flow sections.
- Split text renders immediately.
- Parallax, magnetic movement, tilt, rotation, and scrubbed transforms are disabled.
- Content order and links remain identical.
- Short opacity transitions may remain only when they do not delay access to content.

## Responsive Behavior

### Desktop

- Full sticky chapters, layered card stack, wide project strip, and horizontal gallery presentation.

### Tablet

- Sticky storytelling remains but uses smaller movement ranges and reduced overlap.
- Navigation can collapse to the most important anchors plus CTA.

### Mobile

- Hero becomes normal-height rather than forcing an oversized viewport.
- Project strip and gallery use native scroll snap.
- Sticky chapters become sequential project cards when viewport height or width is insufficient.
- Decorative overlap never obscures text or interactive controls.

## Accessibility

- Keep semantic landmarks and heading order.
- All project cards are real links with visible focus treatment.
- Navigation anchors have descriptive accessible names.
- Decorative images use empty alt text; candidate photo uses the existing localized candidate-photo alt pattern.
- Text/background combinations must meet WCAG AA for normal text.
- Motion is never required to reveal or understand content.
- Touch targets are at least 44px where controls are introduced.

## Performance

- Do not introduce runtime animation dependencies.
- Use CSS gradients and existing/original assets instead of video or WebGL backgrounds.
- Lazy-load non-hero images.
- Animate transforms and opacity only during scrubbed sequences.
- Avoid per-frame React state updates; use motion values and transforms.
- Limit rendered project chapters to the existing six-project product cap.
- Disable nonessential pointer effects on coarse pointers and low-capability devices.

## Architecture

### Backend

- Extend the portfolio theme literal in `backend/app/schemas.py`.
- Extend `PORTFOLIO_THEMES` in `backend/app/services/portfolio.py`.
- No model or DDL change is required because theme is stored inside JSON content.
- Add allow-list and sanitization coverage in the existing portfolio backend tests.

### Frontend

- Extend `PortfolioTheme` in `linkify/src/components/portfolio/types.ts`.
- Add the theme metadata and miniature preview to `theme-preview-cards.tsx`.
- Register the theme and section order in `public-portfolio-theme.ts`.
- Add `maestro-portfolio-config.ts` for pure mappings, clamps, deterministic rotations, split-text helpers, and reduced-motion values.
- Add `maestro-portfolio.tsx` as the isolated public renderer.
- Route `maestro` from `public-portfolio.tsx` without changing existing theme components.

### Assets

- Prefer profile photo and existing public portfolio data.
- Add only original, project-owned visual assets when needed.
- Theme-owned abstract project treatments must be deterministic and contain no third-party trademarks or copied reference photography.

## Data Flow and Safety

1. Candidate selects `maestro` in the existing editor.
2. Theme is stored only in the local draft until the existing Save or Publish action runs.
3. Backend validates `maestro` using the extended allow-list.
4. Published payload continues through the existing strict public portfolio projection.
5. Public renderer selects `MaestroPortfolio` from the sanitized theme.

No private CV data, unpublished content, quiz data, raw PDF, disabled contact, or unselected repository is exposed. Publish/unpublish and reversible editor-removal behavior remain unchanged.

## Failure Handling

- Missing photo: render initials or the original atmospheric fallback.
- Missing project description: use the existing sanitized deterministic fallback.
- Zero projects: skip project-specific stages and emphasize about, experience, skills, and contact.
- One project: render one stable chapter rather than duplicating it.
- Invalid theme from legacy or malformed content: fall back to Professional.
- Reduced motion or unsupported sticky behavior: render sequential document-flow content.
- Broken external repository/contact URL: preserve current sanitization and safe-link behavior; do not synthesize replacement links.

## Verification

### Focused Tests

- Backend accepts and preserves `maestro`.
- Backend rejects or normalizes unknown themes according to current behavior.
- Theme plan returns the intended section order.
- Preview data uses candidate content and safe fallbacks.
- Project selection never exceeds the existing cap.
- Motion helper values are deterministic and clamped.
- Reduced-motion helpers return stable non-transforming values.
- Public renderer routes only `maestro` to `MaestroPortfolio`.
- Existing Editorial, Developer, and Professional theme tests continue to pass.

### Required Checks

- Portfolio-focused Node tests.
- Backend portfolio tests.
- `npx tsc --noEmit` or the local Windows `tsc.cmd` fallback.
- `pnpm build`.
- `python -m py_compile` for edited Python files.
- `git diff --check`.
- Browser verification at desktop and mobile widths.
- Screenshot inspection of hero, sticky chapters, dark stack, gallery, proof/background, and footer.
- Reduced-motion browser verification.

## Acceptance Criteria

- Maestro appears as a fourth selectable theme and does not replace existing themes.
- Selecting, saving, publishing, and reopening the theme preserves `maestro`.
- Public portfolio renders candidate content in the Maestro design language.
- Hero, staggered imagery, numbered sticky chapters, rotating stack, split-text reveals, gallery motion, hover feedback, and section entrances are present on capable desktop devices.
- Mobile and reduced-motion layouts expose all content without dependence on animation.
- Verified GitHub labels and evidence remain server-derived.
- Disabled sections and contacts remain absent from the public output.
- No copied reference copy, photography, source code, Framer attribution, or purchase UI appears.
- Existing themes, public URL behavior, draft/publish lifecycle, and safety tests remain green.
