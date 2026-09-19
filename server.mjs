import http from "node:http";
import {
  randomBytes,
  createHash,
} from "node:crypto";
import { createReadStream, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { vietnamDay } from "./time.mjs";
import { events as candidates } from "./events.mjs";
import { gmailIdentity } from "./gmail.mjs";
import { isAllowedOrigin } from "./origin.mjs";
import { createAdmin } from "./admin.mjs";
import { SupabaseStore } from "./supabase.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
// Configure the public HTTPS origin when deploying behind a web server.
const publicOrigin = process.env.PUBLIC_ORIGIN
  ? new URL(process.env.PUBLIC_ORIGIN).origin
  : null;
const secureCookie = publicOrigin?.startsWith("https://") ? "; Secure" : "";
const listenHost = process.env.HOST || "127.0.0.1";
const store = new SupabaseStore();
const terms = [...new Set(candidates.map((event) => event.term))];
async function termQuotas(identity) {
  const votes = identity ? await store.listVotes(identity) : [];
  return Object.fromEntries(terms.map((term) => {
    const used = votes.filter((vote) =>
      vote.category === term,
    ).length;
    return [term, { used, remaining: used ? 0 : 1 }];
  }));
}
const archivedCandidates = [
  {
    id: 1,
    number: "001",
    name: "Nguyễn Minh Anh",
    team: "Ban Truyền thông",
    initials: "MA",
    color: "#e6d9ff",
    quote: "Kết nối những ý tưởng, lan tỏa những điều tốt đẹp.",
    bio: "Minh Anh yêu thích kể chuyện, sáng tạo nội dung và kết nối các thành viên. Mong muốn góp phần xây dựng một cộng đồng BEC cởi mở và đầy cảm hứng.",
  },
  {
    id: 2,
    number: "002",
    name: "Trần Hoàng Long",
    team: "Ban Sự kiện",
    initials: "HL",
    color: "#cee9dd",
    quote: "Mỗi trải nghiệm đều bắt đầu từ một ý tưởng nhỏ.",
    bio: "Hoàng Long yêu thích tổ chức hoạt động tập thể và làm việc nhóm. Mục tiêu là tạo ra những sự kiện để mỗi thành viên đều có cơ hội tham gia và tỏa sáng.",
  },
  {
    id: 3,
    number: "003",
    name: "Lê Thảo Vy",
    team: "Ban Đối ngoại",
    initials: "TV",
    color: "#f7d9c5",
    quote: "Lắng nghe chân thành để cùng nhau đi xa hơn.",
    bio: "Thảo Vy quan tâm đến giao tiếp và xây dựng quan hệ hợp tác. Luôn sẵn sàng lắng nghe những góc nhìn mới và kết nối các cơ hội dành cho câu lạc bộ.",
  },
  {
    id: 4,
    number: "004",
    name: "Phạm Đức Huy",
    team: "Ban Chuyên môn",
    initials: "DH",
    color: "#d7e5fa",
    quote: "Học hỏi hôm nay, tạo giá trị ngày mai.",
    bio: "Đức Huy thích chia sẻ kiến thức, tìm hiểu công nghệ và giải quyết vấn đề. Mong muốn cùng BEC tạo nên những buổi học và hoạt động thực tiễn bổ ích.",
  },
  {
    id: 5,
    number: "005",
    name: "Võ Khánh Linh",
    team: "Ban Nhân sự",
    initials: "KL",
    color: "#f5d9e5",
    quote: "Một tập thể mạnh bắt đầu từ từng người được quan tâm.",
    bio: "Khánh Linh yêu thích các hoạt động gắn kết và hỗ trợ thành viên mới. Tin rằng sự tử tế và tinh thần đồng đội là nền tảng của cộng đồng bền vững.",
  },
  {
    id: 6,
    number: "006",
    name: "Đặng Gia Bảo",
    team: "Ban Sự kiện",
    initials: "GB",
    color: "#eee5be",
    quote: "Dám thử điều mới, cùng viết câu chuyện BEC.",
    bio: "Gia Bảo luôn hào hứng với những thử thách sáng tạo và hoạt động ngoại khóa. Muốn mang đến các trải nghiệm thú vị giúp mọi người tự tin thể hiện bản thân.",
  },
];
const digest = (value) => createHash("sha256").update(value).digest("hex");
const attempts = new Map();
function limit(ip) {
  const now = Date.now();
  for (const [key, value] of attempts)
    if (value.until < now) attempts.delete(key);
  const value = attempts.get(ip) || { n: 0, until: now + 600000 };
  if (++value.n > 30)
    throw Object.assign(
      new Error("Bạn thử quá nhiều lần. Vui lòng đợi 10 phút."),
      { status: 429 },
    );
  attempts.set(ip, value);
}
async function body(req) {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 8192) throw new Error("Yêu cầu quá lớn.");
  }
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw new Error("Dữ liệu không hợp lệ.");
  }
}
function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}
const admin = createAdmin({
  listVotes: () => store.listVotes(), events: candidates,
  archivedEvents: archivedCandidates, readBody: body,
  secure: Boolean(secureCookie) || process.env.NODE_ENV === "production" || process.env.RENDER === "true",
});
const server = http.createServer(async (req, res) => {
  const send = (status, data, headers = {}) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    });
    res.end(JSON.stringify(data));
  };
  try {
    const url = new URL(req.url, "http://localhost");
    if (
      req.method === "POST" &&
      !isAllowedOrigin(req, publicOrigin)
    )
      return send(403, { error: "Nguồn yêu cầu không hợp lệ." });
    if (url.pathname.startsWith("/api/admin/")) {
      return await admin(req, url, send);
    }
    const token = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("bec_session="))
      ?.slice(12);
    const session = token ? await store.session(digest(token), Date.now()) : null;
    const user = session ? {
      name: session.voter_id.split("@")[0],
      email: session.voter_id,
      identity_key: session.voter_id,
    } : null;
    if (req.method === "GET" && url.pathname === "/api/state") {
      const day = vietnamDay();
      const allVotes = await store.listVotes();
      const counts = new Map();
      for (const vote of allVotes) {
        const id = Number(vote.candidate_id);
        counts.set(id, (counts.get(id) || 0) + 1);
      }
      const userVotes = user ? allVotes.filter((vote) => vote.voter_id === user.identity_key) : [];
      const quotas = Object.fromEntries(terms.map((term) => {
        const used = userVotes.filter((vote) => vote.category === term).length;
        return [term, { used, remaining: used ? 0 : 1 }];
      }));
      const used = Object.values(quotas).reduce((total, quota) => total + quota.used, 0);
      return send(200, {
        user: user || null,
        day,
        used,
        quotas,
        remaining: Object.values(quotas).reduce((total, quota) => total + quota.remaining, 0),
        archivedCandidates: archivedCandidates.map(({ id, name, initials, color }) => ({ id, name, initials, color })),
        candidates: candidates.map((c) => ({
          ...c,
          votes: counts.get(c.id) || 0,
        })),
        history: userVotes.slice(0, 100).map((vote) => ({
          id: vote.id,
          candidate_id: Number(vote.candidate_id),
          created_at: vote.created_at,
        })),
      });
    }
    if (
      req.method === "POST" &&
      ["/api/register", "/api/login"].includes(url.pathname)
    ) {
      limit(req.socket.remoteAddress);
      const b = await body(req);
      const email = gmailIdentity(b.email);
      if (!email) fail("Vui lòng nhập địa chỉ Gmail hợp lệ, ví dụ tenban@gmail.com.");
      const session = randomBytes(32).toString("hex");
      await store.createSession(digest(session), email, Date.now() + 7 * 86400000);
      return send(
        200,
        { ok: true },
        {
          "Set-Cookie": `bec_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${secureCookie}`,
        },
      );
    }
    if (req.method === "POST" && url.pathname === "/api/logout") {
      if (token) await store.deleteSession(digest(token));
      return send(
        200,
        { ok: true },
        {
          "Set-Cookie":
            `bec_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureCookie}`,
        },
      );
    }
    if (req.method === "POST" && url.pathname === "/api/vote") {
      if (!user) fail("Vui lòng đăng nhập để bình chọn.", 401);
      if (!gmailIdentity(user.email)) fail("Vui lòng đăng nhập bằng Gmail để bình chọn.", 401);
      const b = await body(req),
        id = Number(b.candidateId),
        requestId = String(b.requestId || "");
      if (
        !candidates.some((c) => c.id === id) ||
        !/^[\w-]{16,100}$/.test(requestId)
      )
        fail("Phiếu bình chọn không hợp lệ.");
      const previous = await store.voteByRequest(user.identity_key, requestId);
      if (previous) {
        if (Number(previous.candidate_id) !== id)
          fail("Mã yêu cầu đã được dùng cho sự kiện khác.", 409);
        return send(200, { ok: true, replayed: true });
      }
      const day = vietnamDay();
      const term = candidates.find((event) => event.id === id).term;
      const quotas = await termQuotas(user.identity_key);
      if (!quotas[term].remaining) {
        fail(`Bạn đã bình chọn trong kỳ ${term}. Mỗi Gmail chỉ được chọn một sự kiện trong mỗi kỳ.`, 409);
      }
      const result = await store.insertVote({
        voter_id: user.identity_key,
        candidate_id: id,
        category: term,
        request_id: requestId,
        created_at: new Date().toISOString(),
      });
      if (result === "replayed") return send(200, { ok: true, replayed: true });
      if (result === "request-conflict") fail("Mã yêu cầu đã được dùng cho sự kiện khác.", 409);
      if (result === "quota-conflict") {
        fail(`Bạn đã bình chọn trong kỳ ${term}. Mỗi Gmail chỉ được chọn một sự kiện trong mỗi kỳ.`, 409);
      }
      return send(200, { ok: true, day });
    }
    // Only serve images listed in the event catalog.
    const eventImage = url.pathname === "/media/bec-logo.jpg"
      ? { image: "/media/bec-logo.jpg" }
      : candidates.find((event) => event.image === url.pathname);
    if (["GET", "HEAD"].includes(req.method) && eventImage) {
      const file = path.join(root, "public", eventImage.image);
      res.writeHead(200, {
        "Content-Type": file.endsWith(".jpg") ? "image/jpeg" : "image/png",
        "Content-Length": statSync(file).size,
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      });
      if (req.method === "HEAD") return res.end();
      const stream = createReadStream(file);
      stream.on("error", () => res.destroy());
      res.on("close", () => stream.destroy());
      return stream.pipe(res);
    }
    // Stream the background video; range requests support browser seeking.
    if (
      ["GET", "HEAD"].includes(req.method) &&
      url.pathname === "/media/bec-background.mp4"
    ) {
      const file = path.join(root, "public", "media", "bec-background.mp4");
      const size = statSync(file).size;
      const headers = {
        "Content-Type": "video/mp4",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      };
      let start = 0;
      let end = size - 1;
      if (req.headers.range) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (!match || (!match[1] && !match[2])) {
          res.writeHead(416, { "Content-Range": `bytes */${size}` });
          return res.end();
        }
        start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
        end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
        if (start > end || start >= size) {
          res.writeHead(416, { "Content-Range": `bytes */${size}` });
          return res.end();
        }
        headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
      }
      headers["Content-Length"] = end - start + 1;
      res.writeHead(req.headers.range ? 206 : 200, headers);
      if (req.method === "HEAD") return res.end();
      const stream = createReadStream(file, { start, end });
      stream.on("error", () => res.destroy());
      res.on("close", () => stream.destroy());
      return stream.pipe(res);
    }
    if (
      req.method === "GET" &&
      ["/", "/app.js", "/style.css", "/events.css", "/admin", "/admin/", "/admin.js", "/admin.css"].includes(url.pathname)
    ) {
      const file = url.pathname === "/" ? "index.html"
        : ["/admin", "/admin/"].includes(url.pathname) ? "admin.html" : url.pathname.slice(1);
      res.writeHead(200, {
        "Content-Type": file.endsWith(".js")
          ? "text/javascript; charset=utf-8"
          : file.endsWith(".css")
            ? "text/css; charset=utf-8"
            : "text/html; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
        "Referrer-Policy": "same-origin",
        "Content-Security-Policy":
          "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
      });
      return res.end(readFileSync(path.join(root, "public", file)));
    }
    send(404, { error: "Không tìm thấy nội dung." });
  } catch (e) {
    send(e.status || 400, {
      error:
        e.status || !String(e.message).includes("SQL")
          ? e.message
          : "Không thể xử lý yêu cầu.",
    });
  }
});
server.listen(Number(process.env.PORT || 3000), listenHost, () =>
  console.log(`BEC Vote: http://${listenHost}:${server.address().port}`),
);
