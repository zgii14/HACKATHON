import assert from "node:assert/strict";
import test from "node:test";
import { subdomainFromHost, subdomainUrl, toSubdomainCandidate } from "../src/utils/functions/subdomain-host.ts";

test("subdomainFromHost membaca nama dari host portfolio", () => {
    assert.equal(subdomainFromHost("rozagi.githire.my.id", "githire.my.id"), "rozagi");
    assert.equal(subdomainFromHost("Rozagi.GitHire.my.id:443", "githire.my.id"), "rozagi");
    assert.equal(subdomainFromHost("rozagi.localhost:3000", "githire.my.id"), "rozagi");
});

test("subdomainFromHost mengabaikan host aplikasi", () => {
    for (const host of ["githire.my.id", "www.githire.my.id", "localhost:3000", "linkify-abc.vercel.app", "a.b.githire.my.id", "", null, undefined]) {
        assert.equal(subdomainFromHost(host, "githire.my.id"), null, String(host));
    }
});

test("subdomainUrl", () => {
    assert.equal(subdomainUrl("rozagi", "githire.my.id"), "https://rozagi.githire.my.id");
});

test("toSubdomainCandidate merapikan username GitHub", () => {
    assert.equal(toSubdomainCandidate("Rozagi_Dev"), "rozagi-dev");
    assert.equal(toSubdomainCandidate("--a..b--"), "a-b");
    assert.equal(toSubdomainCandidate("ab"), null);
    assert.equal(toSubdomainCandidate(null), null);
    assert.equal(toSubdomainCandidate("x".repeat(40)), "x".repeat(30));
});
