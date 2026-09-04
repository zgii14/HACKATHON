import assert from "node:assert/strict";
import test from "node:test";
import {
    EDITORIAL_BIO_FONT_SIZE,
    EDITORIAL_PROJECT_TITLE_WRAP,
    getEditorialMotionRotation,
    getEditorialLetterMotion,
    getEditorialStackPosition,
    getEditorialProjectImage,
    getEditorialProjects,
    splitEditorialBio,
    splitEditorialWords,
} from "../src/components/portfolio/editorial-portfolio-config.ts";

const projects = Array.from({ length: 8 }, (_, index) => ({
    repo_name: `project-${index + 1}`,
    url: `https://example.com/project-${index + 1}`,
    description: `Project ${index + 1}`,
    tech_stack: ["TypeScript"],
    stars: index,
    own_commits: index * 2,
}));

test("limits the editorial showcase to six featured projects", () => {
    assert.deepEqual(
        getEditorialProjects(projects).map((project) => project.repo_name),
        projects.slice(0, 6).map((project) => project.repo_name),
    );
});

test("uses stable random placeholders that do not depend on repository content", () => {
    assert.equal(getEditorialProjectImage(0), getEditorialProjectImage(0));
    assert.equal(getEditorialProjectImage(0), getEditorialProjectImage(6));
    assert.match(getEditorialProjectImage(2), /^https:\/\/picsum\.photos\/seed\/githire-editorial-/);
});

test("keeps animated letters grouped into unbroken words", () => {
    assert.deepEqual(splitEditorialWords("Regina  Adelisa"), ["Regina", "Adelisa"]);
});

test("removes animated rotation when reduced motion is requested", () => {
    assert.equal(getEditorialMotionRotation(true, 7), 0);
    assert.equal(getEditorialMotionRotation(false, 7), 7);
});

test("keeps long editorial biographies below display-heading scale", () => {
    assert.equal(EDITORIAL_BIO_FONT_SIZE, "clamp(1.3rem, 2.5vw, 2.25rem)");
});

test("separates a long biography into an editorial lead and supporting copy", () => {
    assert.deepEqual(splitEditorialBio("First statement. Supporting detail. Final detail."), {
        lead: "First statement.",
        details: "Supporting detail. Final detail.",
    });
});

test("offsets each selected-work card into a layered scroll stack", () => {
    assert.deepEqual(getEditorialStackPosition(0), { top: 64, zIndex: 10, rotation: -1.2 });
    assert.deepEqual(getEditorialStackPosition(3), { top: 94, zIndex: 13, rotation: 1.2 });
});

test("allows long repository names to wrap without entering the image column", () => {
    assert.deepEqual(EDITORIAL_PROJECT_TITLE_WRAP, {
        overflowWrap: "break-word",
        wordBreak: "normal",
    });
});

test("gives alternating hero letters an expressive reveal and hover wave", () => {
    assert.deepEqual(getEditorialLetterMotion(0), {
        hidden: { x: 24, y: 44, rotate: 5, scale: 0.84 },
        hover: { y: -5, rotate: 2.5, scale: 1.04 },
    });
    assert.deepEqual(getEditorialLetterMotion(1), {
        hidden: { x: -24, y: 34, rotate: -5, scale: 0.84 },
        hover: { y: -8, rotate: -2.5, scale: 1.04 },
    });
});
