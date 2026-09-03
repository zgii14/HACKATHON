import assert from "node:assert/strict";
import test from "node:test";
import { getThemePreviewData } from "../src/components/portfolio/theme-preview-data.ts";

test("uses compact fallbacks when a portfolio draft has no candidate details", () => {
    assert.deepEqual(
        getThemePreviewData({
            name: "",
            headline: "",
            projects: [],
            experience: [],
        }),
        {
            name: "Your name",
            headline: "Your professional headline",
            projectName: "Featured project",
            experienceRole: "Experience",
        },
    );
});

test("uses the candidate's draft details when they are available", () => {
    assert.deepEqual(
        getThemePreviewData({
            name: "Regina Adelisa",
            headline: "Statistics student and data analyst",
            projects: [{ repo_name: "sumatra-poverty" }],
            experience: [{ role: "Data Intern" }],
        }),
        {
            name: "Regina Adelisa",
            headline: "Statistics student and data analyst",
            projectName: "sumatra-poverty",
            experienceRole: "Data Intern",
        },
    );
});
