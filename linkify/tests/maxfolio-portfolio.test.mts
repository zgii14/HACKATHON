import assert from "node:assert/strict";
import test from "node:test";
import {
    MAXFOLIO_PROJECT_TITLE_WRAP,
    getMaxfolioLetterDelay,
    getMaxfolioMarqueeItems,
    getMaxfolioProjectImage,
    getMaxfolioProjectMotion,
    getMaxfolioProjects,
    splitMaxfolioWords,
} from "../src/components/portfolio/maxfolio-portfolio-config.ts";

const projects = Array.from({ length: 8 }, (_, index) => ({
    repo_name: `project-${index + 1}`,
    url: `https://example.com/project-${index + 1}`,
    description: `Project ${index + 1}`,
    tech_stack: index === 0 ? ["TypeScript", "FastAPI"] : ["TypeScript"],
    stars: index + 3,
    own_commits: index * 4,
}));

test("limits the Maxfolio showcase to six featured projects", () => {
    assert.deepEqual(
        getMaxfolioProjects(projects).map((project) => project.repo_name),
        projects.slice(0, 6).map((project) => project.repo_name),
    );
});

test("uses stable visual placeholders independent from repository content", () => {
    assert.equal(getMaxfolioProjectImage(0), getMaxfolioProjectImage(0));
    assert.equal(getMaxfolioProjectImage(0), getMaxfolioProjectImage(6));
    assert.match(getMaxfolioProjectImage(4), /^https:\/\/picsum\.photos\/seed\/githire-maxfolio-/);
});

test("builds repeating project metadata from real portfolio evidence", () => {
    assert.deepEqual(getMaxfolioMarqueeItems(projects[0]), [
        "TypeScript",
        "FastAPI",
        "3 stars",
        "0 commits",
    ]);
});

test("preserves complete words for the split-character hero entrance", () => {
    assert.deepEqual(splitMaxfolioWords("Backend  & AI Engineer"), ["Backend", "&", "AI", "Engineer"]);
    assert.equal(getMaxfolioLetterDelay(4), 0.1);
});

test("matches the reference scale-to-rest interaction and reduced-motion fallback", () => {
    assert.deepEqual(getMaxfolioProjectMotion(false), { restScale: 1.07, hoverScale: 1 });
    assert.deepEqual(getMaxfolioProjectMotion(true), { restScale: 1, hoverScale: 1 });
});

test("allows long repository names to wrap inside the title footer", () => {
    assert.deepEqual(MAXFOLIO_PROJECT_TITLE_WRAP, {
        overflowWrap: "anywhere",
        wordBreak: "normal",
    });
});
