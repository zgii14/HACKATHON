import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
    new URL("../src/components/portfolio/theme-preview-cards.tsx", import.meta.url),
    "utf8",
);

test("registers the Maestro selector and candidate-driven preview", () => {
    assert.match(source, /maestro:\s*\{\s*label:\s*"Maestro"/);
    assert.match(source, /function MaestroPreview/);
    assert.match(source, /theme === "maestro"/);
    assert.match(source, /Sinematik, editorial, dan immersive/);
});
