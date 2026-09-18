import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import os from "node:os";
import path from "node:path";
import { gmailIdentity } from "./gmail.mjs";
import { isAllowedOrigin } from "./origin.mjs";

test("Origin validation accepts same-origin previews but rejects foreign pages", () => {
  const req = (origin, site, host = "127.0.0.1:3000") => ({
    headers: { origin, "sec-fetch-site": site, host }, socket: {},
  });
  const publicOrigin = "https://aclipseawardbec.io.vn";
  assert.equal(isAllowedOrigin(req("http://127.0.0.1:3000"), null), true);
  assert.equal(isAllowedOrigin(req(publicOrigin), publicOrigin), true);
  assert.equal(isAllowedOrigin(req("https://preview.example", "same-origin"), publicOrigin), true);
  assert.equal(isAllowedOrigin(req("https://foreign.example", "cross-site"), publicOrigin), false);
  assert.equal(isAllowedOrigin(req("https://foreign.example"), null), false);
  assert.equal(isAllowedOrigin(req("null", "same-origin"), null), false);
});

test("Gmail aliases share a voting identity", () => {
  assert.equal(gmailIdentity(" Bec.Test+events@gmail.com "), "bectest@gmail.com");
  assert.equal(gmailIdentity("bectest@googlemail.com"), "bectest@gmail.com");
  assert.equal(gmailIdentity("bectest@example.com"), null);
  assert.equal(gmailIdentity("bectest@gmail.com.evil.com"), null);
  assert.equal(gmailIdentity("bad..address@gmail.com"), null);
});

test("One lifetime vote: concurrency, retries, aliases, restart and old accounts", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "bec-vote-test-"));
  let child, base, cookie = "";
  async function start() {
    child = spawn(process.execPath, ["server.mjs"], {
      env: { ...process.env, HOST: "127.0.0.1", PUBLIC_ORIGIN: "https://aclipseawardbec.io.vn", PORT: "0", DATA_DIR: dir },
      stdio: ["ignore", "pipe", "pipe"],
    });
    base = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Startup timeout")), 10000);
      child.stdout.on("data", (data) => {
        const match = data.toString().match(/http:\/\/127.0.0.1:\d+/);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      });
      child.on("error", reject);
      child.on("exit", (code) => { clearTimeout(timer); reject(new Error(`Server exited: ${code}`)); });
    });
  }
  async function stop() {
    if (child && child.exitCode === null) {
      await new Promise((resolve) => { child.once("exit", resolve); child.kill(); });
    }
  }
  async function request(url, data) {
    const response = await fetch(base + url, {
      method: data ? "POST" : "GET",
      headers: { "Content-Type": "application/json", Origin: base, "Sec-Fetch-Site": "same-origin", ...(cookie ? { Cookie: cookie } : {}) },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (response.headers.get("set-cookie")) cookie = response.headers.get("set-cookie").split(";")[0];
    return { status: response.status, data: await response.json() };
  }
  try {
    await start();
    const rejected = await fetch(base + "/api/login", {
      method: "POST",
      headers: { Origin: "https://foreign.example", "Sec-Fetch-Site": "cross-site", "Content-Type": "application/json" },
      body: JSON.stringify({ email: "bectest@gmail.com" }),
    });
    assert.equal(rejected.status, 403);
    const catalog = (await request("/api/state")).data.candidates;
    assert.equal(catalog.filter((event) => event.term === "SPR26").length, 11);
    assert.equal(catalog.filter((event) => event.term === "SU26").length, 9);
    for (const event of catalog) {
      assert.equal((await fetch(base + event.image, { method: "HEAD" })).status, 200);
    }
    assert.equal((await request("/api/vote", { candidateId: 101, requestId: crypto.randomUUID() })).status, 401);
    assert.equal((await request("/api/login", { email: "test@example.com" })).status, 400);
    assert.equal((await request("/api/login", { email: "bec.test@gmail.com" })).status, 200);
    assert.equal((await request("/api/state")).data.remaining, 1);
    const keys = Array.from({ length: 8 }, () => crypto.randomUUID());
    const results = await Promise.all(keys.map((requestId) => request("/api/vote", { candidateId: 101, requestId })));
    assert.equal(results.filter((r) => r.status === 200).length, 1);
    assert.equal(results.filter((r) => r.status === 409).length, 7);
    const winner = keys[results.findIndex((r) => r.status === 200)];
    assert.equal((await request("/api/vote", { candidateId: 101, requestId: winner })).data.replayed, true);
    assert.equal((await request("/api/vote", { candidateId: 102, requestId: winner })).status, 409);
    await request("/api/logout", {});
    assert.equal((await request("/api/login", { email: "B.E.C.TEST+new@gmail.com" })).status, 200);
    assert.equal((await request("/api/state")).data.remaining, 0);
    assert.equal((await request("/api/vote", { candidateId: 102, requestId: crypto.randomUUID() })).status, 409);
    await stop();
    const db = new DatabaseSync(path.join(dir, "bec-vote.sqlite"));
    db.prepare("UPDATE votes SET day='2000-01-01'").run();
    const old = db.prepare("INSERT INTO users(name,email,salt,hash) VALUES(?,?,?,?)")
      .run("Old account", "old.account@gmail.com", "old-salt", "old-hash");
    for (let i = 0; i < 3; i++) {
      db.prepare("INSERT INTO votes(user_id,candidate_id,day,request_id,created_at) VALUES(?,?,?,?,?)")
        .run(Number(old.lastInsertRowid), 101, "2000-01-01", crypto.randomUUID(), "2000-01-01T00:00:00Z");
    }
    db.close();
    await start();
    assert.equal((await request("/api/state")).data.remaining, 0);
    assert.equal((await request("/api/vote", { candidateId: 102, requestId: crypto.randomUUID() })).status, 409);
    await request("/api/logout", {});
    await request("/api/login", { email: "oldaccount+alias@gmail.com" });
    const oldState = (await request("/api/state")).data;
    assert.equal(oldState.remaining, 0);
    assert.equal(oldState.history.length, 3);
    assert.equal((await request("/api/vote", { candidateId: 102, requestId: crypto.randomUUID() })).status, 409);
    await request("/api/logout", {});
    await request("/api/login", { email: "anotheraccount@gmail.com" });
    assert.equal((await request("/api/state")).data.remaining, 1);
    assert.equal((await request("/api/vote", { candidateId: 112, requestId: crypto.randomUUID() })).status, 200);
    assert.equal((await request("/api/vote", { candidateId: 101, requestId: crypto.randomUUID() })).status, 409);
    const logo = await fetch(base + "/media/bec-logo.jpg");
    assert.equal(logo.status, 200);
    assert.equal(logo.headers.get("content-type"), "image/jpeg");
  } finally {
    await stop();
    await rm(dir, { recursive: true, force: true });
  }
});
