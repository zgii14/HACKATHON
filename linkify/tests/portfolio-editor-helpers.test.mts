import assert from "node:assert/strict";
import test from "node:test";
import {
    appendRepositoriesToProjects,
    createEmptyEducation,
    createEmptyExperience,
    getEligibleRepositories,
    getProjectSlots,
    toPortfolioProject,
} from "../src/components/portfolio/portfolio-editor-helpers.ts";

const repository = (name: string, languages?: Record<string, number>) => ({
    name,
    html_url: `https://github.com/example/${name}`,
    languages,
});

test("filters repositories already attached to projects", () => {
    assert.deepEqual(getEligibleRepositories([repository("one"), repository("two")], [
        { repo_name: "one", url: "", description: "", tech_stack: [], stars: 0, own_commits: 0 },
    ]).map((item) => item.name), ["two"]);
});

test("project capacity never becomes negative", () => {
    assert.equal(getProjectSlots([]), 6);
    assert.equal(getProjectSlots(Array(6).fill({})), 0);
    assert.equal(getProjectSlots(Array(8).fill({})), 0);
});

test("maps repository data and exact description fallbacks", () => {
    assert.deepEqual(toPortfolioProject({ ...repository("alpha", { TypeScript: 1, Python: 2 }), stars: 3, own_commits: 4 }), {
        repo_name: "alpha", url: "https://github.com/example/alpha", tech_stack: ["TypeScript", "Python"], stars: 3, own_commits: 4,
        description: "Proyek GitHub yang dibangun dengan TypeScript dan Python.",
    });
    assert.equal(toPortfolioProject(repository("empty")).description, "Proyek GitHub yang dapat dieksplorasi melalui repository ini.");
});

test("ignores duplicates and caps appended projects at six", () => {
    const existing = Array.from({ length: 5 }, (_, i) => ({ repo_name: `existing-${i}`, url: "", description: "", tech_stack: [], stars: 0, own_commits: 0 }));
    const result = appendRepositoriesToProjects(existing, [repository("existing-0"), repository("new"), repository("new"), repository("another")]);
    assert.deepEqual(result.map((project) => project.repo_name), [...existing.map((project) => project.repo_name), "new"]);
});

test("factories return blank editable fields", () => {
    assert.deepEqual(createEmptyExperience(), { role: "", company: "", period: "" });
    assert.deepEqual(createEmptyEducation(), { institution: "", degree: "", major: "", period: "" });
});
