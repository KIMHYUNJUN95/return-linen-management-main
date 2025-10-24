// ========================================
// 📢 HARU Notices Admin (공지 관리)
// 👑 관리자만 작성 및 삭제 가능
// ========================================

import { db, auth } from "./storage.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const form = document.getElementById("noticeForm");
const noticesList = document.getElementById("noticesList");
const titleEl = document.getElementById("title");
const contentEl = document.getElementById("content");
const importantEl = document.getElementById("important");

// 👑 관리자 계정 이메일 (필요 시 여러 개 등록 가능)
const ADMIN_EMAILS = [
  "rlaguswns95@haru-tokyo.com",
  "admin@haru.com"
];

// ✅ 로그인 상태 감지 후 권한 체크
auth.onAuthStateChanged((user) => {
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  // 관리자만 작성폼 활성화
  if (!isAdmin) {
    if (form) form.style.display = "none";
  }

  // 공지 로드
  loadNotices(isAdmin);
});

// ✅ 공지 등록
form?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = titleEl.value.trim();
  const content = contentEl.value.trim();
  const important = importantEl.checked;
  const userName = auth?.currentUser?.displayName || "관리자";
  const userEmail = auth?.currentUser?.email || null;

  if (!title || !content) {
    alert("제목과 내용을 입력해주세요.");
    return;
  }

  // 권한 검사
  if (!ADMIN_EMAILS.includes(userEmail)) {
    alert("관리자만 공지를 등록할 수 있습니다.");
    return;
  }

  try {
    await addDoc(collection(db, "notices"), {
      title,
      content,
      important,
      createdBy: userName,
      userEmail,
      createdAt: serverTimestamp(),
    });

    alert("✅ 공지가 등록되었습니다!");
    form.reset();
    await loadNotices(true);
  } catch (err) {
    console.error("❌ 공지 등록 오류:", err);
    alert("공지 등록 중 오류가 발생했습니다.");
  }
});

// ✅ 공지 로드
async function loadNotices(isAdmin = false) {
  try {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    const notices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (notices.length === 0) {
      noticesList.innerHTML = '<div class="empty-state">등록된 공지가 없습니다</div>';
      return;
    }

    noticesList.innerHTML = notices.map(notice => `
      <div class="card" style="margin-bottom: var(--space-4);" data-testid="notice-item-${notice.id}">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div style="flex:1;">
            <h4 style="margin-bottom: var(--space-2);">
              ${notice.important ? '🔴 ' : ''}${notice.title}
            </h4>
            <p style="font-size: var(--font-size-sm); color: hsl(var(--color-text-secondary)); margin-bottom: var(--space-2); white-space: pre-line;">
              ${notice.content}
            </p>
            <div style="font-size: var(--font-size-xs); color: hsl(var(--color-text-tertiary));">
              ${formatDate(notice.createdAt)} · ${notice.createdBy}
            </div>
          </div>
          ${isAdmin ? `
            <button class="btn btn-sm btn-danger" onclick="deleteNotice('${notice.id}')" data-testid="button-delete-${notice.id}">
              삭제
            </button>` : ``}
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error("❌ 공지 로드 오류:", err);
  }
}

// ✅ 공지 삭제 (관리자만)
window.deleteNotice = async (id) => {
  const user = auth.currentUser;
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    alert("관리자만 삭제할 수 있습니다.");
    return;
  }

  if (!confirm("정말 삭제하시겠습니까?")) return;

  try {
    await deleteDoc(doc(db, "notices", id));
    alert("✅ 삭제되었습니다.");
    await loadNotices(true);
  } catch (err) {
    console.error("❌ 삭제 오류:", err);
    alert("삭제 중 오류가 발생했습니다.");
  }
};

// ✅ 날짜 포맷
function formatDate(ts) {
  if (!ts) return "-";
  try {
    const date = ts.toDate();
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "-";
  }
}
