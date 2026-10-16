# Fold Portfolio Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambah tema portfolio publik ke-6 `fold` (HP lipat yang membuka jadi tablet saat scroll), sesuai spec `docs/superpowers/specs/2026-10-16-fold-portfolio-theme-design.md`.

**Architecture:** Helper murni di `fold-portfolio-config.ts` (teruji node:test). Komponen client dibagi tiga: `fold-portfolio.tsx` (akar: font, panggung, toggle, pilih layout), `fold-device.tsx` (frame sticky + engsel + progres scroll + dock), `fold-scenes.tsx` (isi tiap layar, dipakai juga oleh layout mobile). Desktop: kontainer setinggi `(screens + 1) × 100vh`, device `sticky top-0`, `useScroll` → strip layar `translateY`. Mobile: layar kunci layar penuh dilipat keluar, sisanya section biasa.

**Tech Stack:** Next.js 14, TypeScript, Tailwind v3, framer-motion 11, lucide-react, `next/font/google` (Sofia Sans Extra Condensed), paket `geist` (Geist + Geist Mono).

## Global Constraints

- Key `fold`, label "Fold", detail kartu "HP lipat, huruf raksasa".
- Hanya data asli dari props; semua label id + en; `<main lang={content.language}>`.
- Section tampil hanya bila `content.sections?.[key] !== false` dan datanya tidak kosong.
- Reduced-motion TIDAK dihormati (keputusan user); motion hanya transform/opacity.
- Nilai yang beda server/client (jam, localStorage, lebar layar) dibaca setelah mount.
- Font hanya diimpor di file tema. Dependency baru hanya `geist`.
- Responsif 375–1440 tanpa scroll horizontal; layar pertama 1280×800 menarik.
- Jangan jalankan `pnpm build` saat dev server hidup. Commit per task. Jangan push.

---

### Task 1: Registrasi tema `fold` + dependency geist

**Files:**
- Modify: `linkify/src/components/portfolio/types.ts` (union `PortfolioTheme`)
- Modify: `backend/app/services/portfolio.py:6`, `backend/app/schemas.py:184`
- Modify: `linkify/src/components/portfolio/public-portfolio-theme.ts` (entri `fold`)
- Modify: `linkify/src/components/portfolio/public-portfolio-page.tsx:7,42`
- Modify: `linkify/package.json` (`geist`)
- Test: `backend/test_portfolio.py`, `linkify/tests/public-portfolio-theme.test.mts`

- [ ] Step 1: Test gagal dulu. Backend:

```python
    def test_patch_accepts_fold_theme(self):
        patch = PortfolioPatch(theme="fold")
        self.assertEqual(patch.theme, "fold")

    def test_public_view_preserves_fold_theme(self):
        # salin pola test_public_view_preserves_arcade_theme dengan "fold"
```

Frontend:

```ts
test("uses scene ordering for Fold", () => {
    assert.deepEqual(getPublicThemePlan("fold"), {
        key: "fold",
        label: "Fold portfolio",
        sectionOrder: ["projects", "skills", "experience", "education", "certifications"],
    });
});
```

- [ ] Step 2: Jalankan → FAIL (`python -m unittest test_portfolio`, `node --test tests/public-portfolio-theme.test.mts`).
- [ ] Step 3: Tambah `"fold"` ke union, `PORTFOLIO_THEMES`, `Literal`, `themePlans.fold`, `THEMES`, dan daftar chip `["editorial", "arcade", "fold"]`. `pnpm add geist`.
- [ ] Step 4: Test → PASS. (tsc akan gagal di `themeMeta`/`themeIcons` sampai Task 4; itu diterima sementara, cabang router di Task 3.)
- [ ] Step 5: Commit `feat(portfolio): register fold theme`.

### Task 2: Helper config Fold (TDD)

**Files:**
- Create: `linkify/src/components/portfolio/fold-portfolio-config.ts`
- Test: `linkify/tests/fold-portfolio.test.mts`

**Produces:**
- `getFoldCopy(lang): FoldCopy`
- `isSectionOn(content, key): boolean` (memakai `content.sections?.[key] !== false`)
- `FOLD_BLOCKS: string[]`, `pickBlockColor(repo): { bg: string; ink: string }`, `readableInk(hex): "#111111" | "#ffffff"`
- `buildFoldStats(portfolio, copy): Array<{ value: number; label: string }>`
- `pickNotifications(projects, max = 2): PortfolioProject[]`, `notificationMeta(project, copy): string`
- `primaryContact(contacts): { kind: string; value: string; href: string } | null` (urutan email > whatsapp > linkedin > website > github; href via `contactHref` Arcade)
- `buildScreens(portfolio): FoldScreen[]` dengan `FoldScreen = { id: "hero" | "stats" | "work" | "skills" | "experience" | "education" | "certifications" | "call"; nav?: "home" | "work" | "skills" | "about" | "contact" } | { id: "project"; index: number }`
- `formatClock(date): "HH:MM"`, `initials(name): string`, `firstSentences(text, max = 2): string`
- `FOLD_BEZELS`, `FOLD_BACKDROPS`, `parseFoldPrefs(raw: string | null): { backdrop: FoldBackdrop; bezel: FoldBezel }`

- [ ] Step 1: Tulis test untuk tiap helper: palet stabil per repo dan ink kontras (#e9c94a → #111111, #2f5bd3 → #ffffff); stats membuang 0 dan menghormati toggle; notifikasi urut commit, maksimal 2; meta tanpa bintang 0; primaryContact urutan + null; buildScreens dengan 0 proyek / section mati / data kosong; formatClock zero-pad; initials ("Muhammad Rozagi" → "MR", "" → "GH"); firstSentences; parseFoldPrefs dengan JSON rusak, nilai asing, null.
- [ ] Step 2: `node --test tests/fold-portfolio.test.mts` → FAIL (modul belum ada).
- [ ] Step 3: Implementasi minimal.
- [ ] Step 4: Test → PASS.
- [ ] Step 5: Commit `feat(portfolio): fold theme helpers`.

### Task 3: Komponen Fold (device, adegan, toggle) + router

**Files:**
- Create: `linkify/src/components/portfolio/fold-scenes.tsx`, `fold-device.tsx`, `fold-portfolio.tsx`
- Modify: `linkify/src/components/portfolio/public-portfolio.tsx` (import + cabang `theme === "fold"`)
- Test: `linkify/tests/fold-public-renderer.test.mts`

- [ ] Step 1: Test renderer (baca source sebagai teks): `"use client"`, `export function FoldPortfolio`, `Sofia_Sans_Extra_Condensed`, `geist/font/sans`, `geist/font/mono`, path foto `portfolios/${portfolio.public_id}/photo`, `copy.verified`, `lang={content.language}`, `isSectionOn`, `useScroll`, `localStorage` dibaca di `useEffect`, router `theme === "fold"` + `<FoldPortfolio`, dan font tidak diimpor di file lain selain `fold-portfolio.tsx`.
- [ ] Step 2: Jalankan → FAIL.
- [ ] Step 3: `fold-scenes.tsx`: `LockScreen`, `HeroScreen`, `StatsScreen`, `WorkIntroScreen`, `ProjectScreen`, `SkillsScreen`, `ListScreen` (experience/education/certifications), `CallScreen`, `ProjectTile` (cover generatif blok warna + inisial). Setiap layar mengisi induk (`h-full` di desktop, tinggi alami di mobile lewat prop `flow`). Entrance memakai variants satu akar + `staggerChildren`.
- [ ] Step 4: `fold-device.tsx`: `FoldStage` desktop — kontainer `height: (screens.length + 1) * 100vh`, `useScroll({ target })`, segmen 0 = unfold (panel kunci `rotateY` 0 → -180 dari engsel kiri tengah, lebar device 380 → min(1040, 92vw), tinggi 520 → min(640, 100vh - 170)), segmen berikut strip `translateY`, segmen terakhir lebar menyusut ke persegi. Dock pil dengan `layoutId="fold-dock-active"`, klik → `window.scrollTo`.
- [ ] Step 5: `fold-portfolio.tsx`: font, panggung + nama raksasa, header, toggle latar (Basic/Glow/Orbit) + titik bezel, prefs via `localStorage` di `useEffect`, `matchMedia("(min-width: 768px)")` setelah mount (sebelum mount render desktop agar SSR = iframe 1280), layout mobile, footer kredit GitHire.
- [ ] Step 6: Cabang router. Test → PASS. `npx tsc --noEmit` hanya boleh gagal di theme-preview (Task 4).
- [ ] Step 7: Commit `feat(portfolio): fold theme renderer`.

### Task 4: Kartu preview editor

**Files:**
- Modify: `linkify/src/components/portfolio/theme-preview-cards.tsx`
- Test: `linkify/tests/fold-theme-preview.test.mts`

- [ ] Step 1: Test:

```ts
test("registers the Fold selector and preview", () => {
    assert.match(source, /fold:\s*\{\s*label:\s*"Fold"/);
    assert.match(source, /HP lipat, huruf raksasa/);
    assert.match(source, /function FoldPreview/);
    assert.match(source, /theme === "fold"/);
    assert.match(source, /fold: Smartphone/);
});
```

- [ ] Step 2: FAIL. Step 3: `themeMeta.fold`, `FoldPreview` (h-28, latar #f5f4f2, nama condensed besar, HP mini dengan jam + notifikasi `projectName`), cabang, ikon. Step 4: PASS + `npx tsc --noEmit` bersih. Step 5: Commit `feat(portfolio): fold theme preview card`.

### Task 5: Verifikasi penuh

- [ ] `npx tsc --noEmit`, `pnpm lint`, `node --test tests/*.test.mts`, backend `python -m unittest discover -p "test_*.py"`.
- [ ] Browser `linkify-prod-api`: `/p/kBvAyQPhGD?theme=fold` dan `&embed=1` di 1280×800, 768, 375; scroll seluruh adegan; console tanpa error/hydration; tanpa scroll horizontal (`document.documentElement.scrollWidth <= innerWidth`); toggle latar + bezel tersimpan setelah reload.
- [ ] Matikan dev server, `pnpm build`.
- [ ] Commit perbaikan bila ada.

### Task 6: Poster, dokumen, Obsidian

- [ ] Chrome headless 1280×800 `--virtual-time-budget=4000 --hide-scrollbars --screenshot` ke `/p/kBvAyQPhGD?theme=fold&embed=1` (server produksi lokal `pnpm start` atau dev), konversi WebP ≤ 80 KB via Pillow → `linkify/public/landing/portfolio-fold.webp`.
- [ ] Tambah `{ key: "fold", label: "Fold" }` di `landing-v2/portfolio-stage.tsx`, `"fold"` di `POSTERS` `auth/auth-backdrop.tsx`.
- [ ] Tambah `fold` ke daftar key terpakai di `docs/prompts/portfolio-theme-prompt.md`.
- [ ] Commit `feat(landing): fold poster`.
- [ ] Update Obsidian `projects/githire.md` (+ pattern baru bila ada jebakan reusable) dan `index.md`.
