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
