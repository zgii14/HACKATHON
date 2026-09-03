# Portfolio Theme Preview Design

## Purpose

Candidates choose a public portfolio identity before publishing. The editor must make that choice visual and immediate: three small theme cards show the actual hierarchy each public renderer will use, then one click changes the selected theme.

The audience is an Indonesian developer candidate who needs confidence that a portfolio looks intentional before sharing the public link. The single job of the selector is to answer: **which presentation makes my work easiest to understand?**

## Scope

### Included

- Replace the text-only theme buttons in `/dashboard/portfolio` with three keyboard-accessible visual cards.
- Each card uses the candidate's live name, headline, first project, and experience when available, with short safe fallbacks otherwise.
- A click selects the theme in the unsaved editor state; it is persisted only through the existing Save draft, Publish, or Update public portfolio actions.
- Show a visible selected state and theme-specific explanatory copy.
- Reshape the public renderer so each theme differs in information hierarchy and layout, not merely colors.

### Excluded

- No modal, iframe, full-screen preview, new API, new database field, screenshot generation, or new animation dependency.
- No change to the public data contract, publishing permissions, or contact/privacy rules.

## Theme identities

| Theme | Candidate need | Palette | Layout thesis |
| --- | --- | --- | --- |
| Editorial | Tell a memorable story before listing credentials. | parchment `#F8F3EA`, ink `#1E1B18`, plum `#7C3AED`, clay `#B45309` | A generous headline and bio lead; work appears as annotated entries beneath an editorial rule. |
| Developer | Prove technical depth immediately. | charcoal `#0B1020`, panel `#121A2B`, mist `#CBD5E1`, electric violet `#A78BFA`, signal green `#34D399` | A compact terminal-style masthead leads into project modules, stack, and GitHub evidence. |
| Professional | Make experience and qualifications fast to scan. | porcelain `#F8FAFC`, navy `#132238`, cobalt `#2563EB`, slate `#64748B`, line `#D8E0EA` | A restrained profile summary and clear two-column chronology prioritize credibility and readability. |

All three use the existing application fonts and no remote font or new dependency. The visual distinction therefore comes from hierarchy, scale, rules, density, and the content that gets priority.

## Selector interaction

```text
Choose a presentation
Pick the structure that best explains your work. You can change it before publishing.

┌ Editorial ───────┐ ┌ Developer ───────┐ ┌ Professional ────┐
│ Monogram         │ │ ~/portfolio       │ │ RA               │
│ Large headline   │ │ Featured project  │ │ Role · company   │
│ Story line       │ │ Python · 42 commits│ │ Experience rows  │
│ Selected         │ │                   │ │                  │
└──────────────────┘ └───────────────────┘ └──────────────────┘
```

- Cards are semantic `button` elements in a responsive one- or three-column grid.
- Each card has a short title and purpose, a live mini canvas, then an explicit selected state using the locked GitHire violet token.
- Hover and keyboard focus only add a subtle lift/outline; `prefers-reduced-motion` receives no transform animation.
- The selected card uses `aria-pressed=true`; the mini canvas is decorative and does not duplicate interactive controls.
- Mobile cards retain enough height to show hierarchy without horizontal scrolling.

## Public renderer changes

- **Editorial:** narrow reading measure, name as a quiet byline, display-sized headline, projects as numbered-looking but unnumbered annotated entries. The layout is narrative, so hierarchy comes from story then work.
- **Developer:** code-like utility line, dense project grid, technology and contribution evidence close to each project. The layout prioritizes proof over biography.
- **Professional:** calm two-column desktop grid that places profile/contact context beside a chronological main column. Experience and education use date-led rows for rapid scanning.

Shared public behaviors remain unchanged: candidate-selected sections, only opt-in contacts, server-derived verified skills, responsive layout, noindex/nofollow, and the GitHire footer.

## Implementation boundaries

- Add a presentational `ThemePreviewCards` component under `linkify/src/components/portfolio/`.
- The editor owns `form.theme` and passes the current draft values plus an `onSelect` callback to the component.
- Keep public theme styles co-located in `public-portfolio.tsx` or extract a focused presentational helper only if it reduces duplication.
- Add a component-level test only if the existing frontend test setup supports it without introducing dependencies; otherwise use TypeScript and targeted lint/build verification.

## Acceptance criteria

- A candidate can distinguish all three themes from the selector without opening another view.
- Selecting a card changes `form.theme`; Save draft/Publish sends that existing field unchanged.
- The published page for each theme has visibly different hierarchy and layout at desktop and mobile widths.
- No public data, permissions, API response, or privacy behavior changes.
- `npx tsc --noEmit`, focused lint, and production build still pass with the usual local Clerk environment.
