import assert from "node:assert/strict";
import test from "node:test";
import {
    FOLD_BLOCKS,
    buildFoldStats,
    buildTrack,
    callContacts,
    formatCallTime,
    giantNameSize,
    buildScreens,
    firstSentences,
    formatClock,
    getFoldCopy,
    initials,
    isSectionOn,
    notificationMeta,
    parseFoldPrefs,
    pickBlockColor,
    pickNotifications,
    primaryContact,
    readableInk,
    splitSkills,
} from "../src/components/portfolio/fold-portfolio-config.ts";

const project = (repo_name: string, own_commits: number, extra: Record<string, unknown> = {}) => ({
    repo_name,
    url: `https://github.com/x/${repo_name}`,
    description: "",
    tech_stack: ["TypeScript", "Python"],
    stars: 0,
    own_commits,
    ...extra,
});

const portfolio = (content: Record<string, unknown> = {}, verified_skills: unknown[] = []) =>
    ({
        public_id: "abc",
        has_photo: false,
        verified_skills,
        content: {
            name: "Muhammad Rozagi",
            headline: "Backend Engineer",
            bio: "",
            language: "id",
            theme: "fold",
            projects: [],
            skills: [],
            experience: [],
            education: [],
            certifications: [],
            contacts: {},
            sections: { projects: true, skills: true, experience: true, education: true, certifications: true },
            ...content,
        },
    }) as never;

test("returns copy per language with id fallback", () => {
    assert.equal(getFoldCopy("en").verified, "Verified from GitHub");
    assert.equal(getFoldCopy("id").verified, "Terverifikasi dari GitHub");
    assert.equal(getFoldCopy("en").connected, "Connected");
    assert.equal(getFoldCopy("id").endCall, "Akhiri panggilan");
    assert.equal(getFoldCopy("xx" as never).unfold, getFoldCopy("id").unfold);
});

test("treats a section as on unless explicitly disabled", () => {
    assert.equal(isSectionOn({ sections: { projects: false } } as never, "projects"), false);
    assert.equal(isSectionOn({ sections: {} } as never, "projects"), true);
    assert.equal(isSectionOn({} as never, "skills"), true);
});

test("picks dark ink on light blocks and white ink on dark blocks", () => {
    assert.equal(readableInk("#e9c94a"), "#111111");
    assert.equal(readableInk("#2f5bd3"), "#ffffff");
    assert.equal(readableInk("#d83a2e"), "#ffffff");
});

test("picks a stable block color per repo from the palette", () => {
    const a = pickBlockColor("HACKATHON");
    assert.deepEqual(a, pickBlockColor("HACKATHON"));
    assert.ok(FOLD_BLOCKS.includes(a.bg));
    assert.equal(a.ink, readableInk(a.bg));
});

test("builds stats from real data and drops zeros and disabled sections", () => {
    const copy = getFoldCopy("id");
    const stats = buildFoldStats(portfolio({ projects: [project("a", 220), project("b", 37)] }, [{ skill: "Python" }]), copy);
    assert.deepEqual(stats.map((item) => item.value), [2, 257, 1]);
    const noCommits = buildFoldStats(portfolio({ projects: [project("a", 0)] }), copy);
    assert.deepEqual(noCommits.map((item) => item.value), [1]);
    const off = buildFoldStats(
        portfolio({ projects: [project("a", 5)], sections: { projects: false, skills: false } }, [{ skill: "Go" }]),
        copy,
    );
    assert.deepEqual(off, []);
});

test("picks at most two notifications ordered by own commits", () => {
    const list = pickNotifications([project("low", 5), project("top", 220), project("mid", 67)]);
    assert.deepEqual(list.map((item) => item.repo_name), ["top", "mid"]);
    assert.deepEqual(pickNotifications([]), []);
});

test("formats notification meta without zero stars", () => {
    const copy = getFoldCopy("en");
    assert.equal(notificationMeta(project("a", 220), copy), "TypeScript · 220 commits");
    assert.equal(notificationMeta(project("a", 0, { stars: 3, tech_stack: [] }), copy), "3 stars");
    assert.equal(notificationMeta(project("a", 0, { tech_stack: [] }), copy), "GitHub");
});

test("chooses the primary contact by priority", () => {
    assert.deepEqual(primaryContact([["github", "https://github.com/x"], ["whatsapp", "0831-7328"]]), {
        kind: "whatsapp",
        value: "0831-7328",
        href: "https://wa.me/08317328",
    });
    assert.equal(primaryContact([["email", "a@b.c"], ["github", "github.com/x"]])?.href, "mailto:a@b.c");
    assert.equal(primaryContact([]), null);
});

test("builds the screen list from toggles and data", () => {
    const full = buildScreens(
        portfolio(
            {
                projects: [project("a", 3), project("b", 1)],
                skills: ["Go"],
                experience: [{ role: "Dev" }],
                education: [{ institution: "UNSRI" }],
                certifications: ["AWS"],
            },
            [{ skill: "Python" }],
        ),
    );
    assert.deepEqual(
        full.map((screen) => (screen.id === "project" ? `project${screen.index}` : screen.id)),
        ["hero", "stats", "work", "project0", "project1", "skills", "experience", "education", "certifications", "call"],
    );
    const empty = buildScreens(portfolio());
    assert.deepEqual(empty.map((screen) => screen.id), ["hero", "call"]);
    const off = buildScreens(portfolio({ projects: [project("a", 3)], sections: { projects: false } }));
    assert.deepEqual(off.map((screen) => screen.id), ["hero", "call"]);
});

test("assigns each nav target to its first screen only", () => {
    const screens = buildScreens(portfolio({ projects: [project("a", 3), project("b", 1)], experience: [{ role: "Dev" }], certifications: ["AWS"] }));
    assert.deepEqual(
        screens.filter((screen) => screen.nav).map((screen) => `${screen.id}:${screen.nav}`),
        ["hero:home", "work:work", "experience:about", "call:contact"],
    );
});

test("formats the clock with zero padding", () => {
    assert.equal(formatClock(new Date(2026, 0, 1, 9, 5)), "09:05");
    assert.equal(formatClock(new Date(2026, 0, 1, 23, 41)), "23:41");
});

test("derives initials", () => {
    assert.equal(initials("Muhammad Rozagi"), "MR");
    assert.equal(initials("cher"), "C");
    assert.equal(initials("  "), "GH");
});

test("keeps the first sentences of a bio", () => {
    assert.equal(firstSentences("Satu. Dua! Tiga? Empat.", 2), "Satu. Dua!");
    assert.equal(firstSentences("Tanpa titik", 2), "Tanpa titik");
    assert.equal(firstSentences("", 2), "");
});

test("parses stored preferences defensively", () => {
    assert.deepEqual(parseFoldPrefs(null), { backdrop: "basic", bezel: "silver" });
    assert.deepEqual(parseFoldPrefs("{rusak"), { backdrop: "basic", bezel: "silver" });
    assert.deepEqual(parseFoldPrefs('{"backdrop":"orbit","bezel":"rose"}'), { backdrop: "orbit", bezel: "rose" });
    assert.deepEqual(parseFoldPrefs('{"backdrop":"neon","bezel":7}'), { backdrop: "basic", bezel: "silver" });
});

test("moves the screens continuously between unfold and fold-back", () => {
    // Tanpa jeda diam per layar: jeda membuat scroll terasa berhenti-berhenti.
    const track = buildTrack(3);
    assert.equal(track.steps, 4);
    assert.deepEqual(track.unfold, [0, 1]);
    assert.deepEqual(track.fold, [3, 4]);
    assert.deepEqual(track.stripInput, [0, 1, 3, 4]);
    assert.deepEqual(track.stripOutput, [0, 0, 2, 2]);
    assert.equal(track.restStep(0), 1);
    assert.equal(track.restStep(2), 3);
    assert.equal(track.restStep(3), 4);
});

test("keeps the strip transform strictly increasing with a single screen", () => {
    const track = buildTrack(1);
    assert.equal(track.steps, 2);
    assert.deepEqual(track.fold, [1, 2]);
    assert.deepEqual(track.stripInput, [0, 2]);
    assert.deepEqual(track.stripOutput, [0, 0]);
});

test("shrinks the giant name for long names", () => {
    assert.equal(giantNameSize("Lio"), 22);
    assert.ok(giantNameSize("Muhammad Rozagi") < 22);
    assert.ok(giantNameSize("Muhammad Rozagi") * "Muhammad Rozagi".length * 0.5 <= 94);
});

test("splits verified skills from the rest without duplicates and with caps", () => {
    const result = splitSkills(["react", "Go", "PYTHON", " ", "Docker", "go"], [{ skill: "React" }, { skill: "Python" }, { skill: "" }], 6, 2);
    assert.deepEqual(result.verified.map((item) => item.skill), ["React", "Python"]);
    assert.deepEqual(result.others, ["Go", "Docker"]);
    assert.equal(result.hiddenOthers, 0);
    const capped = splitSkills(["A", "B", "C", "D"], [], 6, 2);
    assert.deepEqual(capped.others, ["A", "B"]);
    assert.equal(capped.hiddenOthers, 2);
});

test("lists every usable contact in priority order with a readable value", () => {
    const list = callContacts([
        ["github", "https://github.com/zgii14/"],
        ["whatsapp", "6283173289305"],
        ["website", "rozagi.dev"],
        ["email", "a@b.c"],
        ["linkedin", "https://www.linkedin.com/in/rozagi"],
        ["fax", "123"],
        ["email", " "],
    ]);
    assert.deepEqual(
        list.map((item) => [item.kind, item.display]),
        [
            ["email", "a@b.c"],
            ["whatsapp", "+6283173289305"],
            ["linkedin", "linkedin.com/in/rozagi"],
            ["website", "rozagi.dev"],
            ["github", "github.com/zgii14"],
        ],
    );
    assert.equal(list[1].href, "https://wa.me/6283173289305");
    assert.deepEqual(callContacts([]), []);
});

test("formats the call timer as mm:ss", () => {
    assert.equal(formatCallTime(0), "00:00");
    assert.equal(formatCallTime(65), "01:05");
    assert.equal(formatCallTime(3600), "60:00");
});
