const $ = (s) => document.querySelector(s);

// Keep the decorative background silent; allow readers to pause motion.
const backgroundVideo = $(".page-background video");
const backgroundToggle = $("#background-toggle");
backgroundVideo.muted = true;
function updateBackgroundButton() {
  backgroundToggle.textContent = backgroundVideo.paused
    ? "Phát nền video"
    : "Tạm dừng nền";
}
backgroundVideo.addEventListener("play", updateBackgroundButton);
backgroundVideo.addEventListener("pause", updateBackgroundButton);
backgroundToggle.onclick = async () => {
  if (backgroundVideo.paused) {
    try {
      await backgroundVideo.play();
    } catch {
      backgroundToggle.textContent = "Không phát được video";
    }
  } else {
    backgroundVideo.pause();
  }
};
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  backgroundVideo.autoplay = false;
  backgroundVideo.pause();
} else {
  backgroundVideo.play().catch(updateBackgroundButton);
}
updateBackgroundButton();

let state,
  filter = "Tất cả",
  tab = "candidates";
const modal = $("#modal");
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();
const fmt = (n) => Number(n).toLocaleString("vi-VN");
const date = (s) =>
  new Date(s).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
let toastTimer;
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").style.display = "none"), 4500);
}
async function api(url, data) {
  const res = await fetch(url, {
    method: data ? "POST" : "GET",
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Không thể kết nối máy chủ.");
  return result;
}
async function refresh() {
  state = await api("/api/state");
  $("#candidate-count").textContent = state.candidates.length;
  $("#vote-count").textContent = fmt(
    state.candidates.reduce((n, c) => n + c.votes, 0),
  );
  $("#account").textContent = state.user ? state.user.name : "Đăng nhập ↗";
  $("#quota-label").textContent = state.user
    ? `Xin chào, ${state.user.name}`
    : "Tiếng nói của bạn có giá trị";
  $("#quota-text").textContent = state.user
    ? (state.remaining ? "Bạn có 1 phiếu duy nhất" : "Bạn đã bình chọn")
    : "Đăng nhập để trao phiếu ↗";
  render();
}
function show(html) {
  modal.classList.remove("event-modal");
  $("#modal-content").innerHTML = html;
  if (!modal.open) modal.showModal();
}
$(".close").onclick = () => modal.close();
modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    const r = modal.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      modal.close();
  }
});
function auth() {
  show(`
    <p class="eyebrow">BEC COMMUNITY</p>
    <h2 class="modal-title">Đăng nhập bằng Gmail</h2>
    <p class="muted">Mỗi tài khoản Gmail có một phiếu duy nhất.</p>
    <form class="form" id="auth-form">
      <label>Địa chỉ Gmail
        <input type="email" name="email" autocomplete="email"
          maxlength="254" required placeholder="tenban@gmail.com" />
      </label>
      <p class="muted">Nhập Gmail để tiếp tục. Địa chỉ này chưa được xác minh qua Google.</p>
      <p class="error" id="auth-error" role="alert"></p>
      <button class="button dark" type="submit">Tiếp tục ↗</button>
    </form>
  `);
  $("#auth-form").onsubmit = async (e) => {
    e.preventDefault();
    const button = e.target.querySelector("button");
    button.disabled = true;
    $("#auth-error").textContent = "";
    try {
      await api("/api/login", Object.fromEntries(new FormData(e.target)));
      await refresh();
      modal.close();
      toast(state.remaining ? "Đăng nhập thành công. Bạn có một phiếu duy nhất." : "Tài khoản này đã bình chọn.");
    } catch (error) {
      $("#auth-error").textContent = error.message;
    } finally {
      button.disabled = false;
    }
  };
}
$("#account").onclick = () => {
  if (!state?.user) return auth();
  show(
    `<p class="eyebrow">TÀI KHOẢN CỦA BẠN</p><h2 class="modal-title">${esc(state.user.name)}</h2><p class="muted">${esc(state.user.email)}</p><p>${state.remaining ? "Bạn còn <strong>1 phiếu duy nhất</strong>." : "Bạn đã sử dụng phiếu bình chọn duy nhất."}</p><button class="button dark full" id="logout">Đăng xuất</button>`,
  );
  $("#logout").onclick = async () => {
    try {
      await api("/api/logout", {});
      await refresh();
      modal.close();
    } catch (e) {
      toast(e.message);
    }
  };
};
function vote(id) {
  if (!state.user) return auth();
  const c = state.candidates.find((c) => c.id === id);
  if (!state.remaining)
    return toast(
      "Bạn đã bình chọn. Mỗi tài khoản Gmail chỉ được bình chọn một lần.",
    );
  const requestId = crypto.randomUUID();
  show(
    `<p class="eyebrow">XÁC NHẬN BÌNH CHỌN</p><h2 class="modal-title">Trao một phiếu cho<br>${esc(c.name)}?</h2><p class="muted">Mã ${c.number} · ${esc(c.team)}</p><p class="muted">Đây là <strong>phiếu duy nhất</strong> của tài khoản Gmail này. Phiếu đã xác nhận không thể thu hồi.</p><p class="error" id="vote-error" role="alert"></p><button class="button dark full" id="confirm-vote">Xác nhận · 1 phiếu ↗</button>`,
  );
  $("#confirm-vote").onclick = async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    b.textContent = "Đang gửi phiếu…";
    try {
      await api("/api/vote", { candidateId: id, requestId });
      await refresh();
      modal.close();
      toast(`Đã trao 1 phiếu cho ${c.name}. Cảm ơn bạn!`);
    } catch (err) {
      $("#vote-error").textContent = err.message;
      b.disabled = false;
      b.textContent = "Thử lại cùng phiếu";
    }
  };
}
function profile(id) {
  const c = state.candidates.find((event) => event.id === id);
  show(`
    <p class="eyebrow">SỰ KIỆN BEC · ${c.number} · ${esc(c.term)}</p>
    <h2 class="modal-title">${esc(c.name)}</h2>
    <img class="event-detail-image" src="${esc(c.image)}" alt="${esc(c.name)}" />
    <p class="muted">${fmt(c.votes)} phiếu bình chọn</p>
    <button class="button dark full" data-vote="${id}">
      Bình chọn cho sự kiện ↗
    </button>
  `);
  modal.classList.add("event-modal");
}

// Event cards: keep markup on separate lines for easy direct editing.
function eventCard(c) {
  return `
    <article class="card event-card">
      <button class="event-cover" data-profile="${c.id}"
        aria-label="Xem ảnh ${esc(c.name)}">
        <img src="${esc(c.image)}" alt="${esc(c.name)}"
          loading="lazy" decoding="async" />
        <span class="event-image-hint">Xem ảnh ↗</span>
      </button>
      <div class="card-body">
        <p class="team">Sự kiện BEC · ${c.number} · ${esc(c.term)}</p>
        <h3>
          <button class="profile-link" data-profile="${c.id}">
            ${esc(c.name)} ↗
          </button>
        </h3>
        <div class="card-bottom">
          <span class="vote-total"><b>${fmt(c.votes)}</b> phiếu</span>
          <button class="vote-button" data-vote="${c.id}"
            aria-label="Bình chọn cho ${esc(c.name)}">Bình chọn ↗</button>
        </div>
      </div>
    </article>
  `;
}

function render() {
  if (!state) return;
  const titles = {
    candidates: ["BEC EVENT HIGHLIGHTS", "Sự kiện nào để lại dấu ấn trong bạn?"],
    ranking: ["THE COMMUNITY CHOICE", "Bảng xếp hạng"],
    history: ["YOUR SUPPORT MATTERS", "Phiếu của tôi"],
  };
  $("#section-kicker").textContent = titles[tab][0];
  $("#section-title").textContent = titles[tab][1];
  $("#search-wrap").hidden = tab !== "candidates";
  $("#filters").hidden = tab !== "candidates";
  const terms = [...new Set(state.candidates.map((event) => event.term))];
  $("#filters").innerHTML = ["Tất cả", ...terms].map((term) => `
    <button class="chip${filter === term ? " active" : ""}"
      data-filter="${esc(term)}" aria-pressed="${filter === term}">
      ${term === "Tất cả" ? "Tất cả sự kiện" : esc(term)}
    </button>
  `).join("");
  document
    .querySelectorAll("[data-tab]")
    .forEach((e) => e.classList.toggle("active", e.dataset.tab === tab));
  const list = state.candidates.filter(
    (c) =>
      (filter === "Tất cả" || c.term === filter) &&
      norm(`${c.name} ${c.number}`).includes(norm($("#search").value.trim())),
  );
  if (tab === "candidates")
    $("#content").innerHTML = list.length
      ? `<div class="grid">${list.map(eventCard).join("")}</div>`
      : '<div class="empty">Không tìm thấy sự kiện. Hãy thử tên hoặc mã sự kiện khác.</div>';
  if (tab === "ranking") {
    const sorted = [...state.candidates].sort(
      (a, b) => b.votes - a.votes || a.id - b.id,
    );
    $("#content").innerHTML =
      sorted
        .map((c, i) => {
          const rank = sorted.findIndex((x) => x.votes === c.votes) + 1;
          return `<div class="rank-row"><b class="rank-number">${String(rank).padStart(2, "0")}</b><div class="mini-avatar" style="--card-color:${c.color}">${c.initials}</div><div class="row-name"><button class="profile-link" data-profile="${c.id}"><h3>${esc(c.name)}</h3></button><p>Mã ${c.number} · ${fmt(c.votes)} phiếu</p></div><button class="vote-button" data-vote="${c.id}">Bình chọn ↗</button></div>`;
        })
        .join("") +
      '<p class="muted">Sự kiện có cùng số phiếu được xếp đồng hạng.</p>';
  }
  if (tab === "history")
    $("#content").innerHTML = !state.user
      ? '<div class="empty">Đăng nhập để xem những phiếu bạn đã trao.<br><button class="button dark" id="history-login">Đăng nhập ↗</button></div>'
      : state.history.length
        ? state.history
            .map((v) => {
              const c = [...state.candidates, ...(state.archivedCandidates || [])].find((c) => c.id === v.candidate_id) || { name: "Phiếu đã lưu", initials: "BEC", color: "#cba166" };
              return `<div class="history-row"><div class="mini-avatar" style="--card-color:${c.color}">${c.initials}</div><div class="row-name"><h3>${esc(c.name)}</h3><p>${date(v.created_at)} · Giờ Việt Nam</p></div><strong>+1 phiếu</strong></div>`;
            })
            .join("") +
          '<p class="muted">Hiển thị tối đa 100 phiếu gần nhất.</p>'
        : '<div class="empty">Bạn chưa gửi phiếu nào. Ghé mục Sự kiện để trao phiếu đầu tiên.</div>';
  if ($("#history-login")) $("#history-login").onclick = () => auth();
}
document.addEventListener("click", (e) => {
  const v = e.target.closest("[data-vote]"),
    p = e.target.closest("[data-profile]"),
    f = e.target.closest("[data-filter]");
  if (v) vote(Number(v.dataset.vote));
  if (p) profile(Number(p.dataset.profile));
  if (f) {
    filter = f.dataset.filter;
    document
      .querySelectorAll("[data-filter]")
      .forEach((b) => b.classList.toggle("active", b === f));
    render();
  }
});
$("#search").oninput = render;
function route() {
  const hash = location.hash.slice(1);
  tab = ["candidates", "ranking", "history"].includes(hash)
    ? hash
    : "candidates";
  render();
}
window.addEventListener("hashchange", () => {
  route();
  $(".workspace").scrollIntoView({ behavior: "smooth" });
});
route();
refresh().catch((e) => {
  $("#content").innerHTML =
    '<div class="empty">Không tải được dữ liệu. Hãy kiểm tra máy chủ rồi tải lại trang.</div>';
  toast(e.message);
});
setInterval(() => {
  if (!modal.open) refresh().catch(() => {});
}, 30000);
