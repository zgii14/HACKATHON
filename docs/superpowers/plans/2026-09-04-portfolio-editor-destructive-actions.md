# Portfolio Editor Destructive Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make low-risk portfolio item removals undoable while confirming photo removal and unpublishing.

**Architecture:** Add pure index-preserving collection helpers for local editor removal and restoration. `PortfolioEditor` uses one toast undo action for projects, experience, and education; existing `confirmDestructive` gates only photo deletion and unpublish network actions.

**Tech Stack:** Next.js/React, TypeScript, React Toastify, SweetAlert2, Node test runner.

---

### Task 1: Test and implement local removal helpers

**Files:**
- Modify: `linkify/src/components/portfolio/portfolio-editor-helpers.ts`
- Modify: `linkify/tests/portfolio-editor-helpers.test.mts`

- [ ] **Step 1: Write the failing test**

```ts
test("removes an item and restores it at its original index", () => {
    const removed = removeAt(["one", "two", "three"], 1);
    assert.deepEqual(removed, { items: ["one", "three"], removed: "two", index: 1 });
    assert.deepEqual(restoreAt(removed.items, removed.removed, removed.index), ["one", "two", "three"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/portfolio-editor-helpers.test.mts`

Expected: fail because `removeAt` and `restoreAt` are not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
export function removeAt<T>(items: T[], index: number) {
    return { items: items.filter((_, itemIndex) => itemIndex !== index), removed: items[index], index };
}

export function restoreAt<T>(items: T[], item: T, index: number) {
    return [...items.slice(0, index), item, ...items.slice(index)];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/portfolio-editor-helpers.test.mts`

Expected: all tests pass.

### Task 2: Wire undo and destructive confirmations into the editor

**Files:**
- Modify: `linkify/src/components/portfolio/portfolio-editor.tsx`

- [ ] **Step 1: Add an undo-toast callback**

Use `toast.success` with a small `Urungkan` button. Its click callback restores the preserved item with `restoreAt`, closes the toast, and does not send a request.

- [ ] **Step 2: Replace local item removals**

Use `removeAt` for projects, experience, and education. Update the draft immediately, then show one five-second undo toast. The undo closure retains the removed item and original array index.

- [ ] **Step 3: Gate high-impact actions**

Add `confirmDestructive` before `removePhoto` runs its DELETE request and before `unpublish` runs its POST request. Use titles `Hapus foto dari draft?` and `Sembunyikan portfolio publik?`; cancellation performs no request.

- [ ] **Step 4: Verify TypeScript and focused tests**

Run: `node tests/portfolio-editor-helpers.test.mts; .\\node_modules\\.bin\\tsc.cmd --noEmit; git diff --check`

Expected: all tests pass, TypeScript exits 0, and no whitespace errors.

- [ ] **Step 5: Commit and push**

```powershell
git add docs/superpowers/specs/2026-09-04-portfolio-editor-destructive-actions-design.md docs/superpowers/plans/2026-09-04-portfolio-editor-destructive-actions.md linkify/src/components/portfolio/portfolio-editor.tsx linkify/src/components/portfolio/portfolio-editor-helpers.ts linkify/tests/portfolio-editor-helpers.test.mts
git commit -m "feat: add safe portfolio editor removals"
git push origin master
```
