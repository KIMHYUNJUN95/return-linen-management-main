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
let lastMessageTimestamp = 0;

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

    let newestTimestamp = lastMessageTimestamp;

    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      const id = docSnap.id;

      const createdAt = msg.createdAt?.toDate
        ? msg.createdAt.toDate()
        : null;
      const createdAtString = createdAt
        ? createdAt.toLocaleString("ko-KR", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      // 메시지 렌더링
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
          <span>${createdAtString}</span>
          ${deleteBtn}
        </div>
      `;
      chatMessages.appendChild(div);

      // 최신 메시지 시간 저장
      if (createdAt && createdAt.getTime() > newestTimestamp) {
        newestTimestamp = createdAt.getTime();
      }
    });

    attachDeleteHandlers();
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // ✅ 새 메시지 도착 && 채팅 페이지가 아닐 때 뱃지 표시
    if (newestTimestamp > lastMessageTimestamp && !location.pathname.includes("chat.html")) {
      showChatBadge();
    }

    lastMessageTimestamp = newestTimestamp;
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

/* ===========================================
   🔔 채팅 뱃지 기능
=========================================== */
function showChatBadge() {
  const chatMenu = document.querySelector('[data-menu="chat"]');
  if (!chatMenu) return;

  let badge = chatMenu.querySelector(".chat-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "chat-badge";
    badge.textContent = "●";
    badge.style.color = "red";
    badge.style.fontSize = "14px";
    badge.style.marginLeft = "6px";
    chatMenu.appendChild(badge);
  }
}

function clearChatBadge() {
  const chatMenu = document.querySelector('[data-menu="chat"]');
  if (!chatMenu) return;
  const badge = chatMenu.querySelector(".chat-badge");
  if (badge) badge.remove();
}

// ✅ 채팅 페이지 진입 시 뱃지 제거
if (location.pathname.includes("chat.html")) {
  clearChatBadge();
}
