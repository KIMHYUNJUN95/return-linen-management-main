import { db, auth, storage } from "./storage.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  query,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* ===========================================
   📌 DOM 요소
=========================================== */
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const imageInput = document.getElementById("imageInput");
const meName = document.getElementById("meName");

let currentUser = null;
let isAdmin = false;

/* ✅ 관리자 UID 설정 */
const ADMIN_UIDS = ["YOUR_ADMIN_UID_HERE"];

/* ===========================================
   🧑 로그인 상태 체크
=========================================== */
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    meName.textContent = user.displayName || "익명";
    isAdmin = ADMIN_UIDS.includes(user.uid);
    loadMessages();
  } else {
    alert("로그인 후 이용 가능합니다.");
    location.href = "login.html";
  }
});

/* ===========================================
   ✉️ 메시지 전송
=========================================== */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = chatInput.value.trim();
  const file = imageInput.files[0];
  if (!text && !file) return;

  let imageUrl = null;

  try {
    if (file) {
      const storageRef = ref(storage, `chat_images/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      imageUrl = await getDownloadURL(snapshot.ref);
      imageInput.value = "";
    }

    await addDoc(collection(db, "chat"), {
      text,
      imageUrl,
      uid: currentUser.uid,
      userName: currentUser.displayName || "익명",
      createdAt: serverTimestamp()
    });

    chatInput.value = "";
  } catch (err) {
    console.error("🚨 메시지 전송 오류:", err);
  }
});

/* ===========================================
   📥 메시지 불러오기 (실시간)
=========================================== */
function loadMessages() {
  const q = query(collection(db, "chat"), orderBy("createdAt", "asc"));

  onSnapshot(q, (snapshot) => {
    chatMessages.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const id = docSnap.id;

      const date = msg.createdAt?.toDate
        ? msg.createdAt.toDate().toLocaleString("ko-KR", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      const div = document.createElement("div");
      div.classList.add("message");
      div.classList.add(msg.uid === currentUser?.uid ? "self" : "other");

      let contentHtml = "";
      if (msg.text) contentHtml += `<div>${msg.text}</div>`;
      if (msg.imageUrl) {
        contentHtml += `
          <div style="margin-top:8px;">
            <img src="${msg.imageUrl}" style="max-width:180px;border-radius:8px;">
          </div>`;
      }

      const canDelete = isAdmin || msg.uid === currentUser.uid;
      const deleteBtn = canDelete
        ? `<span class="delete-btn" data-id="${id}">삭제</span>`
        : "";

      div.innerHTML = `
        <div style="font-weight:600; margin-bottom:2px;">${msg.userName}</div>
        ${contentHtml}
        <div class="meta">
          <span>${date}</span>
          ${deleteBtn}
        </div>
      `;
      chatMessages.appendChild(div);
    });

    attachDeleteHandlers();
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

/* ===========================================
   🗑 메시지 삭제 (권한 체크 포함)
=========================================== */
function attachDeleteHandlers() {
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!confirm("이 메시지를 삭제하시겠습니까?")) return;

      try {
        await deleteDoc(doc(db, "chat", id));
      } catch (err) {
        console.error("🚨 메시지 삭제 오류:", err);
      }
    });
  });
}
