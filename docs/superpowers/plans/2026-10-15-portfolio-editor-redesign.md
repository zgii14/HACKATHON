# Portfolio Editor Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti editor portfolio satu-halaman-panjang dengan menu samping + satu bagian per layar, simpan otomatis, dan satu tombol publikasi yang mengikuti keadaan.

**Architecture:** Fungsi murni (`editor-state.ts`, `save-queue.ts`) diuji dengan `node --test`. Hook `usePortfolioAutosave` memegang form lokal, antrian simpan, dan cadangan `localStorage`. `EditorWorkspace` merakit bar atas, menu, dan 8 komponen bagian; `portfolio-editor.tsx` tinggal menangani loading, layar belum siap, dan layar generate pertama. Backend tidak berubah.

**Tech Stack:** Next.js 14 app router (client components), React Query, Radix (Switch, DropdownMenu dari `components/ui`), lucide-react, `node --test` (Node 24, strip types).

Spec: `docs/superpowers/specs/2026-10-15-portfolio-editor-redesign-design.md`

## Global Constraints

- Semua copy Bahasa Indonesia, tanpa em-dash (`—`).
- Theme GitHire violet terkunci; pakai token (`primary`, `muted`, `border`, `destructive`) dan skala `text-body` / `text-meta`.
- Bagian: `profil | proyek | skill | pengalaman | pendidikan | kontak | tampilan | alamat`, dari query `?bagian=`, default `profil`.
- Debounce simpan 1000 ms; flush saat blur dan saat ganti bagian; paling banyak satu PATCH berjalan.
- Respons autosave tidak boleh menimpa form lokal.
- Cadangan `localStorage` key `githire:portfolio-draft:{public_id}`; semua akses dalam try/catch.
- File murni yang dites `node --test` hanya boleh `import type` dari modul lain (tanpa alias `@/`).
- Jangan push tanpa persetujuan user.

## File Structure

| File | Tanggung jawab |
|---|---|
| `linkify/src/components/portfolio/editor/editor-state.ts` (baru) | `EDITOR_SECTIONS`, `parseSection`, `sectionCompleteness`, `stableStringify`, `publishState`, `errorSection`, `contactErrorKey`, `parseList` |
| `linkify/tests/portfolio-editor-state.test.mts` (baru) | Test fungsi di atas |
| `linkify/src/components/portfolio/editor/save-queue.ts` (baru) | `createSaveQueue` |
| `linkify/tests/portfolio-save-queue.test.mts` (baru) | Test antrian |
| `linkify/src/components/portfolio/editor/use-portfolio-autosave.ts` (baru) | Hook simpan otomatis + cadangan + beforeunload |
| `linkify/src/components/portfolio/editor/field.tsx` (baru) | `inputClass`, `Field`, `SectionHeader`, `SectionToggle` |
| `linkify/src/components/portfolio/editor/editor-nav.tsx` (baru) | Menu kiri / tab mobile |
| `linkify/src/components/portfolio/editor/editor-bar.tsx` (baru) | Bar atas |
| `linkify/src/components/portfolio/editor/sections/*.tsx` (baru, 8 file) | Komponen per bagian |
| `linkify/src/components/portfolio/editor/editor-workspace.tsx` (baru) | Merakit editor + aksi (publish, foto, AI, undo) |
| `linkify/src/components/portfolio/portfolio-editor.tsx` (ditulis ulang) | Loading, layar belum siap, layar generate, render workspace |
| `linkify/src/app/(main)/dashboard/portfolio/page.tsx` | Bungkus `Suspense` (dibutuhkan `useSearchParams`) |

---

### Task 1: Fungsi murni editor-state

**Files:**
- Create: `linkify/src/components/portfolio/editor/editor-state.ts`
- Test: `linkify/tests/portfolio-editor-state.test.mts`

**Interfaces:**
- Produces:
  - `EDITOR_SECTIONS: readonly { slug: SectionSlug; label: string; description: string; counted: boolean }[]`
  - `type SectionSlug`, `type CountedSlug = "profil" | "proyek" | "skill" | "pengalaman" | "pendidikan" | "kontak"`
  - `parseSection(value: string | null | undefined): SectionSlug`
  - `sectionCompleteness(form: PortfolioContent): Record<CountedSlug, boolean>`
  - `stableStringify(value: unknown): string` (key diurutkan, `ai_enhanced` dan nilai `undefined` diabaikan)
  - `type PublishState = "draft" | "up_to_date" | "changed"`; `publishState(record, { photoChanged }): PublishState`
  - `errorSection(message: string | null | undefined): SectionSlug | null`
  - `contactErrorKey(message: string | null | undefined): string | null`
  - `parseList(raw: string, max: number): string[]`

- [ ] **Step 1: Write the failing test**

Create `linkify/tests/portfolio-editor-state.test.mts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run (dari `linkify/`): `node --test tests/portfolio-editor-state.test.mts`
Expected: FAIL `Cannot find module .../editor/editor-state.ts`

- [ ] **Step 3: Implement**

Create `linkify/src/components/portfolio/editor/editor-state.ts`:

```ts
import type { PortfolioContent, PortfolioRecord } from "../types";

export const EDITOR_SECTIONS = [
    { slug: "profil", label: "Profil", description: "Nama dan perkenalan singkat yang pertama dibaca recruiter.", counted: true },
    { slug: "proyek", label: "Proyek", description: "Repository GitHub yang kamu tampilkan, dengan deskripsi singkat.", counted: true },
    { slug: "skill", label: "Skill & sertifikasi", description: "Pisahkan dengan koma. Label terverifikasi ditentukan dari commit.", counted: true },
    { slug: "pengalaman", label: "Pengalaman", description: "Pekerjaan, magang, atau organisasi yang relevan.", counted: true },
    { slug: "pendidikan", label: "Pendidikan", description: "Sekolah atau kampus terakhir.", counted: true },
    { slug: "kontak", label: "Kontak", description: "Hanya kontak yang dinyalakan yang tampil di portfolio publik.", counted: true },
    { slug: "tampilan", label: "Tampilan", description: "Tema dan bahasa portfolio publikmu.", counted: false },
    { slug: "alamat", label: "Alamat & publikasi", description: "Alamat yang kamu bagikan, dan kontrol publikasi.", counted: false },
] as const;

export type SectionSlug = (typeof EDITOR_SECTIONS)[number]["slug"];
export type CountedSlug = "profil" | "proyek" | "skill" | "pengalaman" | "pendidikan" | "kontak";
export type PublishState = "draft" | "up_to_date" | "changed";

export function parseSection(value: string | null | undefined): SectionSlug {
    return EDITOR_SECTIONS.find((section) => section.slug === value)?.slug ?? "profil";
}

const filled = (value?: string | null) => Boolean(value && value.trim());

export function sectionCompleteness(form: PortfolioContent): Record<CountedSlug, boolean> {
    return {
        profil: filled(form.name) && filled(form.headline) && filled(form.bio),
        proyek: form.projects.length > 0,
        skill: form.skills.length > 0,
        pengalaman: !form.sections.experience || form.experience.some((item) => filled(item.role) && filled(item.company)),
        pendidikan: !form.sections.education || form.education.some((item) => filled(item.institution)),
        kontak: Object.values(form.contacts).some((item) => item.enabled && filled(item.value)),
    };
}

/** JSON dengan key terurut; `ai_enhanced` dan nilai undefined diabaikan (bukan bagian isi portfolio). */
export function stableStringify(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([key, item]) => key !== "ai_enhanced" && item !== undefined)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
        return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
    }
    return JSON.stringify(value ?? null);
}

export function publishState(
    record: Pick<PortfolioRecord, "status" | "draft_content" | "published_content">,
    options: { photoChanged: boolean },
): PublishState {
    if (record.status !== "published") return "draft";
    if (options.photoChanged) return "changed";
    return stableStringify(record.draft_content) === stableStringify(record.published_content) ? "up_to_date" : "changed";
}

/** Bagian yang menyebabkan error simpan, dari pesan backend (mis. "Kontak github tidak valid."). */
export function errorSection(message: string | null | undefined): SectionSlug | null {
    return message?.startsWith("Kontak ") ? "kontak" : null;
}

export function contactErrorKey(message: string | null | undefined): string | null {
    return message?.match(/^Kontak (\w+)/)?.[1] ?? null;
}

export function parseList(raw: string, max: number): string[] {
    return raw.split(",").map((item) => item.trim()).filter(Boolean).slice(0, max);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/portfolio-editor-state.test.mts`
Expected: 8 tests pass

- [ ] **Step 5: Commit**

```bash
git add linkify/src/components/portfolio/editor/editor-state.ts linkify/tests/portfolio-editor-state.test.mts
git commit -m "feat(portfolio-editor): pure editor state helpers"
```

---

### Task 2: Antrian simpan

**Files:**
- Create: `linkify/src/components/portfolio/editor/save-queue.ts`
- Test: `linkify/tests/portfolio-save-queue.test.mts`

**Interfaces:**
- Produces:
  - `type SaveQueueState = { status: "saving" | "saved" | "error"; error?: unknown }`
  - `createSaveQueue<T>(save: (value: T) => Promise<void>, onState: (state: SaveQueueState) => void): { push(value: T): void; flush(): Promise<boolean>; hasPending(): boolean }`
  - Perilaku: `push` mengganti nilai tertunda; `flush` mengirim nilai tertunda (paling banyak satu `save` berjalan; perubahan selama berjalan dikirim sesudahnya, hanya versi terbaru); gagal → `false`, nilai yang gagal dipertahankan untuk dicoba lagi kecuali sudah ada yang lebih baru; tanpa nilai tertunda → hasil terakhir tanpa memanggil `save`.

- [ ] **Step 1: Write the failing test**

Create `linkify/tests/portfolio-save-queue.test.mts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createSaveQueue, type SaveQueueState } from "../src/components/portfolio/editor/save-queue.ts";

const deferred = () => {
    let resolve!: () => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
};

test("tidak ada dua save bersamaan dan hanya versi terbaru yang menyusul", async () => {
    const calls: string[] = [];
    let active = 0;
    let maxActive = 0;
    const gates: Array<ReturnType<typeof deferred>> = [];
    const queue = createSaveQueue<string>(async (value) => {
        calls.push(value);
        active += 1;
        maxActive = Math.max(maxActive, active);
        const gate = deferred();
        gates.push(gate);
        await gate.promise;
        active -= 1;
    }, () => undefined);

    queue.push("A");
    const first = queue.flush();
    queue.push("B");
    queue.push("C");
    const second = queue.flush();
    gates[0].resolve();
    await new Promise((r) => setTimeout(r, 0));
    gates[1].resolve();
    assert.equal(await first, true);
    assert.equal(await second, true);
    assert.deepEqual(calls, ["A", "C"]);
    assert.equal(maxActive, 1);
    assert.equal(queue.hasPending(), false);
});

test("gagal mengembalikan false dan bisa dicoba lagi", async () => {
    const states: SaveQueueState["status"][] = [];
    let fail = true;
    const saved: string[] = [];
    const queue = createSaveQueue<string>(async (value) => {
        if (fail) throw new Error("Kontak github tidak valid.");
        saved.push(value);
    }, (state) => states.push(state.status));

    queue.push("A");
    assert.equal(await queue.flush(), false);
    assert.equal(queue.hasPending(), true);
    fail = false;
    assert.equal(await queue.flush(), true);
    assert.deepEqual(saved, ["A"]);
    assert.deepEqual(states, ["saving", "error", "saving", "saved"]);
});

test("flush tanpa perubahan tidak memanggil save", async () => {
    let called = 0;
    const queue = createSaveQueue<string>(async () => {
        called += 1;
    }, () => undefined);
    assert.equal(await queue.flush(), true);
    assert.equal(called, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/portfolio-save-queue.test.mts`
Expected: FAIL `Cannot find module .../editor/save-queue.ts`

- [ ] **Step 3: Implement**

Create `linkify/src/components/portfolio/editor/save-queue.ts`:

```ts
export type SaveQueueState = { status: "saving" | "saved" | "error"; error?: unknown };

/**
 * Antrian simpan tunggal: paling banyak satu `save` berjalan. Nilai yang masuk selama
 * save berjalan menunggu, dan hanya versi terbaru yang dikirim berikutnya.
 */
export function createSaveQueue<T>(save: (value: T) => Promise<void>, onState: (state: SaveQueueState) => void) {
    let pending: { value: T } | null = null;
    let running: Promise<boolean> | null = null;
    let lastOk = true;

    const drain = async (): Promise<boolean> => {
        while (pending) {
            const { value } = pending;
            pending = null;
            onState({ status: "saving" });
            try {
                await save(value);
            } catch (error) {
                // Pertahankan versi yang gagal untuk "Coba lagi", kecuali sudah ada yang lebih baru.
                if (!pending) pending = { value };
                onState({ status: "error", error });
                return false;
            }
        }
        onState({ status: "saved" });
        return true;
    };

    const queue = {
        push(value: T) {
            pending = { value };
        },
        hasPending() {
            return pending !== null || running !== null;
        },
        flush(): Promise<boolean> {
            if (running) return running.then(() => (pending ? queue.flush() : lastOk));
            if (!pending) return Promise.resolve(lastOk);
            running = drain().then((ok) => {
                lastOk = ok;
                running = null;
                return ok;
            });
            return running;
        },
    };
    return queue;
}
```

Catatan: pada test pertama, `second` dipanggil saat `running` aktif, jadi menunggu `first` selesai lalu memanggil `flush` lagi; sementara itu `drain` pertama sudah mengambil "C" dalam loop yang sama. Keduanya resolve `true`, dan `save` hanya dipanggil untuk "A" lalu "C".

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/portfolio-save-queue.test.mts`
Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add linkify/src/components/portfolio/editor/save-queue.ts linkify/tests/portfolio-save-queue.test.mts
git commit -m "feat(portfolio-editor): single-flight save queue"
```

---

### Task 3: Hook simpan otomatis

**Files:**
- Create: `linkify/src/components/portfolio/editor/use-portfolio-autosave.ts`

**Interfaces:**
- Consumes: Task 1 (`errorSection`, `stableStringify`), Task 2 (`createSaveQueue`), `useApi().withAuth`, `ApiError`
- Produces: `usePortfolioAutosave(record: PortfolioRecord)` mengembalikan
  - `form: PortfolioContent`
  - `edit(next: PortfolioContent): void` (perubahan user: cadangan + jadwalkan simpan)
  - `replace(next: PortfolioContent): void` (isi dari server setelah aksi eksplisit; tidak menyimpan)
  - `latest(): PortfolioContent`
  - `flush(): Promise<boolean>`
  - `status: { state: "idle" | "saving" | "saved" | "error"; message?: string; section: SectionSlug | null }`
  - `backup: PortfolioContent | null`, `restoreBackup(): void`, `discardBackup(): void`

- [ ] **Step 1: Implement**

Create `linkify/src/components/portfolio/editor/use-portfolio-autosave.ts`:

```ts
"use client";

import { useApi } from "@/hooks/use-api";
import { ApiError } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PortfolioContent, PortfolioRecord } from "../types";
import { errorSection, stableStringify, type SectionSlug } from "./editor-state";
import { createSaveQueue } from "./save-queue";

const DEBOUNCE_MS = 1000;

export type AutosaveStatus = {
    state: "idle" | "saving" | "saved" | "error";
    message?: string;
    section: SectionSlug | null;
};

const backupKey = (publicId: string) => `githire:portfolio-draft:${publicId}`;

function readBackup(publicId: string): PortfolioContent | null {
    try {
        const raw = window.localStorage.getItem(backupKey(publicId));
        return raw ? (JSON.parse(raw) as { form: PortfolioContent }).form : null;
    } catch {
        return null;
    }
}

function writeBackup(publicId: string, form: PortfolioContent) {
    try {
        window.localStorage.setItem(backupKey(publicId), JSON.stringify({ form, updatedAt: Date.now() }));
    } catch {
        // Penyimpanan browser penuh atau diblokir: autosave ke server tetap jalan.
    }
}

function clearBackup(publicId: string) {
    try {
        window.localStorage.removeItem(backupKey(publicId));
    } catch {
        // abaikan
    }
}

/**
 * Form lokal + simpan otomatis ke PATCH /me/portfolio. Respons server tidak pernah
 * menimpa form (supaya ketikan tidak hilang); hanya `replace` yang boleh.
 */
export function usePortfolioAutosave(record: PortfolioRecord) {
    const { withAuth } = useApi();
    const queryClient = useQueryClient();
    const publicId = record.public_id;
    const [form, setForm] = useState<PortfolioContent>(() => record.draft_content as PortfolioContent);
    const formRef = useRef(form);
    const [status, setStatus] = useState<AutosaveStatus>({ state: "idle", section: null });
    const [backup, setBackup] = useState<PortfolioContent | null>(null);
    const timer = useRef<number | null>(null);
    const withAuthRef = useRef(withAuth);
    withAuthRef.current = withAuth;

    const queueRef = useRef<ReturnType<typeof createSaveQueue<PortfolioContent>> | null>(null);
    if (!queueRef.current) {
        queueRef.current = createSaveQueue<PortfolioContent>(
            async (value) => {
                const saved = await withAuthRef.current<PortfolioRecord>("/me/portfolio", {
                    method: "PATCH",
                    body: JSON.stringify({ ...value, ai_enhanced: undefined, save_mode: "draft" }),
                });
                queryClient.setQueryData(["portfolio"], saved);
                if (formRef.current === value) clearBackup(publicId);
            },
            (state) => {
                if (state.status === "error") {
                    const message = state.error instanceof ApiError || state.error instanceof Error
                        ? state.error.message
                        : "Koneksi bermasalah.";
                    setStatus({ state: "error", message, section: errorSection(message) });
                } else {
                    setStatus({ state: state.status, section: null });
                }
            },
        );
    }
    const queue = queueRef.current;

    useEffect(() => {
        const saved = readBackup(publicId);
        if (saved && stableStringify(saved) !== stableStringify(record.draft_content)) setBackup(saved);
        else clearBackup(publicId);
        // Hanya saat editor dibuka.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [publicId]);

    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => {
            if (!queue.hasPending()) return;
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => {
            window.removeEventListener("beforeunload", warn);
            if (timer.current) window.clearTimeout(timer.current);
        };
    }, [queue]);

    const flush = useCallback(() => {
        if (timer.current) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }
        return queue.flush();
    }, [queue]);

    const edit = useCallback((next: PortfolioContent) => {
        formRef.current = next;
        setForm(next);
        writeBackup(publicId, next);
        queue.push(next);
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
            timer.current = null;
            void queue.flush();
        }, DEBOUNCE_MS);
    }, [publicId, queue]);

    const replace = useCallback((next: PortfolioContent) => {
        formRef.current = next;
        setForm(next);
        clearBackup(publicId);
    }, [publicId]);

    const latest = useCallback(() => formRef.current, []);

    const restoreBackup = useCallback(() => {
        if (backup) edit(backup);
        setBackup(null);
    }, [backup, edit]);

    const discardBackup = useCallback(() => {
        clearBackup(publicId);
        setBackup(null);
    }, [publicId]);

    return { form, edit, replace, latest, flush, status, backup, restoreBackup, discardBackup };
}
```

- [ ] **Step 2: Typecheck**

Run (dari `linkify/`): `npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add linkify/src/components/portfolio/editor/use-portfolio-autosave.ts
git commit -m "feat(portfolio-editor): autosave hook with local backup"
```

---

### Task 4: Primitif field, menu, dan bar atas

**Files:**
- Create: `linkify/src/components/portfolio/editor/field.tsx`
- Create: `linkify/src/components/portfolio/editor/editor-nav.tsx`
- Create: `linkify/src/components/portfolio/editor/editor-bar.tsx`

**Interfaces:**
- Consumes: Task 1 (`EDITOR_SECTIONS`, `SectionSlug`, `CountedSlug`, `PublishState`), Task 3 (`AutosaveStatus`)
- Produces:
  - `inputClass: string`; `<Field label hint? error?>{control}</Field>`; `<SectionHeader title description>{toggles?}</SectionHeader>`; `<SectionToggle label checked onChange />`
  - `<EditorNav active completeness errorSection onSelect />`
  - `<EditorBar record state status busy canRewrite onPrimary onRewrite onRetry />`

- [ ] **Step 1: field.tsx**

```tsx
import { Switch } from "@/components/ui/switch";
import type { ReactNode } from "react";

export const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-body outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 aria-[invalid=true]:border-destructive";

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
    return (
        <label className="grid gap-1.5">
            <span className="text-[13px] font-semibold">{label}</span>
            {children}
            {error ? (
                <span role="alert" className="text-meta text-destructive">{error}</span>
            ) : hint ? (
                <span className="text-meta text-muted-foreground">{hint}</span>
            ) : null}
        </label>
    );
}

export function SectionToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <label className="flex items-center gap-2 text-meta text-muted-foreground">
            <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
            {label}
        </label>
    );
}

export function SectionHeader({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
    return (
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div className="max-w-xl">
                <h2 className="text-lg font-bold tracking-[-0.02em]">{title}</h2>
                <p className="mt-1 text-body text-muted-foreground">{description}</p>
            </div>
            {children && <div className="flex flex-col items-end gap-2">{children}</div>}
        </div>
    );
}
```

- [ ] **Step 2: editor-nav.tsx**

```tsx
"use client";

import { cn } from "@/utils";
import { Check } from "lucide-react";
import { EDITOR_SECTIONS, type CountedSlug, type SectionSlug } from "./editor-state";

type Props = {
    active: SectionSlug;
    completeness: Record<CountedSlug, boolean>;
    errorSection: SectionSlug | null;
    onSelect: (slug: SectionSlug) => void;
};

export function EditorNav({ active, completeness, errorSection, onSelect }: Props) {
    const done = Object.values(completeness).filter(Boolean).length;
    return (
        <nav aria-label="Bagian portfolio" className="min-w-0 lg:sticky lg:top-28 lg:self-start">
            <p className="hidden px-3 text-meta text-muted-foreground lg:block">{done} dari 6 lengkap</p>
            <ul className="flex snap-x gap-1 overflow-x-auto pb-1 lg:mt-3 lg:flex-col lg:overflow-visible lg:pb-0">
                {EDITOR_SECTIONS.map((section) => {
                    const isActive = section.slug === active;
                    const isError = errorSection === section.slug;
                    const isDone = section.counted && completeness[section.slug as CountedSlug];
                    return (
                        <li key={section.slug} className={cn("shrink-0 snap-start", section.slug === "tampilan" && "lg:mt-3 lg:border-t lg:border-border lg:pt-3")}>
                            <button
                                type="button"
                                aria-current={isActive ? "page" : undefined}
                                onClick={() => onSelect(section.slug)}
                                className={cn(
                                    "flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-body transition-colors",
                                    isActive ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                            >
                                <span>{section.label}</span>
                                {isError ? (
                                    <span className="font-bold text-destructive" aria-label="Ada kesalahan">!</span>
                                ) : section.counted ? (
                                    isDone ? (
                                        <Check className="size-4 text-emerald-600" aria-label="Lengkap" />
                                    ) : (
                                        <span className="size-1.5 rounded-full bg-amber-500" aria-label="Perlu diisi" />
                                    )
                                ) : null}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
```

- [ ] **Step 3: editor-bar.tsx**

```tsx
"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils";
import { MoreHorizontal } from "lucide-react";
import { toast } from "react-toastify";
import type { PortfolioRecord } from "../types";
import type { PublishState } from "./editor-state";
import type { AutosaveStatus } from "./use-portfolio-autosave";

type Props = {
    record: PortfolioRecord;
    state: PublishState;
    status: AutosaveStatus;
    busy: string | null;
    canRewrite: boolean;
    onPrimary: () => void;
    onRewrite: () => void;
    onRetry: () => void;
};

const STATE_LABEL: Record<PublishState, string> = {
    draft: "Draft",
    up_to_date: "Sudah publik",
    changed: "Sudah publik · Ada perubahan belum dipublikasikan",
};

function publicAddress(record: PortfolioRecord): string | null {
    if (record.status !== "published") return null;
    if (record.subdomain_url && record.subdomain_live) return record.subdomain_url;
    return record.public_url.startsWith("http") ? record.public_url : `${window.location.origin}${record.public_url}`;
}

export function EditorBar({ record, state, status, busy, canRewrite, onPrimary, onRewrite, onRetry }: Props) {
    const address = typeof window === "undefined" ? null : publicAddress(record);
    const blocked = busy !== null || status.state === "saving" || status.state === "error";
    const primaryLabel = busy === "publish" ? "Memproses…" : state === "draft" ? "Publikasikan" : state === "changed" ? "Perbarui publik" : "Sudah terbaru";

    const copy = async () => {
        if (!address) return;
        await navigator.clipboard.writeText(address);
        toast.success("Alamat portfolio disalin.");
    };

    return (
        <div className="sticky top-0 z-20 border-b border-border bg-background/95 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h1 className="text-xl font-bold tracking-[-0.02em]">Portfolio</h1>
                        <span className={cn("rounded-full px-2.5 py-0.5 text-meta font-semibold", state === "changed" ? "bg-amber-500/10 text-amber-700" : state === "up_to_date" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground")}>
                            {STATE_LABEL[state]}
                        </span>
                        <span role="status" className="text-meta text-muted-foreground">
                            {status.state === "saving" && "Menyimpan…"}
                            {status.state === "saved" && "Tersimpan"}
                            {status.state === "error" && (
                                <span className="text-destructive">
                                    Gagal menyimpan: {status.message}{" "}
                                    <button type="button" className="font-semibold underline" onClick={onRetry}>Coba lagi</button>
                                </span>
                            )}
                        </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 text-meta text-muted-foreground">
                        {address ? (
                            <>
                                <span className="truncate">{address.replace(/^https?:\/\//, "")}</span>
                                <button type="button" className="font-semibold hover:text-foreground" onClick={copy}>Salin</button>
                                <a className="font-semibold hover:text-foreground" href={address} target="_blank" rel="noreferrer">Pratinjau ↗</a>
                            </>
                        ) : (
                            <span>Belum dipublikasikan. Hanya kamu yang bisa melihat isinya.</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button type="button" aria-label="Aksi lain" className="rounded-lg border border-border p-2 transition hover:bg-muted">
                                <MoreHorizontal className="size-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem disabled={!canRewrite || busy !== null} onSelect={onRewrite}>
                                {busy === "rewrite" ? "Menulis ulang…" : "Tulis ulang dengan AI"}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                        type="button"
                        disabled={blocked || state === "up_to_date"}
                        onClick={onPrimary}
                        className="rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground transition hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {primaryLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 4: Verifikasi**

Run: `npx tsc --noEmit` → exit 0. Bila `DropdownMenuTrigger`/`DropdownMenuItem` tidak diekspor dari `components/ui/dropdown-menu.tsx`, cek blok `export {` di file itu dan pakai nama yang ada.

- [ ] **Step 5: Commit**

```bash
git add linkify/src/components/portfolio/editor/field.tsx linkify/src/components/portfolio/editor/editor-nav.tsx linkify/src/components/portfolio/editor/editor-bar.tsx
git commit -m "feat(portfolio-editor): nav, action bar, field primitives"
```

---

### Task 5: Delapan komponen bagian

**Files (semua Create, di `linkify/src/components/portfolio/editor/sections/`):**
`profile-section.tsx`, `projects-section.tsx`, `skills-section.tsx`, `experience-section.tsx`, `education-section.tsx`, `contacts-section.tsx`, `appearance-section.tsx`, `address-section.tsx`

**Interfaces:**
- Consumes: Task 1 (`EDITOR_SECTIONS`, `parseList`, `contactErrorKey`), Task 4 (`Field`, `SectionHeader`, `SectionToggle`, `inputClass`), helper yang ada (`getPhotoUploadCopy`, `getProjectSlots`, `getEligibleRepositories`, `appendRepositoriesToProjects`, `MAX_PORTFOLIO_PROJECTS`, `createEmptyExperience`, `createEmptyEducation`), `ThemePreviewCards`, `SubdomainCard`
- Produces: setiap bagian menerima `form: PortfolioContent` dan `onChange: (next: PortfolioContent) => void`, plus prop khusus yang tercantum di kode. `type EditorRepo` diekspor dari `projects-section.tsx`.

Tambahkan helper kecil di setiap file yang butuh deskripsi bagian:

```ts
const copy = (slug: SectionSlug) => EDITOR_SECTIONS.find((section) => section.slug === slug)!;
```

- [ ] **Step 1: profile-section.tsx**

```tsx
"use client";

import type { PortfolioContent } from "../../types";
import { getPhotoUploadCopy } from "../../portfolio-editor-helpers";
import { EDITOR_SECTIONS } from "../editor-state";
import { Field, inputClass, SectionHeader } from "../field";

const meta = EDITOR_SECTIONS.find((section) => section.slug === "profil")!;

type Props = {
    form: PortfolioContent;
    onChange: (next: PortfolioContent) => void;
    hasPhoto: boolean;
    photoBusy: boolean;
    onUploadPhoto: (file: File) => void;
    onRemovePhoto: () => void;
};

export function ProfileSection({ form, onChange, hasPhoto, photoBusy, onUploadPhoto, onRemovePhoto }: Props) {
    const photo = getPhotoUploadCopy(hasPhoto);
    return (
        <section>
            <SectionHeader title={meta.label} description={meta.description} />
            <div className="grid gap-5">
                <Field label="Nama">
                    <input className={inputClass} value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} />
                </Field>
                <Field label="Headline" hint="Satu kalimat, mis. Backend Engineer, Python dan FastAPI.">
                    <input className={inputClass} value={form.headline} onChange={(event) => onChange({ ...form, headline: event.target.value })} />
                </Field>
                <Field label="Tentang saya">
                    <textarea rows={6} className={`${inputClass} resize-y`} value={form.bio} onChange={(event) => onChange({ ...form, bio: event.target.value })} />
                </Field>
                <div className="grid gap-2">
                    <Field label={photo.label} hint={photo.help}>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={photoBusy}
                            className="text-body file:mr-3 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:py-2 file:text-[13px] file:font-semibold"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) onUploadPhoto(file);
                                event.target.value = "";
                            }}
                        />
                    </Field>
                    {hasPhoto && (
                        <button type="button" disabled={photoBusy} onClick={onRemovePhoto} className="justify-self-start text-meta font-semibold text-destructive disabled:opacity-50">
                            Hapus foto
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}
```

- [ ] **Step 2: projects-section.tsx**

```tsx
"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import type { PortfolioContent } from "../../types";
import { appendRepositoriesToProjects, getEligibleRepositories, getProjectSlots, MAX_PORTFOLIO_PROJECTS } from "../../portfolio-editor-helpers";
import { EDITOR_SECTIONS } from "../editor-state";
import { inputClass, SectionHeader, SectionToggle } from "../field";

const meta = EDITOR_SECTIONS.find((section) => section.slug === "proyek")!;

export type EditorRepo = {
    name: string;
    html_url: string;
    stars?: number;
    own_commits?: number;
    languages?: Record<string, number>;
};

type Props = {
    form: PortfolioContent;
    onChange: (next: PortfolioContent) => void;
    repos: EditorRepo[];
    onRemove: (index: number) => void;
};

const secondary = "rounded-lg border border-border px-3 py-2 text-[13px] font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

export function ProjectsSection({ form, onChange, repos, onRemove }: Props) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pending, setPending] = useState<string[]>([]);
    const slots = getProjectSlots(form.projects);
    const eligible = getEligibleRepositories(repos, form.projects);
    const pendingRepos = eligible.filter((repo) => pending.includes(repo.name));

    const close = () => {
        setPending([]);
        setPickerOpen(false);
    };
    const toggle = (name: string) => setPending((current) => {
        if (current.includes(name)) return current.filter((item) => item !== name);
        return current.length < slots ? [...current, name] : current;
    });
    const add = () => {
        if (pendingRepos.length === 0) return;
        onChange({ ...form, projects: appendRepositoriesToProjects(form.projects, pendingRepos) });
        close();
    };

    return (
        <section>
            <SectionHeader title={meta.label} description={meta.description}>
                <SectionToggle label="Tampilkan di portfolio" checked={form.sections.projects} onChange={(checked) => onChange({ ...form, sections: { ...form.sections, projects: checked } })} />
            </SectionHeader>
            <div className="grid gap-4">
                {form.projects.map((project, index) => (
                    <div key={project.repo_name} className="rounded-xl border border-border p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <a href={project.url} target="_blank" rel="noreferrer" className="font-semibold hover:text-primary">{project.repo_name} ↗</a>
                                <p className="mt-0.5 text-meta text-muted-foreground">
                                    {[project.tech_stack.slice(0, 4).join(", "), `★ ${project.stars}`, `${project.own_commits} commit`].filter(Boolean).join(" · ")}
                                </p>
                            </div>
                            <button type="button" className="shrink-0 text-meta font-semibold text-destructive" onClick={() => onRemove(index)}>Hapus</button>
                        </div>
                        <textarea
                            rows={3}
                            aria-label={`Deskripsi ${project.repo_name}`}
                            className={`${inputClass} mt-3 resize-y`}
                            value={project.description}
                            onChange={(event) => onChange({
                                ...form,
                                projects: form.projects.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item),
                            })}
                        />
                    </div>
                ))}
                {form.projects.length === 0 && <p className="text-body text-muted-foreground">Belum ada proyek. Tambahkan dari repository GitHub-mu.</p>}
            </div>
            <div className="mt-4 flex items-center gap-3">
                <button type="button" className={secondary} disabled={slots === 0} onClick={() => setPickerOpen(true)}>+ Tambah proyek dari GitHub</button>
                <span className="text-meta text-muted-foreground">{form.projects.length} dari {MAX_PORTFOLIO_PROJECTS}</span>
            </div>

            <Dialog open={pickerOpen} onOpenChange={(open) => (open ? setPickerOpen(true) : close())}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tambah proyek dari GitHub</DialogTitle>
                        <DialogDescription>Tersisa {slots} dari {MAX_PORTFOLIO_PROJECTS} slot</DialogDescription>
                    </DialogHeader>
                    {eligible.length === 0 ? (
                        <p className="py-4 text-sm text-muted-foreground">Semua repository yang tersedia sudah ditambahkan ke portfolio.</p>
                    ) : (
                        <div className="max-h-80 divide-y divide-border overflow-y-auto border-y border-border">
                            {eligible.map((repo) => {
                                const selected = pending.includes(repo.name);
                                const disabled = !selected && pending.length >= slots;
                                const languages = Object.keys(repo.languages ?? {});
                                return (
                                    <label key={repo.name} className={`flex items-start gap-3 py-3 text-sm ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                                        <input type="checkbox" className="mt-0.5" checked={selected} disabled={disabled} onChange={() => toggle(repo.name)} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-medium">{repo.name}</span>
                                            <span className="mt-1 block text-xs text-muted-foreground">{languages.length ? languages.join(", ") : "Bahasa tidak terdeteksi"} · ★ {repo.stars ?? 0} · {repo.own_commits ?? 0} commit</span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                    <DialogFooter>
                        <button type="button" className={secondary} onClick={close}>Batal</button>
                        <button type="button" className="rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50" disabled={pendingRepos.length === 0} onClick={add}>
                            Tambah {pendingRepos.length} proyek
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
```

- [ ] **Step 3: skills-section.tsx** (teks mentah disimpan lokal supaya koma tidak hilang saat mengetik)

```tsx
"use client";

import { useState } from "react";
import type { PortfolioContent } from "../../types";
import { EDITOR_SECTIONS, parseList } from "../editor-state";
import { Field, inputClass, SectionHeader, SectionToggle } from "../field";

const meta = EDITOR_SECTIONS.find((section) => section.slug === "skill")!;

type Props = { form: PortfolioContent; onChange: (next: PortfolioContent) => void };

export function SkillsSection({ form, onChange }: Props) {
    const [skillsText, setSkillsText] = useState(form.skills.join(", "));
    const [certText, setCertText] = useState(form.certifications.join(", "));
    return (
        <section>
            <SectionHeader title={meta.label} description={meta.description} />
            <div className="grid gap-8">
                <div className="grid gap-3">
                    <SectionToggle label="Tampilkan skill di portfolio" checked={form.sections.skills} onChange={(checked) => onChange({ ...form, sections: { ...form.sections, skills: checked } })} />
                    <Field label="Skill" hint="Contoh: Python, FastAPI, PostgreSQL">
                        <input className={inputClass} value={skillsText} onChange={(event) => {
                            setSkillsText(event.target.value);
                            onChange({ ...form, skills: parseList(event.target.value, 50) });
                        }} />
                    </Field>
                </div>
                <div className="grid gap-3">
                    <SectionToggle label="Tampilkan sertifikasi di portfolio" checked={form.sections.certifications} onChange={(checked) => onChange({ ...form, sections: { ...form.sections, certifications: checked } })} />
                    <Field label="Sertifikasi" hint="Contoh: AWS Cloud Practitioner, Dicoding Back-End Python">
                        <input className={inputClass} value={certText} onChange={(event) => {
                            setCertText(event.target.value);
                            onChange({ ...form, certifications: parseList(event.target.value, 30) });
                        }} />
                    </Field>
                </div>
            </div>
        </section>
    );
}
```

- [ ] **Step 4: experience-section.tsx** (key berdasarkan index supaya fokus tidak lepas saat mengetik)

```tsx
"use client";

import type { PortfolioContent, PortfolioExperience } from "../../types";
import { createEmptyExperience } from "../../portfolio-editor-helpers";
import { EDITOR_SECTIONS } from "../editor-state";
import { Field, inputClass, SectionHeader, SectionToggle } from "../field";

const meta = EDITOR_SECTIONS.find((section) => section.slug === "pengalaman")!;

type Props = { form: PortfolioContent; onChange: (next: PortfolioContent) => void; onRemove: (index: number) => void };

export function ExperienceSection({ form, onChange, onRemove }: Props) {
    const update = (index: number, patch: Partial<PortfolioExperience>) => onChange({
        ...form,
        experience: form.experience.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    });
    return (
        <section>
            <SectionHeader title={meta.label} description={meta.description}>
                <SectionToggle label="Tampilkan di portfolio" checked={form.sections.experience} onChange={(checked) => onChange({ ...form, sections: { ...form.sections, experience: checked } })} />
            </SectionHeader>
            <div className="grid gap-4">
                {form.experience.map((item, index) => (
                    <div key={index} className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
                        <Field label="Peran"><input className={inputClass} value={item.role ?? ""} onChange={(event) => update(index, { role: event.target.value })} /></Field>
                        <Field label="Perusahaan atau organisasi"><input className={inputClass} value={item.company ?? ""} onChange={(event) => update(index, { company: event.target.value })} /></Field>
                        <Field label="Periode" hint="Contoh: Jan 2026 - sekarang"><input className={inputClass} value={item.period ?? ""} onChange={(event) => update(index, { period: event.target.value })} /></Field>
                        <div className="flex items-end justify-end">
                            <button type="button" className="text-meta font-semibold text-destructive" onClick={() => onRemove(index)}>Hapus pengalaman</button>
                        </div>
                    </div>
                ))}
                {form.experience.length === 0 && <p className="text-body text-muted-foreground">Belum ada pengalaman. Boleh dikosongkan dan disembunyikan.</p>}
            </div>
            <button type="button" className="mt-4 rounded-lg border border-border px-3 py-2 text-[13px] font-semibold transition hover:bg-muted" onClick={() => onChange({ ...form, experience: [...form.experience, createEmptyExperience()] })}>
                + Tambah pengalaman
            </button>
        </section>
    );
}
```

- [ ] **Step 5: education-section.tsx**

```tsx
"use client";

import type { PortfolioContent, PortfolioEducation } from "../../types";
import { createEmptyEducation } from "../../portfolio-editor-helpers";
import { EDITOR_SECTIONS } from "../editor-state";
import { Field, inputClass, SectionHeader, SectionToggle } from "../field";

const meta = EDITOR_SECTIONS.find((section) => section.slug === "pendidikan")!;

type Props = { form: PortfolioContent; onChange: (next: PortfolioContent) => void; onRemove: (index: number) => void };

export function EducationSection({ form, onChange, onRemove }: Props) {
    const update = (index: number, patch: Partial<PortfolioEducation>) => onChange({
        ...form,
        education: form.education.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    });
    return (
        <section>
            <SectionHeader title={meta.label} description={meta.description}>
                <SectionToggle label="Tampilkan di portfolio" checked={form.sections.education} onChange={(checked) => onChange({ ...form, sections: { ...form.sections, education: checked } })} />
            </SectionHeader>
            <div className="grid gap-4">
                {form.education.map((item, index) => (
                    <div key={index} className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
                        <Field label="Institusi"><input className={inputClass} value={item.institution ?? ""} onChange={(event) => update(index, { institution: event.target.value })} /></Field>
                        <Field label="Gelar atau jenjang"><input className={inputClass} value={item.degree ?? ""} onChange={(event) => update(index, { degree: event.target.value })} /></Field>
                        <Field label="Jurusan"><input className={inputClass} value={item.major ?? ""} onChange={(event) => update(index, { major: event.target.value })} /></Field>
                        <div className="flex items-end justify-end">
                            <button type="button" className="text-meta font-semibold text-destructive" onClick={() => onRemove(index)}>Hapus pendidikan</button>
                        </div>
                    </div>
                ))}
                {form.education.length === 0 && <p className="text-body text-muted-foreground">Belum ada pendidikan.</p>}
            </div>
            <button type="button" className="mt-4 rounded-lg border border-border px-3 py-2 text-[13px] font-semibold transition hover:bg-muted" onClick={() => onChange({ ...form, education: [...form.education, createEmptyEducation()] })}>
                + Tambah pendidikan
            </button>
        </section>
    );
}
```

- [ ] **Step 6: contacts-section.tsx**

```tsx
"use client";

import { Switch } from "@/components/ui/switch";
import type { PortfolioContacts, PortfolioContent } from "../../types";
import { contactErrorKey, EDITOR_SECTIONS } from "../editor-state";
import { inputClass, SectionHeader } from "../field";

const meta = EDITOR_SECTIONS.find((section) => section.slug === "kontak")!;

const CONTACTS: Array<{ key: keyof PortfolioContacts; label: string; placeholder: string }> = [
    { key: "github", label: "GitHub", placeholder: "https://github.com/username" },
    { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/username" },
    { key: "email", label: "Email", placeholder: "nama@email.com" },
    { key: "whatsapp", label: "WhatsApp", placeholder: "628123456789" },
    { key: "website", label: "Website", placeholder: "https://namamu.dev" },
];

type Props = { form: PortfolioContent; onChange: (next: PortfolioContent) => void; errorMessage: string | null };

export function ContactsSection({ form, onChange, errorMessage }: Props) {
    const errorKey = contactErrorKey(errorMessage);
    const update = (key: keyof PortfolioContacts, patch: Partial<PortfolioContacts[keyof PortfolioContacts]>) => onChange({
        ...form,
        contacts: { ...form.contacts, [key]: { ...form.contacts[key], ...patch } },
    });
    return (
        <section>
            <SectionHeader title={meta.label} description={meta.description} />
            <div className="grid gap-5">
                {CONTACTS.map(({ key, label, placeholder }) => {
                    const invalid = errorKey === key;
                    return (
                        <div key={key} className="grid gap-1.5">
                            <div className="flex items-center justify-between gap-3">
                                <label htmlFor={`contact-${key}`} className="text-[13px] font-semibold">{label}</label>
                                <label className="flex items-center gap-2 text-meta text-muted-foreground">
                                    <Switch checked={form.contacts[key].enabled} onCheckedChange={(checked) => update(key, { enabled: checked })} aria-label={`Tampilkan ${label}`} />
                                    Tampilkan
                                </label>
                            </div>
                            <input
                                id={`contact-${key}`}
                                aria-invalid={invalid}
                                className={inputClass}
                                placeholder={placeholder}
                                value={form.contacts[key].value}
                                onChange={(event) => update(key, { value: event.target.value })}
                            />
                            {invalid && <span role="alert" className="text-meta text-destructive">{errorMessage}</span>}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
```

- [ ] **Step 7: appearance-section.tsx**

```tsx
"use client";

import { cn } from "@/utils";
import { ThemePreviewCards } from "../../theme-preview-cards";
import type { PortfolioContent, PortfolioLanguage } from "../../types";
import { EDITOR_SECTIONS } from "../editor-state";
import { SectionHeader } from "../field";

const meta = EDITOR_SECTIONS.find((section) => section.slug === "tampilan")!;
const LANGUAGES: Array<{ value: PortfolioLanguage; label: string }> = [
    { value: "id", label: "Bahasa Indonesia" },
    { value: "en", label: "English" },
];

type Props = { form: PortfolioContent; onChange: (next: PortfolioContent) => void };

export function AppearanceSection({ form, onChange }: Props) {
    return (
        <section>
            <SectionHeader title={meta.label} description={meta.description} />
            <div className="grid gap-8">
                <div>
                    <p className="text-[13px] font-semibold">Tema</p>
                    <ThemePreviewCards content={form} onSelect={(theme) => onChange({ ...form, theme })} />
                </div>
                <div>
                    <p className="text-[13px] font-semibold">Bahasa label portfolio</p>
                    <div role="radiogroup" aria-label="Bahasa portfolio" className="mt-2 inline-flex rounded-full border border-border bg-muted/50 p-1">
                        {LANGUAGES.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                role="radio"
                                aria-checked={form.language === item.value}
                                onClick={() => onChange({ ...form, language: item.value })}
                                className={cn("rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors", form.language === item.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
```

- [ ] **Step 8: address-section.tsx**

```tsx
"use client";

import { SubdomainCard } from "../../subdomain-card";
import type { PortfolioRecord } from "../../types";
import { EDITOR_SECTIONS } from "../editor-state";
import { SectionHeader } from "../field";

const meta = EDITOR_SECTIONS.find((section) => section.slug === "alamat")!;

type Props = { record: PortfolioRecord; suggestion: string | null; busy: boolean; onUnpublish: () => void };

export function AddressSection({ record, suggestion, busy, onUnpublish }: Props) {
    return (
        <section>
            <SectionHeader title={meta.label} description={meta.description} />
            <div className="max-w-md">
                <SubdomainCard portfolio={record} suggestion={suggestion} />
            </div>
            {record.status === "published" && (
                <div className="mt-10 max-w-md rounded-xl border border-destructive/30 p-4">
                    <p className="text-[13px] font-semibold text-destructive">Zona berbahaya</p>
                    <p className="mt-1 text-meta text-muted-foreground">Portfolio tidak bisa dibuka publik sampai kamu mempublikasikannya lagi. Alamatmu tetap milikmu.</p>
                    <button type="button" disabled={busy} onClick={onUnpublish} className="mt-3 rounded-lg border border-destructive/40 px-3 py-2 text-[13px] font-semibold text-destructive transition hover:bg-destructive/5 disabled:opacity-50">
                        Sembunyikan dari publik
                    </button>
                </div>
            )}
        </section>
    );
}
```

- [ ] **Step 9: Verifikasi dan commit**

Run: `npx tsc --noEmit` → exit 0

```bash
git add linkify/src/components/portfolio/editor/sections
git commit -m "feat(portfolio-editor): section components"
```

---

### Task 6: Workspace dan editor baru

**Files:**
- Create: `linkify/src/components/portfolio/editor/editor-workspace.tsx`
- Modify (tulis ulang): `linkify/src/components/portfolio/portfolio-editor.tsx`
- Modify: `linkify/src/app/(main)/dashboard/portfolio/page.tsx`

**Interfaces:**
- Consumes: Task 1-5
- Produces: `<EditorWorkspace record profile />` dengan `type EditorProfile = { github_signals: { repos_detail?: EditorRepo[] } | null; github_username?: string | null }`

- [ ] **Step 1: editor-workspace.tsx**

```tsx
"use client";

import { useApi } from "@/hooks/use-api";
import { confirmDestructive } from "@/lib/confirm";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "react-toastify";
import { canRestoreProject, createOneShotUndo, mergeAiCopy, restoreAt, transitionDraftRemoval } from "../portfolio-editor-helpers";
import type { PortfolioRecord } from "../types";
import { EditorBar } from "./editor-bar";
import { EditorNav } from "./editor-nav";
import { parseSection, publishState, sectionCompleteness, type SectionSlug } from "./editor-state";
import { AddressSection } from "./sections/address-section";
import { AppearanceSection } from "./sections/appearance-section";
import { ContactsSection } from "./sections/contacts-section";
import { EducationSection } from "./sections/education-section";
import { ExperienceSection } from "./sections/experience-section";
import { ProfileSection } from "./sections/profile-section";
import { ProjectsSection, type EditorRepo } from "./sections/projects-section";
import { SkillsSection } from "./sections/skills-section";
import { usePortfolioAutosave } from "./use-portfolio-autosave";

export type EditorProfile = { github_signals: { repos_detail?: EditorRepo[] } | null; github_username?: string | null };

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi.");

export function EditorWorkspace({ record, profile }: { record: PortfolioRecord; profile: EditorProfile }) {
    const { withAuth } = useApi();
    const queryClient = useQueryClient();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const section = parseSection(searchParams.get("bagian"));
    const { form, edit, replace, latest, flush, status, backup, restoreBackup, discardBackup } = usePortfolioAutosave(record);
    const [busy, setBusy] = useState<string | null>(null);
    const [photoChanged, setPhotoChanged] = useState(false);
    const state = publishState(record, { photoChanged });
    const repos = profile.github_signals?.repos_detail ?? [];

    const goTo = (slug: SectionSlug) => {
        void flush();
        router.replace(`${pathname}?bagian=${slug}`, { scroll: false });
    };

    /** Aksi eksplisit: simpan dulu perubahan tertunda, panggil API, lalu isi form dari server. */
    const act = async (key: string, request: () => Promise<PortfolioRecord>, success: string) => {
        setBusy(key);
        try {
            if (!(await flush())) {
                toast.error("Perubahan belum tersimpan. Perbaiki dulu, lalu coba lagi.");
                return null;
            }
            const result = await request();
            queryClient.setQueryData(["portfolio"], result);
            if (result.draft_content) replace(result.draft_content);
            toast.success(success);
            return result;
        } catch (error) {
            toast.error(errorText(error));
            return null;
        } finally {
            setBusy(null);
        }
    };

    const primary = async () => {
        const done = state === "draft"
            ? await act("publish", () => withAuth<PortfolioRecord>("/me/portfolio/publish", { method: "POST" }), "Portfolio dipublikasikan.")
            : await act("publish", () => withAuth<PortfolioRecord>("/me/portfolio", {
                method: "PATCH",
                body: JSON.stringify({ ...latest(), ai_enhanced: undefined, save_mode: "publish" }),
            }), "Portfolio publik diperbarui.");
        if (done) setPhotoChanged(false);
    };

    const uploadPhoto = async (file: File) => {
        const data = new FormData();
        data.append("photo", file);
        data.append("save_mode", "draft");
        if (await act("photo", () => withAuth<PortfolioRecord>("/me/portfolio/photo", { method: "POST", body: data }), "Foto tersimpan.")) setPhotoChanged(true);
    };

    const removePhoto = async () => {
        const confirmed = await confirmDestructive({ title: "Hapus foto?", text: "Foto perlu diunggah ulang jika ingin dipakai lagi.", confirmText: "Ya, hapus foto" });
        if (!confirmed) return;
        if (await act("photo", () => withAuth<PortfolioRecord>("/me/portfolio/photo", { method: "DELETE" }), "Foto dihapus.")) setPhotoChanged(true);
    };

    const unpublish = async () => {
        const confirmed = await confirmDestructive({
            title: "Sembunyikan portfolio dari publik?",
            text: "Portfolio tidak bisa dibuka publik sampai kamu mempublikasikannya lagi.",
            confirmText: "Ya, sembunyikan",
        });
        if (!confirmed) return;
        await act("unpublish", () => withAuth<PortfolioRecord>("/me/portfolio/unpublish", { method: "POST" }), "Portfolio disembunyikan dari publik.");
    };

    const rewriteWithAi = async () => {
        const confirmed = await confirmDestructive({
            title: "Tulis ulang dengan AI?",
            text: "Headline, tentang saya, dan deskripsi proyek diganti hasil AI terbaru. Tema, kontak, pengalaman, dan isian lain tetap.",
            confirmText: "Ya, tulis ulang",
        });
        if (!confirmed) return;
        setBusy("rewrite");
        try {
            if (!(await flush())) {
                toast.error("Perubahan belum tersimpan. Perbaiki dulu, lalu coba lagi.");
                return;
            }
            const current = latest();
            const generated = await withAuth<PortfolioRecord>("/me/portfolio/generate", {
                method: "POST",
                body: JSON.stringify({ language: current.language, repo_names: current.projects.map((project) => project.repo_name) }),
            });
            // Generate menimpa draft di server; simpan kembali draft user + copy AI (atau draft utuh jika AI gagal).
            const fresh = generated.draft_content;
            const aiEnhanced = Boolean(fresh?.ai_enhanced);
            const next = fresh && aiEnhanced ? mergeAiCopy(current, fresh) : current;
            const saved = await withAuth<PortfolioRecord>("/me/portfolio", {
                method: "PATCH",
                body: JSON.stringify({ ...next, ai_enhanced: undefined, save_mode: "draft" }),
            });
            queryClient.setQueryData(["portfolio"], saved);
            if (saved.draft_content) replace(saved.draft_content);
            if (aiEnhanced) toast.success("Teks AI diperbarui. Periksa sebelum dipublikasikan.");
            else toast.warn("AI sedang tidak tersedia. Draft tidak diubah.");
        } catch (error) {
            toast.error(errorText(error));
        } finally {
            setBusy(null);
        }
    };

    const showUndoToast = (message: string, undo: () => void) => {
        const toastId = "portfolio-editor-undo";
        toast.dismiss(toastId);
        toast.success(({ closeToast }) => (
            <div className="flex items-center justify-between gap-3">
                <span>{message}</span>
                <button type="button" className="font-semibold underline" onClick={() => { undo(); closeToast(); }}>Urungkan</button>
            </div>
        ), { toastId, autoClose: 5000, closeOnClick: false, closeButton: false, draggable: false });
    };

    const removeProject = (index: number) => {
        const current = latest();
        const removal = transitionDraftRemoval(current, "projects", index);
        if (!removal) return;
        const originalMatchingCount = current.projects.filter((project) => project.repo_name === removal.removed.repo_name).length;
        const claimUndo = createOneShotUndo();
        edit(removal.draft);
        showUndoToast("Proyek dihapus.", () => {
            if (!claimUndo()) return;
            const now = latest();
            if (!canRestoreProject(now.projects, removal.removed, originalMatchingCount)) return;
            edit({ ...now, projects: restoreAt(now.projects, removal.removed, removal.index) });
        });
    };

    const removeExperience = (index: number) => {
        const removal = transitionDraftRemoval(latest(), "experience", index);
        if (!removal) return;
        const claimUndo = createOneShotUndo();
        edit(removal.draft);
        showUndoToast("Pengalaman dihapus.", () => {
            if (!claimUndo()) return;
            const now = latest();
            edit({ ...now, experience: restoreAt(now.experience, removal.removed, removal.index) });
        });
    };

    const removeEducation = (index: number) => {
        const removal = transitionDraftRemoval(latest(), "education", index);
        if (!removal) return;
        const claimUndo = createOneShotUndo();
        edit(removal.draft);
        showUndoToast("Pendidikan dihapus.", () => {
            if (!claimUndo()) return;
            const now = latest();
            edit({ ...now, education: restoreAt(now.education, removal.removed, removal.index) });
        });
    };

    const content = (() => {
        switch (section) {
            case "proyek":
                return <ProjectsSection form={form} onChange={edit} repos={repos} onRemove={removeProject} />;
            case "skill":
                return <SkillsSection form={form} onChange={edit} />;
            case "pengalaman":
                return <ExperienceSection form={form} onChange={edit} onRemove={removeExperience} />;
            case "pendidikan":
                return <EducationSection form={form} onChange={edit} onRemove={removeEducation} />;
            case "kontak":
                return <ContactsSection form={form} onChange={edit} errorMessage={status.section === "kontak" ? status.message ?? null : null} />;
            case "tampilan":
                return <AppearanceSection form={form} onChange={edit} />;
            case "alamat":
                return <AddressSection record={record} suggestion={profile.github_username ?? null} busy={busy !== null} onUnpublish={unpublish} />;
            default:
                return <ProfileSection form={form} onChange={edit} hasPhoto={record.has_photo} photoBusy={busy === "photo"} onUploadPhoto={uploadPhoto} onRemovePhoto={removePhoto} />;
        }
    })();

    return (
        <div className="w-full" onBlurCapture={() => void flush()}>
            <EditorBar
                record={record}
                state={state}
                status={status}
                busy={busy}
                canRewrite={form.projects.length > 0}
                onPrimary={primary}
                onRewrite={rewriteWithAi}
                onRetry={() => void flush()}
            />
            {backup && (
                <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-body">
                    <span>Ada perubahan yang belum tersimpan dari sesi sebelumnya.</span>
                    <span className="flex gap-3">
                        <button type="button" className="font-semibold text-primary" onClick={restoreBackup}>Pulihkan</button>
                        <button type="button" className="font-semibold text-muted-foreground" onClick={discardBackup}>Buang</button>
                    </span>
                </div>
            )}
            <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
                <EditorNav active={section} completeness={sectionCompleteness(form)} errorSection={status.section} onSelect={goTo} />
                <div className="min-w-0 max-w-3xl">{content}</div>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Tulis ulang portfolio-editor.tsx**

Ganti seluruh isi `linkify/src/components/portfolio/portfolio-editor.tsx`. Bagian loading, layar belum siap, dan layar generate dipertahankan dari versi lama (logika sama, copy dirapikan); editor diganti `EditorWorkspace`:

```tsx
"use client";

import { EmptyState, PageHeader, SecTitle } from "@/components/dashboard/ui";
import { useApi } from "@/hooks/use-api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { EditorWorkspace, type EditorProfile } from "./editor/editor-workspace";
import { MAX_PORTFOLIO_PROJECTS, rankRepositories } from "./portfolio-editor-helpers";
import type { PortfolioLanguage, PortfolioRecord } from "./types";

type Profile = EditorProfile & {
    cv_data: Record<string, unknown> | null;
    github_connection?: "verified" | "legacy_unverified" | "none";
};

export function PortfolioEditor() {
    const { withAuth, authReady } = useApi();
    const queryClient = useQueryClient();
    const [language, setLanguage] = useState<PortfolioLanguage>("id");
    const [repoNames, setRepoNames] = useState<string[]>([]);
    const [generating, setGenerating] = useState(false);

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ["profile"],
        queryFn: () => withAuth<Profile | null>("/me/profile"),
        enabled: authReady,
    });
    const { data: portfolio, isLoading: portfolioLoading } = useQuery({
        queryKey: ["portfolio"],
        queryFn: () => withAuth<PortfolioRecord | null>("/me/portfolio"),
        enabled: authReady,
    });

    const repos = useMemo(() => profile?.github_signals?.repos_detail ?? [], [profile]);
    const rankedRepos = useMemo(() => rankRepositories(repos), [repos]);

    // Default hanya sekali; tanpa ref ini, melepas semua centang langsung memilih ulang 6 repo.
    const repoDefaultsApplied = useRef(false);
    useEffect(() => {
        if (repoDefaultsApplied.current || !rankedRepos.length) return;
        repoDefaultsApplied.current = true;
        setRepoNames(rankedRepos.slice(0, MAX_PORTFOLIO_PROJECTS).map((repo) => repo.name));
    }, [rankedRepos]);

    const toggleRepo = (name: string) => {
        setRepoNames((current) => current.includes(name)
            ? current.filter((item) => item !== name)
            : current.length < MAX_PORTFOLIO_PROJECTS ? [...current, name] : current);
    };

    const generate = async () => {
        setGenerating(true);
        try {
            const result = await withAuth<PortfolioRecord>("/me/portfolio/generate", {
                method: "POST",
                body: JSON.stringify({ language, repo_names: repoNames }),
            });
            queryClient.setQueryData(["portfolio"], result);
            toast.success("Draft portfolio berhasil dibuat.");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi.");
        } finally {
            setGenerating(false);
        }
    };

    if (profileLoading || portfolioLoading) {
        return <div className="h-48 animate-pulse rounded-md bg-muted/40" />;
    }

    if (!profile?.cv_data || !profile.github_signals) {
        const needsGithub = (profile?.github_connection ?? "none") === "none";
        return (
            <div className="w-full">
                <PageHeader crumb="dasbor / portfolio" title="Portfolio saya" />
                <div className="pt-8">
                    <EmptyState title={needsGithub ? "Hubungkan GitHub dulu" : "CV belum lengkap"}>
                        {needsGithub
                            ? "Portfolio dibangun dari repo GitHub-mu. Hubungkan GitHub lalu upload CV. "
                            : "Upload CV terlebih dahulu. "}
                        <Link className="font-semibold text-primary hover:underline" href="/dashboard/onboarding">Buka Data GitHub & CV →</Link>
                    </EmptyState>
                </div>
            </div>
        );
    }

    if (!portfolio?.draft_content) {
        const choice = "rounded-lg border border-border px-3 py-2 text-[13px] font-semibold transition hover:bg-muted";
        return (
            <div className="w-full max-w-3xl">
                <PageHeader crumb="dasbor / portfolio" title="Buat portfolio publik" sub="Pilih bahasa dan maksimal enam repository. AI menyiapkan draft yang wajib kamu periksa sebelum dipublikasikan." />
                <section className="pt-8">
                    <SecTitle title="Bahasa portfolio" />
                    <div className="mt-3 flex gap-2">
                        {(["id", "en"] as PortfolioLanguage[]).map((value) => (
                            <button key={value} type="button" onClick={() => setLanguage(value)} className={`${choice} ${language === value ? "border-primary bg-primary/10 text-primary" : ""}`}>
                                {value === "id" ? "Bahasa Indonesia" : "English"}
                            </button>
                        ))}
                    </div>
                </section>
                <section className="pt-8">
                    <SecTitle title="Proyek unggulan" meta={`${repoNames.length}/6 dipilih`} />
                    <div className="mt-3 divide-y divide-border border-y border-border">
                        {rankedRepos.map((repo) => {
                            const disabled = !repoNames.includes(repo.name) && repoNames.length >= MAX_PORTFOLIO_PROJECTS;
                            return (
                                <label key={repo.name} className={`flex items-center gap-3 py-3 text-sm ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
                                    <input type="checkbox" checked={repoNames.includes(repo.name)} onChange={() => toggleRepo(repo.name)} disabled={disabled} />
                                    <span className="min-w-0 flex-1 truncate font-medium">{repo.name}</span>
                                    <span className="font-mono text-meta text-muted-foreground">★ {repo.stars ?? 0} · {repo.own_commits ?? 0} commit</span>
                                </label>
                            );
                        })}
                    </div>
                    <button type="button" className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50" disabled={generating || repoNames.length === 0} onClick={generate}>
                        {generating ? "Menyusun draft…" : "Buat draft portfolio"}
                    </button>
                </section>
            </div>
        );
    }

    return <EditorWorkspace key={portfolio.public_id} record={portfolio} profile={profile} />;
}
```

- [ ] **Step 3: Suspense di page**

Replace `linkify/src/app/(main)/dashboard/portfolio/page.tsx`:

```tsx
import { PortfolioEditor } from "@/components/portfolio/portfolio-editor";
import { Suspense } from "react";

export default function PortfolioPage() {
    // useSearchParams (bagian aktif editor) butuh Suspense boundary di Next 14.
    return (
        <Suspense fallback={<div className="h-48 animate-pulse rounded-md bg-muted/40" />}>
            <PortfolioEditor />
        </Suspense>
    );
}
```

- [ ] **Step 4: Verifikasi**

Run (dari `linkify/`):
- `npx tsc --noEmit` → exit 0
- `npx eslint src/components/portfolio src/app/(main)/dashboard/portfolio` → tanpa error
- `node --test tests/*.test.mts` → semua pass
- `grep -rn "—" src/components/portfolio/editor` → tidak ada output
- Hentikan server di port 3100 bila ada, lalu `NEXT_PUBLIC_API_URL=https://githire.up.railway.app npx next build` → sukses, `/dashboard/portfolio` tetap terdaftar

- [ ] **Step 5: Commit**

```bash
git add linkify/src/components/portfolio linkify/src/app/(main)/dashboard/portfolio/page.tsx
git commit -m "feat(portfolio-editor): sidebar editor with autosave"
```

---

### Task 7: Deploy dan cek manual (butuh persetujuan user)

- [ ] **Step 1:** Minta persetujuan push. Setelah disetujui: `git push origin master`, tunggu status commit Vercel `success`.
- [ ] **Step 2:** `curl -s -o /dev/null -w "%{http_code}\n" https://www.githire.my.id/dashboard/portfolio` → `404` untuk pengunjung tanpa login (perilaku Clerk, sama seperti sebelumnya), dan landing `/` tetap 200.
- [ ] **Step 3:** Minta user mengecek di production (butuh login):
  1. Pindah antar bagian; URL berubah `?bagian=...`; refresh tetap di bagian yang sama.
  2. Ketik di Profil, tunggu: status "Menyimpan…" lalu "Tersimpan".
  3. Skill: ketik "Python, React" huruf demi huruf; koma tidak hilang.
  4. Pengalaman: ketik nama perusahaan; kursor tidak lepas.
  5. Kontak: isi WhatsApp "abc" dan nyalakan; muncul "Gagal menyimpan: Kontak whatsapp tidak valid." + Coba lagi, item Kontak bertanda !; perbaiki, status kembali "Tersimpan".
  6. Tombol utama: "Perbarui publik" setelah ada perubahan, lalu "Sudah terbaru".
  7. Pratinjau membuka alamat publik.
  8. Ketik lalu tutup tab dalam 1 detik, buka lagi: banner "Pulihkan".
  9. Tampilan HP: menu menjadi tab yang bisa digeser.

## Self-Review

- Spec "Tata letak" → Task 4 (bar, nav), Task 6 (grid, banner, Suspense). URL `?bagian=` + `router.replace` → Task 6.
- Spec "Bagian" (8 bagian, toggle per bagian, Zona berbahaya) → Task 5.
- Spec "Kelengkapan" → Task 1 + Task 4 nav.
- Spec "Simpan otomatis" (debounce, blur, ganti bagian, antrian, error + bagian, Coba lagi, cadangan, beforeunload, respons tidak menimpa form) → Task 2, Task 3, Task 6 (`onBlurCapture`, `goTo`).
- Spec "Status publikasi dan tombol" → Task 1 `publishState`, Task 4 bar, Task 6 `primary`/`photoChanged`.
- Bug yang ikut diperbaiki: koma Skill (Task 5 Step 3), fokus lepas di Pengalaman/Pendidikan (Task 5 Step 4-5), respons menimpa ketikan (Task 3).
- Pengujian → Task 1-2 node test, Task 6 tsc/eslint/build, Task 7 manual.
