import { db } from "./storage.js";
import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

function ensureNoticeModal() {
  if (document.getElementById("noticeModal")) return;

  const style = document.createElement("style");
  style.textContent = `
    .notice-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: none; justify-content: center; align-items: center; z-index: 9999; padding: 20px; }
    .notice-card { background: #fff; border-radius: 12px; padding: 20px; max-width: 480px; width: 90%; box-shadow: 0 4px 12px rgba(0,0,0,0.3); position: relative; }
    .notice-card h2 { margin: 0 0 8px; font-weight: 700; }
    .notice-card p { white-space: pre-wrap; line-height: 1.6; }
    .notice-card button { position: absolute; bottom: 16px; right: 16px; background: #333; color: #fff; padding: 8px 14px; border: none; border-radius: 8px; cursor: pointer; }
  `;

  const overlay = document.createElement("div");
  overlay.id = "noticeModal";
  overlay.className = "notice-modal";
  overlay.innerHTML = `
    <div class="notice-card">
      <h2 id="noticeTitle"></h2>
      <p id="noticeContent"></p>
      <button id="closeNoticeBtn">닫기</button>
    </div>
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeNotice();
  });
  document.addEventListener("click", (e) => {
    if ((e.target)?.id === "closeNoticeBtn") closeNotice();
  });
}

function closeNotice() {
  const modal = document.getElementById("noticeModal");
  if (modal) modal.style.display = "none";
  try { localStorage.setItem("noticeClosed", "true"); } catch {}
}

window.addEventListener("DOMContentLoaded", async () => {
  try {
    const closed = localStorage.getItem("noticeClosed");
    if (closed === "true") return;

    ensureNoticeModal();

    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return;

    const data = snap.docs[0].data();
    const titleEl = document.getElementById("noticeTitle");
    const contentEl = document.getElementById("noticeContent");
    if (titleEl) titleEl.textContent = data.title || "";
    if (contentEl) contentEl.textContent = data.content || "";

    const modal = document.getElementById("noticeModal");
    if (modal) modal.style.display = "flex";
  } catch (err) {
    console.error("[notice_popup] failed to load notice", err);
  }
});
