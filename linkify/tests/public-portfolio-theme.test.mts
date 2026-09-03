import assert from "node:assert/strict";
import test from "node:test";
import { getPublicThemePlan } from "../src/components/portfolio/public-portfolio-theme.ts";

test("uses Professional chronology as the safe fallback presentation", () => {
    assert.deepEqual(getPublicThemePlan(undefined), {
        key: "professional",
        label: "Professional profile",
        sectionOrder: ["experience", "education", "projects", "skills", "certifications"],
    });
});

test("uses Professional when an unsupported theme reaches the public renderer", () => {
    assert.equal(getPublicThemePlan("retro" as never).key, "professional");
});

test("prioritizes proof of work before narrative for the Developer presentation", () => {
    assert.deepEqual(getPublicThemePlan("developer"), {
        key: "developer",
        label: "Developer portfolio",
        sectionOrder: ["projects", "skills", "experience", "education", "certifications"],
    });
});
