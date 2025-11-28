// ========================================
// 📋 HARU 게시판 로직 (Tokyo Day Bright)
// ========================================

import { initHeaderMenu } from "./header.js";
import { db, auth } from "./storage.js"; // auth.js -> storage.js로 통일
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ✅ 1. 헤더 로드 (필수 추가)
document.addEventListener("DOMContentLoaded", () => {
  fetch("header.html")
    .then(r => r.text())
    .then(h => {
      const headerPlaceholder = document.getElementById("header-placeholder");
      if (headerPlaceholder) {
        headerPlaceholder.innerHTML = h;
        initHeaderMenu();
      }
    })
    .catch(err => console.error("헤더 로드 실패:", err));
});

/* ===========================================
   📌 DOM 요소
=========================================== */
const postForm = document.getElementById("postForm");
const postList = document.getElementById("postList");
const pinnedBox = document.getElementById("pinned");
const togglePostFormBtn = document.getElementById("togglePostForm");

let currentUser = null;
let postsCache = [];

/* ===========================================
   🔐 관리자 이메일
=========================================== */
const SUPER_ADMIN_EMAIL = "rlaguswns95@haru-tokyo.com";

/* ===========================================
   ✏ 글쓰기 토글
=========================================== */
if (togglePostFormBtn && postForm) {
  togglePostFormBtn.addEventListener("click", () => {
    if (!currentUser) {
      alert("로그인이 필요합니다.");
      // location.href = "signup.html"; // 필요 시 주석 해제
      return;
    }
    postForm.classList.toggle("is-open");
    
    // 버튼 텍스트 변경 (선택 사항)
    if (postForm.classList.contains("is-open")) {
      togglePostFormBtn.textContent = "닫기";
      postForm.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      togglePostFormBtn.textContent = "글쓰기";
    }
  });
}

/* ===========================================
   🧑 사용자 인증 체크
=========================================== */
onAuthStateChanged(auth, (user) => {
  // 비로그인 상태라도 목록은 볼 수 있게 하려면 아래 리턴 제거 가능
  // 현재 로직 유지: 로그인 필수
  if (!user) {
    // alert("로그인이 필요합니다.");
    // location.href = "signup.html";
    return;
  }
  currentUser = user;
  
  // 관리자가 아니면 공지 체크박스 숨김
  if (pinnedBox && user.email !== SUPER_ADMIN_EMAIL) {
    pinnedBox.parentElement.style.display = "none";
  }

  loadPosts();
});

/* ===========================================
   📝 게시글 작성
=========================================== */
if (postForm) {
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const content = document.getElementById("content").value.trim();
    const pinned = pinnedBox ? pinnedBox.checked : false;

    if (!title || !content) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      await addDoc(collection(db, "board"), {
        title,
        content,
        pinned,
        author: currentUser.displayName || currentUser.email,
        uid: currentUser.uid,
        createdAt: serverTimestamp(),
      });

      alert("게시글이 등록되었습니다.");
      postForm.reset();
      postForm.classList.remove("is-open");
      togglePostFormBtn.textContent = "글쓰기";
      loadPosts();
    } catch (err) {
      console.error("작성 오류:", err);
      alert("게시글 등록 중 오류가 발생했습니다.");
    }
  });
}

/* ===========================================
   📜 게시글 목록 렌더링 (UI 리뉴얼)
=========================================== */
async function loadPosts() {
  if (!postList) return;

  postList.innerHTML = `
    <tr>
      <td colspan="3" style="text-align:center; padding:40px; color:#94A3B8;">
        게시글을 불러오는 중입니다...
      </td>
    </tr>
  `;

  const qy = query(
    collection(db, "board"),
    orderBy("pinned", "desc"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(qy);
  postList.innerHTML = "";
  postsCache = [];

  if (snap.empty) {
    postList.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; padding:60px; color:#CBD5E1;">
          등록된 게시글이 없습니다.
        </td>
      </tr>
    `;
    return;
  }

  let no = 0;

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const id = docSnap.id;

    postsCache.push({ id, ...data });

    const date = data.createdAt?.toDate?.().toLocaleDateString("ko-KR", {
      year: "numeric", month: "2-digit", day: "2-digit"
    }) || "-";

    const isPinned = !!data.pinned;
    
    // 공지사항이 아닐 때만 번호 증가
    if (!isPinned) no += 1;

    const tr = document.createElement("tr");
    if (isPinned) tr.classList.add("pinned-row");

    // 디자인: 이모지 제거하고 뱃지 사용
    const titleHtml = isPinned 
      ? `<span class="pinned-badge">공지</span> ${data.title || "(제목 없음)"}`
      : data.title || "(제목 없음)";

    // 번호 컬럼: 공지면 '공지', 아니면 숫자
    const noHtml = isPinned ? '<span style="font-weight:bold; color:var(--haru-navy)">-</span>' : no;

    tr.innerHTML = `
      <td class="board-no">${noHtml}</td>
      <td class="board-title" data-id="${id}">
        ${titleHtml}
      </td>
      <td class="board-date">${date}</td>
    `;

    postList.appendChild(tr);
  });
}

/* ===========================================
   💬 댓글 불러오기 (디자인 개선)
=========================================== */
async function loadComments(postId, containerEl) {
  if (!containerEl) return;
  containerEl.innerHTML = "";

  const qy = query(
    collection(db, `board/${postId}/comments`),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(qy);

  if (snap.empty) {
    containerEl.innerHTML =
      `<div style="font-size:13px; color:#94A3B8; padding:10px 0;">아직 작성된 댓글이 없습니다.</div>`;
    return;
  }

  snap.forEach((cmtDoc) => {
    const c = cmtDoc.data();
    const cId = cmtDoc.id;
    const date = c.createdAt?.toDate?.().toLocaleString("ko-KR", {
        month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit"
    }) || "-";

    const canDelete = currentUser && (
      c.uid === currentUser.uid ||
      currentUser.email === SUPER_ADMIN_EMAIL
    );

    const body = (c.text || "").replace(/\n/g, "<br>");

    const item = document.createElement("div");
    item.className = "comment";
    // 댓글 스타일 인라인 적용 (CSS로 빼도 됨)
    item.style.borderBottom = "1px solid #F1F5F9";
    item.style.padding = "12px 0";

    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
        <span style="font-weight:700; font-size:13px; color:#2C3E50;">${c.author || "익명"}</span>
        <span style="font-size:11px; color:#94A3B8;">${date}</span>
      </div>
      <div style="font-size:13px; color:#334155; line-height:1.5;">${body}</div>
      <div class="cmt-actions" style="text-align:right; margin-top:4px;">
        ${
          canDelete
            ? `<button class="cmt-del" data-post="${postId}" data-id="${cId}" 
                style="background:none; border:none; color:#E74C3C; font-size:11px; cursor:pointer; font-weight:600;">삭제</button>`
            : ""
        }
      </div>
    `;
    containerEl.appendChild(item);
  });
}

/* ===========================================
   🔍 상세 모달 (디자인 리뉴얼)
=========================================== */
function openViewModal(id) {
  const post = postsCache.find((p) => p.id === id);
  if (!post) {
    alert("게시글을 찾을 수 없습니다.");
    return;
  }

  const date = post.createdAt?.toDate?.().toLocaleString("ko-KR") || "-";
  const formattedContent = (post.content || "")
    .replace(/\n/g, "<br>")
    .replace(/\s{2,}/g, (s) => "&nbsp;".repeat(s.length));

  const isOwner =
    currentUser &&
    (currentUser.uid === post.uid ||
      currentUser.email === SUPER_ADMIN_EMAIL);

  const bg = document.createElement("div");
  bg.className = "modal-bg";

  const modal = document.createElement("div");
  modal.className = "modal";
  // 모달 스타일 직접 주입 (CSS 클래스 활용 권장)
  modal.style.maxWidth = "600px";
  modal.style.width = "90%";

  modal.innerHTML = `
    <div style="border-bottom:1px solid #E2E8F0; padding-bottom:16px; margin-bottom:20px;">
        <h3 style="margin:0 0 8px 0; font-size:18px; font-weight:800; color:#2C3E50; line-height:1.4;">
        ${post.pinned ? '<span class="pinned-badge">공지</span> ' : ""}${post.title || "(제목 없음)"}
        </h3>
        <div style="font-size:12px; color:#94A3B8; display:flex; justify-content:space-between;">
        <span>작성자: <strong>${post.author || "익명"}</strong></span>
        <span>${date}</span>
        </div>
    </div>

    <div style="min-height:120px; font-size:14px; line-height:1.6; color:#334155; margin-bottom:30px;">
      ${formattedContent}
    </div>

    <div class="comment-box" style="background:#F8FAFC; padding:20px; border-radius:8px; border:1px solid #E2E8F0;">
      <h4 style="font-size:13px; margin:0 0 12px 0; color:#64748B; text-transform:uppercase;">Comments</h4>
      <div id="view-cmt-list" class="comment-list" style="margin-bottom:12px;"></div>
      
      <div style="display:flex; gap:8px;">
        <input id="view-cmt-input" class="comment-input" placeholder="댓글을 입력하세요..." 
            style="flex:1; padding:8px 12px; border:1px solid #CBD5E1; font-size:13px;">
        <button id="view-cmt-add" style="background:#2C3E50; color:#fff; border:none; padding:0 16px; font-size:12px; font-weight:700; cursor:pointer;">등록</button>
      </div>
    </div>

    <div class="modal-actions" style="margin-top:24px; display:flex; justify-content:flex-end; gap:10px;">
      ${
        isOwner
          ? `
        <button id="btnEdit" style="background:#fff; border:1px solid #CBD5E1; padding:8px 16px; font-size:12px; font-weight:600; cursor:pointer; color:#2C3E50;">수정</button>
        <button id="btnDelete" style="background:#fff; border:1px solid #E74C3C; padding:8px 16px; font-size:12px; font-weight:600; cursor:pointer; color:#E74C3C;">삭제</button>
      `
          : ""
      }
      <button id="btnViewClose" style="background:#2C3E50; border:none; padding:8px 20px; font-size:12px; font-weight:700; cursor:pointer; color:#fff;">닫기</button>
    </div>
  `;

  bg.appendChild(modal);
  document.body.appendChild(bg);

  const listEl = modal.querySelector("#view-cmt-list");
  const inputEl = modal.querySelector("#view-cmt-input");
  const addBtn = modal.querySelector("#view-cmt-add");
  const closeBtn = modal.querySelector("#btnViewClose");
  const editBtn = modal.querySelector("#btnEdit");
  const deleteBtn = modal.querySelector("#btnDelete");

  // 댓글 로드
  loadComments(post.id, listEl);

  // 이벤트 바인딩
  closeBtn.addEventListener("click", () => bg.remove());

  addBtn.addEventListener("click", async () => {
    if (!inputEl) return;
    const text = inputEl.value.trim();
    if (!text) return;
    await addDoc(collection(db, `board/${post.id}/comments`), {
      text,
      author: currentUser.displayName || currentUser.email,
      uid: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    inputEl.value = "";
    await loadComments(post.id, listEl);
  });

  modal.addEventListener("click", async (e) => {
    if (e.target.classList.contains("cmt-del")) {
      const postId = e.target.dataset.post;
      const cId = e.target.dataset.id;
      if (!confirm("댓글을 삭제하시겠습니까?")) return;
      await deleteDoc(doc(db, `board/${postId}/comments`, cId));
      await loadComments(postId, listEl);
    }
  });

  if (editBtn) {
    editBtn.addEventListener("click", () => {
      bg.remove();
      openEditModal(post.id);
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!confirm("정말 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.")) return;
      await deleteDoc(doc(db, "board", post.id));
      bg.remove();
      loadPosts();
    });
  }
}

/* ===========================================
   ✏️ 게시글 수정 모달
=========================================== */
async function openEditModal(id) {
  const post = postsCache.find((p) => p.id === id);
  if (!post) return;

  const bg = document.createElement("div");
  bg.className = "modal-bg";

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.style.maxWidth = "600px";
  modal.style.width = "90%";

  modal.innerHTML = `
    <h3 style="margin-top:0; margin-bottom:20px; font-size:18px; font-weight:800; color:#2C3E50;">게시글 수정</h3>
    
    <div style="margin-bottom:16px;">
        <label style="display:block; font-size:12px; font-weight:700; color:#64748B; margin-bottom:6px;">제목</label>
        <input id="editTitle" type="text" value="${post.title || ""}" 
            style="width:100%; padding:10px; border:1px solid #CBD5E1; font-size:14px;">
    </div>
    
    <div style="margin-bottom:16px;">
        <label style="display:block; font-size:12px; font-weight:700; color:#64748B; margin-bottom:6px;">내용</label>
        <textarea id="editContent" rows="8" 
            style="width:100%; padding:10px; border:1px solid #CBD5E1; font-size:14px; resize:vertical;">${post.content || ""}</textarea>
    </div>

    ${currentUser.email === SUPER_ADMIN_EMAIL ? `
    <label for="editPinned" style="display:flex; align-items:center; gap:8px; margin-top:8px; cursor:pointer;">
      <input type="checkbox" id="editPinned" ${post.pinned ? "checked" : ""}>
      <span style="font-size:13px; color:#2C3E50;">상단 공지 고정</span>
    </label>
    ` : ''}

    <div class="modal-actions" style="margin-top:24px; display:flex; justify-content:flex-end; gap:10px;">
      <button id="btnClose" style="background:#fff; border:1px solid #CBD5E1; padding:10px 20px; font-size:13px; font-weight:600; cursor:pointer; color:#64748B;">취소</button>
      <button id="btnSave" style="background:#2C3E50; border:none; padding:10px 20px; font-size:13px; font-weight:700; cursor:pointer; color:#fff;">저장하기</button>
    </div>
  `;

  bg.appendChild(modal);
  document.body.appendChild(bg);

  const btnClose = modal.querySelector("#btnClose");
  const btnSave = modal.querySelector("#btnSave");
  const titleInput = modal.querySelector("#editTitle");
  const contentInput = modal.querySelector("#editContent");
  const pinnedInput = modal.querySelector("#editPinned");

  btnClose.addEventListener("click", () => bg.remove());
  
  btnSave.addEventListener("click", async () => {
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const pinned = pinnedInput ? pinnedInput.checked : false;

    if (!title || !content) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    await updateDoc(doc(db, "board", id), {
      title,
      content,
      pinned,
    });

    bg.remove();
    loadPosts();
  });
}

/* ===========================================
   🧭 리스트 클릭 이벤트
=========================================== */
postList.addEventListener("click", async (e) => {
  // 제목이나 tr 클릭 시 상세 보기
  const target = e.target;
  const titleCell = target.closest(".board-title");
  
  if (titleCell) {
    const id = titleCell.dataset.id;
    if (id) openViewModal(id);
  }
});