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

test("uses generated project covers and the arcade motion kit", () => {
    const motionKit = readFileSync(new URL("../src/components/portfolio/arcade-motion.tsx", import.meta.url), "utf8");
    const cover = readFileSync(new URL("../src/components/portfolio/arcade-cover.tsx", import.meta.url), "utf8");
    for (const name of ["ProjectCover", "TiltCard", "GlitchName", "CrtBoot", "XpBar", "Unlock", "CountUp", "DrawWave"]) {
        assert.match(renderer, new RegExp(`<${name}`));
    }
    assert.match(cover, /getProjectCover/);
    // Setiap primitif harus punya jalur reduced-motion.
    for (const name of ["CrtBoot", "Shimmer", "GlitchName", "PopText", "TiltCard", "Unlock"]) {
        assert.match(motionKit, new RegExp(String.raw`export function ${name}[\s\S]*?if \(reduceMotion\)`));
    }
});
