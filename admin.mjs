import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const hash = (value) => createHash("sha256").update(value).digest();
const sessionKey = (value) => hash(value).toString("hex");

// Sessions are deliberately invalidated on restart or password change.
export function createAdmin({ db, events, archivedEvents, readBody, secure }) {
  const password = process.env.ADMIN_PASSWORD || "";
  const enabled = password.length >= 12;
  const passwordHash = hash(password);
  const sessions = new Map();
  let failures = 0;
  let resetAt = 0;
  const cookie = (token, age) =>
    `bec_admin=${token}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${age}${secure ? "; Secure" : ""}`;

  return async function admin(req, url, send) {
    const token = req.headers.cookie?.split(";").map((part) => part.trim())
      .find((part) => part.startsWith("bec_admin="))?.slice(10) || "";
    const now = Date.now();
    for (const [key, expires] of sessions) {
      if (expires <= now) sessions.delete(key);
    }
    if (req.method === "POST" && url.pathname === "/api/admin/login") {
      if (!enabled) return send(503, { error: "Trang quản trị chưa được cấu hình mật khẩu." });
      if (now >= resetAt) { failures = 0; resetAt = now + 600000; }
      // A global limit avoids trusting client-supplied proxy IP headers.
      if (failures >= 10) return send(429,
        { error: "Đã nhập sai quá nhiều lần. Vui lòng thử lại sau 10 phút." },
        { "Retry-After": String(Math.ceil((resetAt - now) / 1000)) });
      const input = await readBody(req);
      if (typeof input.password !== "string" || !timingSafeEqual(hash(input.password), passwordHash)) {
        failures++;
        return send(401, { error: "Mật khẩu không đúng." });
      }
      failures = 0;
      sessions.delete(sessionKey(token));
      const nextToken = randomBytes(32).toString("hex");
      sessions.set(sessionKey(nextToken), now + 4 * 60 * 60 * 1000);
      return send(200, { ok: true }, { "Set-Cookie": cookie(nextToken, 14400) });
    }
    if (req.method === "POST" && url.pathname === "/api/admin/logout") {
      sessions.delete(sessionKey(token));
      return send(200, { ok: true }, { "Set-Cookie": cookie("", 0) });
    }
    if (!enabled || !sessions.has(sessionKey(token))) {
      return send(401, { error: "Vui lòng đăng nhập quản trị viên." });
    }
    if (req.method !== "GET" || url.pathname !== "/api/admin/stats") {
      return send(404, { error: "Không tìm thấy nội dung." });
    }
    const catalog = new Map([...archivedEvents, ...events].map((event) => [event.id, event]));
    const votes = db.prepare(`
      SELECT v.id, v.candidate_id, v.created_at, u.email, u.identity_key
      FROM votes v JOIN users u ON u.id=v.user_id ORDER BY v.id DESC
    `).all().map((vote) => {
      const event = catalog.get(vote.candidate_id);
      return {
        id: vote.id, email: vote.identity_key || vote.email,
        eventId: vote.candidate_id, event: event?.name || "Sự kiện đã lưu",
        term: event?.term || "Lưu trữ", createdAt: vote.created_at,
      };
    });
    return send(200, {
      votes,
      events: events.map(({ id, name, term }) => ({ id, name, term })),
      updatedAt: new Date().toISOString(),
    });
  };
}
