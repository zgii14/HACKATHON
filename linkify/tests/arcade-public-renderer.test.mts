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
