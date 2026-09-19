import { test } from "node:test";
import assert from "node:assert/strict";
import { gmailIdentity } from "./gmail.mjs";
import { isAllowedOrigin } from "./origin.mjs";
import { SupabaseStore } from "./supabase.mjs";

test("Origin validation accepts the public site and rejects foreign pages", () => {
  const req = (origin, site, host = "127.0.0.1:3000") => ({
    headers: { origin, "sec-fetch-site": site, host }, socket: {},
  });
  const publicOrigin = "https://eclipseawardbec.io.vn";
  assert.equal(isAllowedOrigin(req("http://127.0.0.1:3000"), null), true);
  assert.equal(isAllowedOrigin(req(publicOrigin), publicOrigin), true);
  assert.equal(isAllowedOrigin(req("https://foreign.example", "cross-site"), publicOrigin), false);
});

test("Gmail aliases share one voting identity", () => {
  assert.equal(gmailIdentity(" Bec.Test+events@gmail.com "), "bectest@gmail.com");
  assert.equal(gmailIdentity("bectest@googlemail.com"), "bectest@gmail.com");
  assert.equal(gmailIdentity("bectest@example.com"), null);
  assert.equal(gmailIdentity("bad..address@gmail.com"), null);
});

test("SupabaseStore sends credentials only in server-side headers", async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return new Response("[]", { status: 200, headers: { "Content-Type": "application/json" } });
  };
  try {
    const store = new SupabaseStore({ url: "https://project.supabase.co", key: "secret-test-key" });
    await store.listVotes("bec.test@gmail.com");
    assert.match(captured.url, /\/rest\/v1\/votes\?/);
    assert.match(captured.url, /voter_id=eq\.bec\.test%40gmail\.com/);
    assert.equal(captured.options.headers.apikey, "secret-test-key");
    assert.equal(captured.options.headers.Authorization, "Bearer secret-test-key");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
