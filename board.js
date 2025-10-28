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

let currentUser = null;

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
  loadPosts();
});

/* ===========================================
   📜 게시글 불러오기
=========================================== */
async function loadPosts() {
  postList.innerHTML = "<p>게시글을 불러오는 중...</p>";

  const qy = query(
    collection(db, "board"),
    orderBy("pinned", "desc"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(qy);
  postList.innerHTML = "";

  if (snap.empty) {
    postList.innerHTML = "<p>게시글이 없습니다.</p>";
    return;
  }

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const id = docSnap.id;
    const date = data.createdAt?.toDate?.().toLocaleString("ko-KR") || "-";

    const formattedContent = (data.content || "")
      .replace(/\n/g, "<br>")
      .replace(/\s{2,}/g, (s) => "&nbsp;".repeat(s.length));

    const postEl = document.createElement("div");
    postEl.className = `post ${data.pinned ? "pinned" : ""}`;
    postEl.innerHTML = `
      <div class="post-header">
        <strong>${data.pinned ? "📌 " : ""}${data.title}</strong>
        <div class="post-actions">
          ${currentUser.uid === data.uid ? `
            <button class="secondary btn-edit" data-id="${id}">수정</button>
            <button class="danger btn-del" data-id="${id}">삭제</button>
          ` : ""}
        </div>
      </div>

      <p>${formattedContent}</p>
      <div class="post-author">${data.author || "익명"} · ${date}</div>

      <!-- 댓글 영역 -->
      <div class="comment-box" data-post="${id}">
        <div class="comment-list" id="cmt-list-${id}"></div>
        <textarea class="comment-input" id="cmt-input-${id}" placeholder="댓글을 입력하세요..."></textarea>
        <button class="primary comment-add" data-post="${id}" style="margin-top:6px;">댓글 등록</button>
      </div>
    `;
    postList.appendChild(postEl);

    await loadComments(id);
  }
}

/* ===========================================
   💬 댓글 불러오기
=========================================== */
async function loadComments(postId) {
  const listEl = document.getElementById(`cmt-list-${postId}`);
  if (!listEl) return;
  listEl.innerHTML = "";

  const qy = query(
    collection(db, `board/${postId}/comments`),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(qy);

  snap.forEach((cmtDoc) => {
    const c = cmtDoc.data();
    const cId = cmtDoc.id;
    const date = c.createdAt?.toDate?.().toLocaleString("ko-KR") || "-";
    const canDelete = c.uid === currentUser.uid;
    const body = (c.text || "").replace(/\n/g, "<br>");

    const item = document.createElement("div");
    item.className = "comment";
    item.innerHTML = `
      <div style="margin-bottom:4px;">${body}</div>
      <small>${c.author || "익명"} · ${date}</small>
      <div class="cmt-actions">
        ${canDelete ? `<button class="danger cmt-del" data-post="${postId}" data-id="${cId}">삭제</button>` : ""}
      </div>
    `;
    listEl.appendChild(item);
  });
}

/* ===========================================
   🧭 게시글/댓글 이벤트
=========================================== */
postList.addEventListener("click", async (e) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  // 게시글 삭제
  if (target.classList.contains("btn-del")) {
    const id = target.dataset.id;
    if (!id || !confirm("이 게시글을 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "board", id));
    loadPosts();
    return;
  }

  // 게시글 수정
  if (target.classList.contains("btn-edit")) {
    const id = target.dataset.id;
    if (!id) return;
    openEditModal(id);
    return;
  }

  // 댓글 등록
  if (target.classList.contains("comment-add")) {
    const postId = target.dataset.post;
    const input = document.getElementById(`cmt-input-${postId}`);
    const text = (input?.value || "").trim();
    if (!text) return;
    await addDoc(collection(db, `board/${postId}/comments`), {
      text,
      author: currentUser.displayName || currentUser.email,
      uid: currentUser.uid,
      createdAt: serverTimestamp(),
    });
    input.value = "";
    await loadComments(postId);
    return;
  }

  // 댓글 삭제
  if (target.classList.contains("cmt-del")) {
    const postId = target.dataset.post;
    const cId = target.dataset.id;
    if (!postId || !cId || !confirm("이 댓글을 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, `board/${postId}/comments`, cId));
    await loadComments(postId);
  }
});

/* ===========================================
   ✏️ 게시글 수정 모달
=========================================== */
async function openEditModal(id) {
  const snap = await getDocs(collection(db, "board"));
  const data = snap.docs.find((d) => d.id === id)?.data();
  if (!data) {
    alert("게시글을 불러올 수 없습니다.");
    return;
  }

  const bg = document.createElement("div");
  bg.className = "modal-bg";

  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = `
    <h3>게시글 수정</h3>
    <input id="editTitle" type="text" value="${data.title || ""}">
    <textarea id="editContent" rows="6">${data.content || ""}</textarea>
    <label for="editPinned" style="display:flex;align-items:center;gap:8px;margin-top:8px;">
      <span>상단 고정</span>
      <input type="checkbox" id="editPinned" ${data.pinned ? "checked" : ""}>
    </label>
    <div class="modal-actions">
      <button id="btnSave" class="primary">저장</button>
      <button id="btnClose" class="secondary">닫기</button>
    </div>
  `;
  bg.appendChild(modal);
  document.body.appendChild(bg);

  modal.querySelector("#btnClose").addEventListener("click", () => bg.remove());
  modal.querySelector("#btnSave").addEventListener("click", async () => {
    const title = modal.querySelector("#editTitle").value.trim();
    const content = modal.querySelector("#editContent").value.trim();
    const pinned = modal.querySelector("#editPinned").checked;
    if (!title || !content) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    await updateDoc(doc(db, "board", id), { title, content, pinned });
    bg.remove();
    loadPosts();
  });
}
