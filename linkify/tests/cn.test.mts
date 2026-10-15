import assert from "node:assert/strict";
import test from "node:test";
import { cn } from "../src/utils/functions/cn.ts";

test("custom font-size tokens survive alongside text colors", () => {
    for (const size of ["text-micro", "text-meta", "text-body", "text-read"]) {
        assert.equal(cn(size, "text-primary"), `${size} text-primary`);
    }
});

test("custom font-size tokens still conflict with each other", () => {
    assert.equal(cn("text-meta", "text-body"), "text-body");
    assert.equal(cn("text-sm", "text-meta"), "text-meta");
});
