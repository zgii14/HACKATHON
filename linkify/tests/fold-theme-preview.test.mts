import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../src/components/portfolio/theme-preview-cards.tsx", import.meta.url), "utf8");

test("registers the Fold selector and preview", () => {
    assert.match(source, /fold:\s*\{\s*label:\s*"Fold"/);
    assert.match(source, /HP lipat, huruf raksasa/);
    assert.match(source, /function FoldPreview/);
    assert.match(source, /theme === "fold"/);
    assert.match(source, /fold: Smartphone/);
});
