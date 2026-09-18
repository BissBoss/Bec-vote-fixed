const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
let data = null;
let page = 0;
let generation = 0;
const pageSize = 50;

function lock() {
  generation++;
  data = null;
  $("#dashboard").hidden = true;
  $("#login").hidden = false;
  for (const id of ["#summary", "#ranking", "#rows", "#updated", "#result-count"]) $(id).textContent = "";
}
async function api(path, body) {
  const response = await fetch(`/api/admin/${path}`, {
    method: body ? "POST" : "GET", cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401) lock();
    throw new Error(result.error || "Không tải được số liệu.");
  }
  return result;
}
async function refresh() {
  const requestedGeneration = generation;
  const result = await api("stats");
  if (requestedGeneration !== generation) return;
  data = result;
  const selected = $("#term").value;
  const terms = [...new Set([...data.events.map((event) => event.term), ...data.votes.map((vote) => vote.term)])];
  $("#term").innerHTML = '<option value="">Tất cả các kỳ</option>' + terms.map((term) =>
    `<option value="${escapeHtml(term)}">${escapeHtml(term)}</option>`).join("");
  if (terms.includes(selected)) $("#term").value = selected;
  $("#login").hidden = true;
  $("#dashboard").hidden = false;
  $("#message").textContent = "";
  $("#updated").textContent = "Cập nhật lúc " + new Date(data.updatedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  render();
}
function render() {
  if (!data) return;
  const term = $("#term").value;
  const votes = data.votes.filter((vote) => !term || vote.term === term);
  const events = data.events.filter((event) => !term || event.term === term);
  const counts = new Map();
  for (const event of events) counts.set(event.id, { name: event.name, term: event.term, count: 0 });
  for (const vote of votes) {
    if (!counts.has(vote.eventId)) counts.set(vote.eventId, { name: vote.event, term: vote.term, count: 0 });
    counts.get(vote.eventId).count++;
  }
  const summary = [[votes.length, "Phiếu đã gửi"], [new Set(votes.map((vote) => vote.email)).size, "Gmail đã bình chọn"], [counts.size, "Sự kiện"]];
  $("#summary").innerHTML = summary.map(([count, title]) => `<div class="panel"><strong>${count}</strong>${title}</div>`).join("");
  $("#ranking").innerHTML = [...counts.values()].sort((a, b) => b.count - a.count).map((event) =>
    `<div class="rank"><span>${escapeHtml(event.name)} <small class="muted">· ${escapeHtml(event.term)}</small></span><progress max="${Math.max(1, votes.length)}" value="${event.count}" aria-label="${escapeHtml(event.name)}"></progress><strong>${event.count} phiếu</strong></div>`).join("") || '<p class="muted">Chưa có sự kiện.</p>';
  const search = $("#search").value.trim().toLocaleLowerCase("vi");
  const filtered = votes.filter((vote) => `${vote.email} ${vote.event}`.toLocaleLowerCase("vi").includes(search));
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  page = Math.min(page, pages - 1);
  $("#result-count").textContent = `${filtered.length} phiếu phù hợp`;
  $("#rows").innerHTML = filtered.slice(page * pageSize, (page + 1) * pageSize).map((vote) =>
    `<tr><td>${escapeHtml(vote.email)}</td><td>${escapeHtml(vote.term)}</td><td>${escapeHtml(vote.event)}</td><td>${escapeHtml(new Date(vote.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }))}</td></tr>`).join("") || '<tr><td colspan="4">Chưa có phiếu phù hợp.</td></tr>';
  $("#page").textContent = `Trang ${page + 1} / ${pages}`;
  $("#previous").disabled = page === 0;
  $("#next").disabled = page >= pages - 1;
}
$("#login-form").onsubmit = async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  button.disabled = true;
  try {
    await api("login", { password: $("#password").value });
    $("#password").value = "";
    await refresh();
  } catch (error) { $("#message").textContent = error.message; }
  finally { button.disabled = false; }
};
$("#logout").onclick = async () => {
  lock();
  try { await api("logout", {}); } catch (error) { $("#message").textContent = error.message; }
};
$("#refresh").onclick = () => refresh().catch((error) => { $("#message").textContent = error.message; });
$("#term").onchange = $("#search").oninput = () => { page = 0; render(); };
$("#previous").onclick = () => { page--; render(); };
$("#next").onclick = () => { page++; render(); };
window.addEventListener("pageshow", () => { lock(); refresh().catch(() => {}); });
setInterval(() => {
  if (data) refresh().catch((error) => { $("#message").textContent = error.message; });
}, 60000);
