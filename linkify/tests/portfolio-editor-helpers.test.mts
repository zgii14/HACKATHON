import assert from "node:assert/strict";
import test from "node:test";
import {
    appendRepositoriesToProjects,
    canRestoreProject,
    createOneShotUndo,
    createEmptyEducation,
    createEmptyExperience,
    getEligibleRepositories,
    getPhotoUploadCopy,
    getProjectSlots,
    removeAt,
    restoreAt,
    transitionDraftRemoval,
    toPortfolioProject,
} from "../src/components/portfolio/portfolio-editor-helpers.ts";
import type { PortfolioContent } from "../src/components/portfolio/types.ts";

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

test("photo upload copy distinguishes an uploaded draft from an empty picker", () => {
    assert.deepEqual(getPhotoUploadCopy(false), {
        label: "Foto opsional",
        help: "JPG, PNG, atau WEBP · maksimal 2 MB.",
    });
    assert.deepEqual(getPhotoUploadCopy(true), {
        label: "Ganti foto",
        help: "Foto tersimpan di draft. Pilih file baru untuk mengganti.",
    });
});

test("removes and restores an entry at its original position without mutation", () => {
    const original = ["first", "second", "third"];
    const removed = removeAt(original, 1);

    assert.deepEqual(removed, { items: ["first", "third"], removed: "second", index: 1 });
    assert.deepEqual(original, ["first", "second", "third"]);
    assert.deepEqual(restoreAt(removed!.items, removed!.removed, removed!.index), original);
    assert.deepEqual(restoreAt(["a", "b"], "x", -1), ["x", "a", "b"]);
    assert.deepEqual(restoreAt(["a", "b"], "x", 99), ["a", "b", "x"]);
});

test("returns null when removing an entry at an invalid index", () => {
    assert.equal(removeAt(["only"], -1), null);
    assert.equal(removeAt(["only"], 1), null);
    assert.equal(removeAt(["only", "two"], 1.5), null);
});

test("applies consecutive removals against the latest complete draft", () => {
    const project = (repo_name: string) => ({ repo_name, url: "", description: "", tech_stack: [], stars: 0, own_commits: 0 });
    const draft: PortfolioContent = {
        name: "Ada", headline: "Engineer", bio: "Unrelated field", language: "id", theme: "developer",
        projects: [project("first"), project("second"), project("third")], skills: ["TypeScript"],
        experience: [{ company: "GitHire" }], education: [{ institution: "University" }], certifications: ["AWS"],
        contacts: {
            github: { value: "ada", enabled: true }, linkedin: { value: "", enabled: false }, email: { value: "ada@example.com", enabled: true },
            whatsapp: { value: "", enabled: false }, website: { value: "", enabled: false },
        },
        sections: { projects: true, skills: true, experience: true, education: true, certifications: true },
    };
    const first = transitionDraftRemoval(draft, "projects", 0);
    const second = transitionDraftRemoval(first!.draft, "projects", 1);

    assert.deepEqual(second!.draft.projects.map((project) => project.repo_name), ["second"]);
    assert.equal(second!.draft.projects.some((project) => project.repo_name === "first"), false);
    assert.equal(second!.draft.projects.some((project) => project.repo_name === "third"), false);
    assert.equal(second!.draft.name, "Ada");
    assert.deepEqual(second!.draft.skills, ["TypeScript"]);
    assert.deepEqual(second!.draft.experience, [{ company: "GitHire" }]);
});

test("allows an undo action to run only once", () => {
    const claimUndo = createOneShotUndo();
    assert.equal(claimUndo(), true);
    assert.equal(claimUndo(), false);
});

test("project undo respects its original duplicate count and the six-project cap", () => {
    const removed = { repo_name: "duplicate", url: "", description: "", tech_stack: [], stars: 0, own_commits: 0 };
    const distinct = (name: string) => ({ ...removed, repo_name: name });

    assert.equal(canRestoreProject([removed], removed, 2), true);
    assert.equal(canRestoreProject([removed, removed], removed, 2), false);
    assert.equal(canRestoreProject([distinct("one"), distinct("two"), distinct("three"), distinct("four"), distinct("five"), distinct("six")], removed, 1), false);
});
