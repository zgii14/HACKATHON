import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/components/portfolio/theme-preview-cards.tsx", import.meta.url), "utf8");

test("registers the Arcade selector and preview", () => {
    assert.match(source, /arcade:\s*\{\s*label:\s*"Arcade"/);
    assert.match(source, /Retro hologram ala game/);
    assert.match(source, /function ArcadePreview/);
    assert.match(source, /theme === "arcade"/);
    assert.match(source, /arcade: Gamepad2/);
});
