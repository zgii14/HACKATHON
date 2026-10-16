import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const dir = new URL("../src/components/portfolio/", import.meta.url);
const read = (name: string) => readFileSync(new URL(name, dir), "utf8");
const renderer = read("fold-portfolio.tsx");
const device = read("fold-device.tsx");
const scenes = read("fold-scenes.tsx");
const router = read("public-portfolio.tsx");
const all = renderer + device + scenes;

test("builds the Fold public page", () => {
    for (const source of [renderer, device, scenes]) assert.match(source, /^"use client";/);
    assert.match(renderer, /export function FoldPortfolio/);
    assert.match(renderer, /lang=\{content\.language\}/);
    assert.match(all, /portfolios\/\$\{portfolio\.public_id\}\/photo/);
    assert.match(all, /copy\.verified/);
    assert.match(all, /copy\.githubVerified/);
    assert.match(renderer, /GitHire/);
});

test("loads the reference fonts only inside the Fold renderer", () => {
    assert.match(renderer, /Sofia_Sans_Extra_Condensed/);
    assert.match(renderer, /from "geist\/font\/sans"/);
    assert.match(renderer, /from "geist\/font\/mono"/);
    for (const file of readdirSync(dir)) {
        if (file === "fold-portfolio.tsx" || !/\.tsx?$/.test(file)) continue;
        assert.doesNotMatch(read(file), /geist\/font|Sofia_Sans_Extra_Condensed/, file);
    }
});

test("drives the device from page scroll and reads client-only values after mount", () => {
    assert.match(device, /useScroll\(/);
    assert.match(device, /useTransform\(/);
    assert.match(device, /layoutId="fold-dock-active"/);
    // Mobile juga tampil sebagai HP (keputusan user), bukan section mengalir.
    assert.match(device, /export function FoldPhone/);
    assert.match(renderer, /<FoldPhone/);
    assert.match(renderer, /useEffect\([\s\S]*?localStorage\.getItem\(FOLD_PREFS_KEY\)/);
    // Desktop vs mobile dipilih CSS, bukan JS, supaya SSR dan hidrasi selalu sama.
    assert.match(renderer, /hidden md:block/);
    assert.match(renderer, /md:hidden/);
    assert.doesNotMatch(all, /matchMedia/);
    assert.match(scenes, /formatClock/);
});

test("respects section toggles through the shared helper", () => {
    assert.match(all, /buildScreens\(portfolio\)/);
    assert.match(all, /isSectionOn/);
});

test("routes only the Fold theme to the Fold renderer", () => {
    assert.match(router, /import \{ FoldPortfolio \} from "\.\/fold-portfolio"/);
    assert.match(router, /theme === "fold"/);
    assert.match(router, /<FoldPortfolio/);
});

test("answers the call by sliding and then lists every contact", () => {
    assert.match(scenes, /callContacts\(contacts\)/);
    assert.match(scenes, /copy\.connected/);
    assert.match(scenes, /copy\.endCall/);
    // Batas geser angka dari ResizeObserver: ref constraints membuat knob pindah ke tengah setelah resize
    // ketika salinan layar yang tersembunyi (display:none) berukuran 0.
    assert.doesNotMatch(scenes, /dragConstraints=\{trackRef\}/);
    assert.match(scenes, /new ResizeObserver/);
    assert.match(scenes, /dragConstraints=\{\{ left: 0, right: max \}\}/);
});
