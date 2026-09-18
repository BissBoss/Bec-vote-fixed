import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { createAdmin } from "./admin.mjs";

test("Admin API protects voter data, validates password, revokes sessions and limits attempts", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "bec-admin-test-"));
  const password = randomBytes(24).toString("hex");
  let child, base;
  async function start(secret = password) {
    child = spawn(process.execPath, ["server.mjs"], {
      env: { ...process.env, DATA_DIR: dir, PORT: "0", HOST: "127.0.0.1", ADMIN_PASSWORD: secret, PUBLIC_ORIGIN: "https://aclipseawardbec.io.vn" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    base = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Startup timeout")), 10000);
      child.stdout.on("data", (data) => {
        const match = data.toString().match(/http:\/\/127.0.0.1:\d+/);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      });
      child.on("error", reject);
      child.on("exit", () => { clearTimeout(timer); reject(new Error("Server stopped")); });
    });
  }
  async function stop() {
    if (child && child.exitCode === null && child.signalCode === null) await new Promise((resolve) => {
      child.once("exit", resolve); child.kill();
    });
  }
  function request(route, body, cookie = "", origin = "https://aclipseawardbec.io.vn") {
    return fetch(base + route, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
      body: body ? JSON.stringify(body) : undefined,
    });
  }
  try {
    await start();
    assert.equal((await request("/admin")).status, 200);
    assert.equal((await request("/api/admin/stats")).status, 401);
    assert.equal((await request("/api/admin/stats", null, "bec_admin=forged")).status, 401);
    assert.equal((await request("/api/admin/login", { password: "wrong" })).status, 401);
    assert.equal((await request("/api/admin/login", { password }, "", "https://evil.example")).status, 403);
    const voter = await request("/api/login", { email: "testvoter@gmail.com" });
    const voterCookie = voter.headers.get("set-cookie").split(";")[0];
    assert.equal((await request("/api/admin/stats", null, voterCookie)).status, 401);
    await request("/api/vote", { candidateId: 101, requestId: crypto.randomUUID() }, voterCookie);
    await request("/api/vote", { candidateId: 112, requestId: crypto.randomUUID() }, voterCookie);
    const login = await request("/api/admin/login", { password });
    assert.equal(login.status, 200);
    const setCookie = login.headers.get("set-cookie");
    for (const flag of ["HttpOnly", "Secure", "SameSite=Strict", "Max-Age=14400"]) assert.ok(setCookie.includes(flag));
    const cookie = setCookie.split(";")[0];
    const stats = await request("/api/admin/stats", null, cookie);
    assert.equal(stats.headers.get("cache-control"), "no-store");
    const result = await stats.json();
    assert.equal(result.votes.length, 2);
    assert.deepEqual(new Set(result.votes.map((vote) => vote.term)), new Set(["SPR26", "SU26"]));
    assert.equal(result.votes[0].email, "testvoter@gmail.com");
    assert.ok(result.events.length >= 20);
    assert.ok(!JSON.stringify(result).includes(password));
    const publicData = await (await request("/api/state")).json();
    assert.ok(!JSON.stringify(publicData).includes("testvoter@gmail.com"));
    assert.equal((await request("/api/admin/logout", {}, cookie)).status, 200);
    assert.equal((await request("/api/admin/stats", null, cookie)).status, 401);
    const second = await request("/api/admin/login", { password });
    const secondCookie = second.headers.get("set-cookie").split(";")[0];
    await stop();
    await start();
    assert.equal((await request("/api/admin/stats", null, secondCookie)).status, 401);
    for (let index = 0; index < 10; index++) {
      assert.equal((await request("/api/admin/login", { password: "wrong" })).status, 401);
    }
    assert.equal((await request("/api/admin/login", { password })).status, 429);
    await stop();
    await start("");
    assert.equal((await request("/api/admin/login", { password: "" })).status, 503);
    assert.equal((await request("/api/admin/stats", null, secondCookie)).status, 401);
    await stop();
    const db = new DatabaseSync(path.join(dir, "bec-vote.sqlite"));
    assert.equal(db.prepare("SELECT COUNT(*) n FROM votes").get().n, 2);
    db.close();
  } finally {
    await stop();
    await rm(dir, { recursive: true, force: true });
  }
});

test("Admin session expires after four hours", async () => {
  const oldPassword = process.env.ADMIN_PASSWORD;
  const realNow = Date.now;
  process.env.ADMIN_PASSWORD = "temporary-test-password";
  let now = realNow();
  Date.now = () => now;
  try {
    const handler = createAdmin({ db: {}, events: [], archivedEvents: [],
      readBody: async () => ({ password: process.env.ADMIN_PASSWORD }), secure: false });
    let cookie;
    await handler({ method: "POST", headers: {} }, new URL("http://local/api/admin/login"),
      (status, body, headers) => { assert.equal(status, 200); cookie = headers["Set-Cookie"].split(";")[0]; });
    now += 4 * 60 * 60 * 1000 + 1;
    await handler({ method: "GET", headers: { cookie } }, new URL("http://local/api/admin/stats"),
      (status) => assert.equal(status, 401));
  } finally {
    Date.now = realNow;
    if (oldPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = oldPassword;
  }
});
