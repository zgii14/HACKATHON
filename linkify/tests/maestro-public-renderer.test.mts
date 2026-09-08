import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const renderer = readFileSync(
    new URL("../src/components/portfolio/maestro-portfolio.tsx", import.meta.url),
    "utf8",
);
const router = readFileSync(
    new URL("../src/components/portfolio/public-portfolio.tsx", import.meta.url),
    "utf8",
);

test("builds the complete Maestro public story", () => {
    assert.match(renderer, /export function MaestroPortfolio/);
    assert.match(renderer, /useScroll/);
    assert.match(renderer, /useTransform/);
    assert.match(renderer, /useReducedMotion/);
    for (const id of ["work", "about", "proof", "background", "contact"]) {
        assert.match(renderer, new RegExp(`id=["']${id}["']`));
    }
    assert.match(renderer, /Verified from GitHub/);
    assert.match(renderer, /portfolios\/\$\{portfolio\.public_id\}\/photo/);
});

test("provides reduced-motion and responsive fallbacks", () => {
    assert.match(renderer, /motion-reduce:/);
    assert.match(renderer, /overflow-x-auto/);
    assert.match(renderer, /snap-x/);
    assert.match(renderer, /reduceMotion/);
});

test("keeps the tall sticky timeline out of mobile document flow", () => {
    assert.match(renderer, /<div id="work"[\s\S]*lg:hidden[\s\S]*hidden min-h-screen[\s\S]*lg:block/);
    assert.doesNotMatch(renderer, /<section ref=\{sectionRef\} id="work"/);
});

test("routes only the Maestro theme to the isolated renderer", () => {
    assert.match(router, /import \{ MaestroPortfolio \} from "\.\/maestro-portfolio"/);
    assert.match(router, /theme === "maestro"/);
    assert.match(router, /<MaestroPortfolio/);
});
