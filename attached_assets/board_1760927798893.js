import { auth } from "./auth.js";
import { db } from "./storage.js";
import {
  collection, addDoc, getDocs, deleteDoc, updateDoc,
  doc, serverTimestamp, orderBy, query
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const postForm = document.getElementById("postForm");
  const postList = document.getElementById("postList");
  const pinnedBox = document.getElementById("pinned");

  let currentUser = null;

  /* ===== 인증 ===== */
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      location.href = "signup.html";
      return;
    }
    currentUser = user;
    loadPosts();
  });

  /* ===== 게시글 등록 ===== */
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = document.getElementById("title").value.trim();
    const content = document.getElementById("content").value.trim();
    const pinned = pinnedBox.checked;
    if (!title || !content) return alert("제목과 내용을 입력하세요.");

    await addDoc(collection(db, "board"), {
      title,
      content,              // 줄바꿈은 DB에 그대로 저장
      pinned,
      author: currentUser.displayName || currentUser.email,
      uid: currentUser.uid,
      createdAt: serverTimestamp(),
    });

    postForm.reset();
    loadPosts();
  });

  /* ===== 게시글 목록 ===== */
  async function loadPosts() {
    postList.innerHTML = "<p>불러오는 중...</p>";
    const qy = query(
      collection(db, "board"),
      orderBy("pinned", "desc"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(qy);
    postList.innerHTML = "";

    if (snap.empty) {
      postList.innerHTML = "<p>등록된 게시물이 없습니다.</p>";
      return;
    }

    for (const docSnap of snap.docs) {
      const d = docSnap.data();
      const id = docSnap.id;
      const date = d.createdAt?.toDate?.().toLocaleString("ko-KR") || "-";

      // ✅ 줄바꿈 & 연속 공백 보존
      const formattedContent = (d.content || "")
        .replace(/\n/g, "<br>")
        .replace(/\s{2,}/g, (s) => "&nbsp;".repeat(s.length));

      const postEl = document.createElement("div");
      postEl.className = `post ${d.pinned ? "pinned" : ""}`;
      postEl.innerHTML = `
        <div class="post-header">
          <strong>${d.pinned ? "📌 " : ""}${d.title}</strong>
          <div class="post-actions">
            ${currentUser.uid === d.uid ? `
              <button class="secondary btn-edit" data-id="${id}">수정</button>
              <button class="danger btn-del" data-id="${id}">삭제</button>
            ` : ""}
          </div>
        </div>

        <p>${formattedContent}</p>
        <div class="post-author">${d.author || "직원"} · ${date}</div>

        <!-- ✅ 댓글 영역 -->
        <div class="comment-box" data-post="${id}">
          <div class="comment-list" id="cmt-list-${id}"></div>
          <textarea class="comment-input" id="cmt-input-${id}" placeholder="댓글을 입력하세요..."></textarea>
          <button class="primary comment-add" data-post="${id}" style="margin-top:6px;">댓글 등록</button>
        </div>
      `;
      postList.appendChild(postEl);

      // 댓글 로드
      await loadComments(id);
    }
  }

  /* ===== 댓글 로드 ===== */
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

      const body = (c.text || "").replace(/\n/g, "<br>");
      const canDel = c.uid === currentUser.uid; // 자신의 댓글만 삭제

      const item = document.createElement("div");
      item.className = "comment";
      item.innerHTML = `
        <div style="margin-bottom:4px;">${body}</div>
        <small>${c.author || "직원"} · ${date}</small>
        <div class="cmt-actions">
          ${canDel ? `<button class="danger cmt-del" data-post="${postId}" data-id="${cId}">삭제</button>` : ""}
        </div>
      `;
      listEl.appendChild(item);
    });
  }

  /* ===== 이벤트 위임: 수정/삭제/댓글등록/댓글삭제 ===== */
  postList.addEventListener("click", async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    // 게시글 삭제
    if (target.classList.contains("btn-del")) {
      const id = target.dataset.id;
      if (!id) return;
      if (!confirm("이 게시글을 삭제하시겠습니까?")) return;
      await deleteDoc(doc(db, "board", id));
      loadPosts();
      return;
    }

    // 게시글 수정 모달
    if (target.classList.contains("btn-edit")) {
      const id = target.dataset.id;
      if (!id) return;
      openEditModal(id);
      return;
    }

    // 댓글 등록
    if (target.classList.contains("comment-add")) {
      const postId = target.dataset.post;
      if (!postId) return;
      const input = document.getElementById(`cmt-input-${postId}`);
      const text = (input?.value || "").trim();
      if (!text) return;
      await addDoc(collection(db, `board/${postId}/comments`), {
        text,
        author: currentUser.displayName || currentUser.email,
        uid: currentUser.uid,
        createdAt: serverTimestamp(),
      });
      if (input) input.value = "";
      await loadComments(postId);
      return;
    }

    // 댓글 삭제
    if (target.classList.contains("cmt-del")) {
      const postId = target.dataset.post;
      const cId = target.dataset.id;
      if (!postId || !cId) return;
      if (!confirm("이 댓글을 삭제하시겠습니까?")) return;
      await deleteDoc(doc(db, `board/${postId}/comments`, cId));
      await loadComments(postId);
      return;
    }
  });

  /* ===== 카드형 수정 모달 ===== */
  async function openEditModal(id) {
    // 필요한 문서만 읽기
    const qy = query(collection(db, "board"));
    const snap = await getDocs(qy);
    const data = snap.docs.find((d) => d.id === id)?.data();
    if (!data) return alert("게시글을 찾을 수 없습니다.");

    const bg = document.createElement("div");
    bg.className = "modal-bg";

    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
      <h3>게시글 수정</h3>
      <input id="editTitle" type="text" value="${data.title || ""}">
      <textarea id="editContent" rows="6">${data.content || ""}</textarea>
      <label for="editPinned" style="display:flex;align-items:center;gap:8px;margin-top:8px;">
        <span>공지로 고정</span>
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
      if (!title || !content) return alert("제목과 내용을 입력하세요.");

      await updateDoc(doc(db, "board", id), { title, content, pinned });
      bg.remove();
      loadPosts();
    });
  }
});
