import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Next.js memperlakukan setiap matcher sebagai regex terhadap pathname. Pola pertama harus
// menangkap semua halaman (agar Clerk jalan) kecuali file statis dan /_next.
const source = readFileSync(new URL("../src/middleware.ts", import.meta.url), "utf8");
const literal = source.match(/"(\/\(\(\?!\.\*[^"]*)"/)?.[1];

test("pola matcher utama ada di middleware.ts", () => {
    assert.ok(literal, "pola /((?!... tidak ditemukan");
});

test("pola matcher utama menangkap halaman dan mengecualikan file statis", () => {
    // Evaluasi literal string persis seperti JS mengevaluasinya (escape "\\" jadi "\").
    const pattern = JSON.parse(`"${literal}"`) as string;
    const regex = new RegExp(`^${pattern}$`);
    for (const path of ["/auth/auth-callback", "/p/kBvAyQPhGD", "/s/rozagi", "/dashboard/portfolio", "/pricing"]) {
        assert.ok(regex.test(path), `${path} harus melewati middleware`);
    }
    for (const path of ["/favicon.ico", "/landing/portfolio-editorial.webp", "/_next/static/chunk.js"]) {
        assert.ok(!regex.test(path), `${path} tidak boleh melewati middleware`);
    }
});
