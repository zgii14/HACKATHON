import assert from "node:assert/strict";
import test from "node:test";
import {
    contactErrorKey,
    errorSection,
    parseList,
    parseSection,
    publishState,
    sectionCompleteness,
    stableStringify,
} from "../src/components/portfolio/editor/editor-state.ts";
import type { PortfolioContent } from "../src/components/portfolio/types.ts";

const contact = (value = "", enabled = false) => ({ value, enabled });
const base = (): PortfolioContent => ({
    name: "Rozagi",
    headline: "Backend Engineer",
    bio: "Membangun API.",
    language: "id",
    theme: "editorial",
    projects: [{ repo_name: "app", url: "https://github.com/a/app", description: "", tech_stack: [], stars: 0, own_commits: 1 }],
    skills: ["Python"],
    experience: [{ role: "Intern", company: "Contoh" }],
    education: [{ institution: "Universitas Bengkulu" }],
    certifications: [],
    contacts: { github: contact("https://github.com/a", true), linkedin: contact(), email: contact(), whatsapp: contact(), website: contact() },
    sections: { projects: true, skills: true, experience: true, education: true, certifications: true },
});

test("parseSection jatuh ke profil untuk nilai tak dikenal", () => {
    assert.equal(parseSection("kontak"), "kontak");
    assert.equal(parseSection("alamat"), "alamat");
    assert.equal(parseSection("ngawur"), "profil");
    assert.equal(parseSection(null), "profil");
});

test("sectionCompleteness: semua lengkap", () => {
    assert.deepEqual(sectionCompleteness(base()), {
        profil: true, proyek: true, skill: true, pengalaman: true, pendidikan: true, kontak: true,
    });
});

test("sectionCompleteness: yang kosong ditandai", () => {
    const form = { ...base(), bio: "  ", projects: [], skills: [], experience: [{ role: "Intern" }], education: [{}] };
    form.contacts = { ...form.contacts, github: contact("https://github.com/a", false) };
    assert.deepEqual(sectionCompleteness(form), {
        profil: false, proyek: false, skill: false, pengalaman: false, pendidikan: false, kontak: false,
    });
});

test("sectionCompleteness: bagian yang disembunyikan dianggap lengkap", () => {
    const form = { ...base(), experience: [], education: [] };
    form.sections = { ...form.sections, experience: false, education: false };
    const result = sectionCompleteness(form);
    assert.equal(result.pengalaman, true);
    assert.equal(result.pendidikan, true);
});

test("stableStringify mengurutkan key dan mengabaikan ai_enhanced", () => {
    assert.equal(stableStringify({ b: 1, a: [{ d: 2, c: undefined }] }), stableStringify({ a: [{ d: 2 }], b: 1 }));
    assert.equal(stableStringify({ a: 1, ai_enhanced: true }), stableStringify({ a: 1 }));
    assert.notEqual(stableStringify({ a: 1 }), stableStringify({ a: 2 }));
});

test("publishState", () => {
    const draft = base();
    assert.equal(publishState({ status: "draft", draft_content: draft, published_content: null }, { photoChanged: false }), "draft");
    assert.equal(
        publishState({ status: "published", draft_content: { ...draft, ai_enhanced: true }, published_content: draft }, { photoChanged: false }),
        "up_to_date",
    );
    assert.equal(publishState({ status: "published", draft_content: draft, published_content: draft }, { photoChanged: true }), "changed");
    assert.equal(
        publishState({ status: "published", draft_content: { ...draft, bio: "baru" }, published_content: draft }, { photoChanged: false }),
        "changed",
    );
});

test("errorSection dan contactErrorKey membaca pesan backend", () => {
    assert.equal(errorSection("Kontak github tidak valid."), "kontak");
    assert.equal(errorSection("Project harus berasal dari repository GitHub milik kandidat."), null);
    assert.equal(errorSection(null), null);
    assert.equal(contactErrorKey("Kontak whatsapp tidak valid."), "whatsapp");
    assert.equal(contactErrorKey("Lainnya"), null);
});

test("parseList memisah koma, merapikan, membatasi", () => {
    assert.deepEqual(parseList("Python, , React ,Go", 50), ["Python", "React", "Go"]);
    assert.deepEqual(parseList("a,b,c", 2), ["a", "b"]);
});
