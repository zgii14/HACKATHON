import assert from "node:assert/strict";
import test from "node:test";
import {
    contactHref,
    formatCount,
    getArcadeCopy,
    pickSkills,
    splitHeadline,
} from "../src/components/portfolio/arcade-portfolio-config.ts";

test("splits headline into at most three script segments", () => {
    assert.deepEqual(splitHeadline("Frontend × React × UI"), ["Frontend", "React", "UI"]);
    assert.deepEqual(splitHeadline("Backend | Python / Go"), ["Backend", "Python", "Go"]);
    assert.deepEqual(splitHeadline("Web x Mobile"), ["Web", "Mobile"]);
    assert.deepEqual(splitHeadline("A, B, C, D"), ["A", "B", "C"]);
    assert.deepEqual(splitHeadline("Full-stack developer"), ["Full-stack developer"]);
    assert.deepEqual(splitHeadline("  "), []);
    assert.deepEqual(splitHeadline("Next.js • Tailwind"), ["Next.js", "Tailwind"]);
});

test("does not split on x inside words", () => {
    assert.deepEqual(splitHeadline("Nginx expert"), ["Nginx expert"]);
});

test("separates verified skills from the rest without duplicates", () => {
    const verified = [{ skill: "React" }, { skill: "Python", level: "advanced" }];
    const result = pickSkills(["react", "Go", "PYTHON", "Docker"], verified);
    assert.deepEqual(result.verified.map((item) => item.skill), ["React", "Python"]);
    assert.deepEqual(result.others, ["Go", "Docker"]);
});

test("caps verified at 8 and others at 16", () => {
    const verified = Array.from({ length: 10 }, (_, i) => ({ skill: `V${i}` }));
    const skills = Array.from({ length: 20 }, (_, i) => `S${i}`);
    const result = pickSkills(skills, verified);
    assert.equal(result.verified.length, 8);
    assert.equal(result.others.length, 16);
});

test("formats counts compactly", () => {
    assert.equal(formatCount(undefined), "0");
    assert.equal(formatCount(-3), "0");
    assert.equal(formatCount(42), "42");
    assert.equal(formatCount(1234), "1.2k");
    assert.equal(formatCount(1000), "1k");
});

test("builds contact hrefs", () => {
    assert.equal(contactHref("email", "a@b.co"), "mailto:a@b.co");
    assert.equal(contactHref("whatsapp", "+62 812-3456"), "https://wa.me/628123456");
    assert.equal(contactHref("github", "github.com/me"), "https://github.com/me");
    assert.equal(contactHref("website", "https://me.dev"), "https://me.dev");
    assert.equal(contactHref("fax", "123"), null);
});

test("provides id and en copy with the verified label", () => {
    assert.equal(getArcadeCopy("id").verified, "Terverifikasi dari GitHub");
    assert.equal(getArcadeCopy("en").verified, "Verified from GitHub");
    assert.equal(getArcadeCopy("en").projects, "Projects");
});

test("builds a deterministic cover for each project", async () => {
    const { getProjectCover, hashString } = await import("../src/components/portfolio/arcade-portfolio-config.ts");
    assert.equal(hashString("abc"), hashString("abc"));
    assert.notEqual(hashString("abc"), hashString("abd"));
    const project = { repo_name: "laporan-keuangan", url: "", description: "", tech_stack: ["PHP", "Laravel"], stars: 0, own_commits: 3 };
    const a = getProjectCover(project);
    assert.deepEqual(a, getProjectCover(project));
    assert.equal(a.initials, "LK");
    assert.equal(a.cells.length, 40);
    assert.ok(a.cells.every((value) => value >= 0 && value <= 3));
    assert.ok(["pixels", "halftone", "scan", "rings"].includes(a.pattern));
    assert.ok(a.palette.from.startsWith("#") && a.palette.to.startsWith("#"));
});

test("derives cover initials from varied repo names", async () => {
    const { getProjectCover } = await import("../src/components/portfolio/arcade-portfolio-config.ts");
    const base = { url: "", description: "", tech_stack: [], stars: 0, own_commits: 0 };
    assert.equal(getProjectCover({ ...base, repo_name: "HACKATHON" }).initials, "HA");
    assert.equal(getProjectCover({ ...base, repo_name: "moodmate-app" }).initials, "MA");
    assert.equal(getProjectCover({ ...base, repo_name: "Penerapan_AI_Dicoding" }).initials, "PA");
    assert.equal(getProjectCover({ ...base, repo_name: "zgii14" }).initials, "ZG");
    assert.equal(getProjectCover({ ...base, repo_name: "workflowCI" }).initials, "WC");
    assert.equal(getProjectCover({ ...base, repo_name: "" }).initials, "GH");
});
