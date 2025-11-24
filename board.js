import { auth } from "./auth.js";
import { db } from "./storage.js";
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
    postForm.classList.toggle("is-open");
    if (postForm.classList.contains("is-open")) {
      postForm.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

/* ===========================================
   🧑 사용자 인증 체크
=========================================== */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    alert("로그인이 필요합니다.");
    location.href = "signup.html";
    return;
  }
  currentUser = user;
  loadPosts();
});

/* ===========================================
   📝 게시글 작성
=========================================== */
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value.trim();
  const content = document.getElementById("content").value.trim();
  const pinned = pinnedBox.checked;

  if (!title || !content) {
    alert("제목과 내용을 모두 입력해주세요.");
    return;
  }

  await addDoc(collection(db, "board"), {
    title,
    content,
    pinned,
    author: currentUser.displayName || currentUser.email,
    uid: currentUser.uid,
    createdAt: serverTimestamp(),
  });

  postForm.reset();
  postForm.classList.remove("is-open");
  loadPosts();
});

/* ===========================================
   📜 게시글 목록 렌더링
   - 리스트에는 수정/삭제 버튼 없음
   - No / 제목(-작성자) / 작성시간 3열만 사용
=========================================== */
async function loadPosts() {
  if (!postList) return;

  postList.innerHTML = `
    <tr>
      <td colspan="3" style="text-align:center;padding:16px;">게시글을 불러오는 중...</td>
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
        <td colspan="3" style="text-align:center;padding:16px;">게시글이 없습니다.</td>
      </tr>
    `;
    return;
  }

  let no = 0;

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const id = docSnap.id;

    postsCache.push({ id, ...data });

    const date =
      data.createdAt?.toDate?.().toLocaleString("ko-KR") || "-";

    const isPinned = !!data.pinned;

    no += 1;

    // 제목 뒤에 작성자 표시 (예: 제목-김현준)
    const titleDisplay = data.author
      ? `${data.title || "(제목 없음)"} - ${data.author}`
      : data.title || "(제목 없음)";

    const tr = document.createElement("tr");
    if (isPinned) tr.classList.add("pinned-row");

    tr.innerHTML = `
      <td class="board-no">${isPinned ? "" : no}</td>
      <td class="board-title" data-id="${id}">
        <div class="board-title-text">${titleDisplay}</div>
      </td>
      <td class="board-date">${date}</td>
    `;

    postList.appendChild(tr);
  });
}

/* ===========================================
   💬 댓글 불러오기
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
      `<div style="font-size:13px;color:#888;">등록된 댓글이 없습니다.</div>`;
    return;
  }

  snap.forEach((cmtDoc) => {
    const c = cmtDoc.data();
    const cId = cmtDoc.id;
    const date =
      c.createdAt?.toDate?.().toLocaleString("ko-KR") || "-";

    const canDelete = currentUser && (
      c.uid === currentUser.uid ||
      currentUser.email === SUPER_ADMIN_EMAIL
    );

    const body = (c.text || "").replace(/\n/g, "<br>");

    const item = document.createElement("div");
    item.className = "comment";
    item.innerHTML = `
      <div style="margin-bottom:4px;">${body}</div>
      <small>${c.author || "익명"} · ${date}</small>
      <div class="cmt-actions">
        ${
          canDelete
            ? `<button class="danger cmt-del" data-post="${postId}" data-id="${cId}">삭제</button>`
            : ""
        }
      </div>
    `;
    containerEl.appendChild(item);
  });
}

/* ===========================================
   🔍 상세 모달 (내용 + 댓글 + 수정/삭제)
   - 수정/삭제 버튼은 여기에서만 노출
=========================================== */
function openViewModal(id) {
  const post = postsCache.find((p) => p.id === id);
  if (!post) {
    alert("게시글을 찾을 수 없습니다.");
    return;
  }

  const date =
    post.createdAt?.toDate?.().toLocaleString("ko-KR") || "-";
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
  modal.innerHTML = `
    <h3 style="margin-bottom:8px;">
      ${post.pinned ? "📌 " : ""}${post.title || "(제목 없음)"}
    </h3>
    <div style="font-size:13px;color:#666;margin-bottom:10px;">
      ${post.author || "익명"} · ${date}
    </div>
    <div style="border-top:1px solid #eee;padding-top:10px;margin-bottom:12px;font-size:14px;white-space:normal;">
      ${formattedContent}
    </div>

    <div class="comment-box">
      <h4 style="font-size:14px;margin-bottom:6px;">댓글</h4>
      <div id="view-cmt-list" class="comment-list" style="margin-bottom:6px;"></div>
      <textarea id="view-cmt-input"
        class="comment-input"
        placeholder="댓글을 입력하세요..."></textarea>
      <button id="view-cmt-add"
        class="primary"
        style="margin-top:6px;width:100%;">댓글 등록</button>
    </div>

    <div class="modal-actions" style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px;">
      ${
        isOwner
          ? `
        <button id="btnEdit" class="secondary">수정</button>
        <button id="btnDelete" class="danger">삭제</button>
      `
          : ""
      }
      <button id="btnViewClose" class="secondary">닫기</button>
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

  // 댓글 불러오기
  loadComments(post.id, listEl);

  // 닫기
  closeBtn.addEventListener("click", () => bg.remove());

  // 댓글 등록
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

  // 댓글 삭제
  modal.addEventListener("click", async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains("cmt-del")) return;

    const postId = target.dataset.post;
    const cId = target.dataset.id;
    if (!postId || !cId) return;

    if (!confirm("이 댓글을 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, `board/${postId}/comments`, cId));
    await loadComments(postId, listEl);
  });

  // 수정 버튼 (모달 안)
  if (editBtn) {
    editBtn.addEventListener("click", () => {
      bg.remove();
      openEditModal(post.id);
    });
  }

  // 삭제 버튼 (모달 안)
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!confirm("이 게시글을 삭제하시겠습니까?")) return;
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
  if (!post) {
    alert("게시글을 불러올 수 없습니다.");
    return;
  }

  const bg = document.createElement("div");
  bg.className = "modal-bg";

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <h3>게시글 수정</h3>
    <input id="editTitle" type="text" value="${post.title || ""}">
    <textarea id="editContent" rows="6">${post.content || ""}</textarea>
    <label for="editPinned" style="display:flex;align-items:center;gap:8px;margin-top:8px;">
      <span>상단 고정</span>
      <input type="checkbox" id="editPinned" ${post.pinned ? "checked" : ""}>
    </label>
    <div class="modal-actions">
      <button id="btnSave" class="primary">저장</button>
      <button id="btnClose" class="secondary">닫기</button>
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
    const pinned = pinnedInput.checked;

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
   - 이제 리스트에는 버튼이 없고, 제목 클릭만 상세 보기
=========================================== */
postList.addEventListener("click", async (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const titleCell = target.closest(".board-title");
  if (titleCell && titleCell instanceof HTMLElement) {
    const id = titleCell.dataset.id;
    if (!id) return;
    openViewModal(id);
  }
});
