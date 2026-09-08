import assert from "node:assert/strict";
import test from "node:test";
import {
    MAESTRO_PROJECT_TITLE_WRAP,
    getMaestroCardTransform,
    getMaestroChapterProgress,
    getMaestroMetaItems,
    getMaestroProjectPalette,
    getMaestroProjects,
    splitMaestroWords,
} from "../src/components/portfolio/maestro-portfolio-config.ts";

const projects = Array.from({ length: 8 }, (_, index) => ({
    repo_name: `project-${index + 1}`,
    url: `https://github.com/candidate/project-${index + 1}`,
    description: `Project ${index + 1}`,
    tech_stack: index === 0 ? ["TypeScript", "FastAPI"] : ["TypeScript"],
    stars: index + 3,
    own_commits: index * 4,
}));

test("limits the Maestro story to the existing six-project cap", () => {
    assert.equal(getMaestroProjects(projects).length, 6);
    assert.deepEqual(getMaestroProjects(projects), projects.slice(0, 6));
});

test("clamps chapter progress to a valid project index", () => {
    assert.equal(getMaestroChapterProgress(-0.2, 5), 0);
    assert.equal(getMaestroChapterProgress(0.5, 5), 2);
    assert.equal(getMaestroChapterProgress(1.2, 5), 4);
    assert.equal(getMaestroChapterProgress(0.5, 0), 0);
});

test("removes stack transforms when reduced motion is requested", () => {
    assert.deepEqual(getMaestroCardTransform(0, 0, true), {
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        opacity: 1,
    });
});

test("uses deterministic layers around the active card", () => {
    assert.deepEqual(getMaestroCardTransform(2, 2, false), {
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        opacity: 1,
    });
    assert.deepEqual(getMaestroCardTransform(1, 2, false), getMaestroCardTransform(1, 2, false));
    assert.ok(getMaestroCardTransform(1, 2, false).rotate < 0);
    assert.ok(getMaestroCardTransform(3, 2, false).rotate > 0);
});

test("builds compact metadata from real repository evidence", () => {
    assert.deepEqual(getMaestroMetaItems(projects[0]), [
        "TypeScript",
        "FastAPI",
        "3 stars",
        "0 commits",
    ]);
});

test("preserves complete words for clipped headline entrances", () => {
    assert.deepEqual(splitMaestroWords("Backend  & AI Engineer"), ["Backend", "&", "AI", "Engineer"]);
});

test("cycles an original sage palette and supports long repository names", () => {
    assert.equal(getMaestroProjectPalette(0).surface, "#B1C6C0");
    assert.deepEqual(getMaestroProjectPalette(0), getMaestroProjectPalette(6));
    assert.deepEqual(MAESTRO_PROJECT_TITLE_WRAP, {
        overflowWrap: "anywhere",
        wordBreak: "normal",
    });
});
