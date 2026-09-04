# Portfolio editor destructive actions

## Goal

Keep ordinary portfolio editing fast while preventing irreversible actions from being accidental.

## Decisions

- Removing a GitHub project, experience entry, or education entry updates only the local editor draft and immediately shows a five-second success toast with an **Urungkan** action. Undo restores the exact removed item at its original index. A second removal replaces the prior undo opportunity.
- Removing a saved photo opens the existing destructive confirmation dialog. The request is made only after confirmation.
- Unpublishing opens the destructive confirmation dialog because it immediately hides the public portfolio. The request is made only after confirmation.
- No API, database, public portfolio, or save/publish contract changes are required.

## Validation

- Pure helpers cover index-preserving removal/restoration and undo availability.
- Existing focused portfolio helper tests and TypeScript checking must pass.
