// ========================================
// 💬 HARU Chat Logic (Tokyo Day Bright)
// ========================================

import { initHeaderMenu } from "./header.js";
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

/* ✅ 1. 헤더 로드 (HTML 인라인 스크립트 대체) */
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
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const imageInput = document.getElementById("imageInput");
const meName = document.getElementById("meName");

let currentUser = null;
let isAdmin = false;
let lastMessageTimestamp = 0;

/* ✅ 관리자 UID 설정 (기존 유지) */
const ADMIN_UIDS = ["YOUR_ADMIN_UID_HERE"];

/* ===========================================
   🧑 로그인 상태 체크
=========================================== */
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    // 영문 대신 한국어 표기
    meName.textContent = user.displayName || "익명 사용자";
    isAdmin = ADMIN_UIDS.includes(user.uid);
    loadMessages();
  } else {
    // 디자인 컨셉에 맞게 경고 메시지는 유지하되 톤앤매너 고려
    alert("로그인이 필요한 서비스입니다.");
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
  
  // 내용이 없으면 리턴
  if (!text && !file) return;

  let imageUrl = null;

  try {
    // 이미지 업로드 로직
    if (file) {
      const storageRef = ref(storage, `chat_images/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      imageUrl = await getDownloadURL(snapshot.ref);
      imageInput.value = ""; // 입력 초기화
    }

    // Firestore 저장
    await addDoc(collection(db, "chat"), {
      text,
      imageUrl,
      uid: currentUser.uid,
      userName: currentUser.displayName || "익명",
      createdAt: serverTimestamp()
    });

    chatInput.value = "";
  } catch (err) {
    console.error("메시지 전송 오류:", err);
    alert("메시지 전송에 실패했습니다.");
  }
});

/* ===========================================
   📥 메시지 불러오기 (실시간 & 디자인 적용)
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
        
      // 날짜 포맷 (한국어, 미니멀)
      const createdAtString = createdAt
        ? createdAt.toLocaleString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false // 24시간제 (깔끔함)
          })
        : "";

      // 메시지 렌더링 요소 생성
      const div = document.createElement("div");
      div.classList.add("message");
      // 내 메시지인지 확인하여 클래스 추가 (CSS에서 색상 처리)
      const isSelf = msg.uid === currentUser?.uid;
      div.classList.add(isSelf ? "self" : "other");

      let contentHtml = "";
      
      // 텍스트 내용
      if (msg.text) {
        contentHtml += `<div>${msg.text}</div>`;
      }
      
      // 이미지 내용
      if (msg.imageUrl) {
        contentHtml += `
          <div style="margin-top:8px;">
            <img src="${msg.imageUrl}" alt="첨부 이미지" loading="lazy">
          </div>`;
      }

      // 삭제 권한 체크
      const canDelete = isAdmin || isSelf;
      const deleteBtn = canDelete
        ? `<button class="delete-btn" data-id="${id}">삭제</button>`
        : "";

      // HTML 구조 조립 (CSS 클래스 매칭: sender-name, meta)
      div.innerHTML = `
        <span class="sender-name">${msg.userName}</span>
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

    // 삭제 버튼 이벤트 연결
    attachDeleteHandlers();
    
    // 스크롤 최하단으로 이동
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // ✅ 새 메시지 알림 (뱃지)
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
    btn.addEventListener("click", async (e) => {
      e.preventDefault(); // 버튼 기본 동작 방지
      const id = btn.dataset.id;
      
      if (!confirm("정말로 이 메시지를 삭제하시겠습니까?")) return;

      try {
        await deleteDoc(doc(db, "chat", id));
      } catch (err) {
        console.error("삭제 오류:", err);
        alert("삭제 중 문제가 발생했습니다.");
      }
    });
  });
}

/* ===========================================
   🔔 채팅 뱃지 기능 (UI Minimal Update)
=========================================== */
function showChatBadge() {
  const chatMenu = document.querySelector('[data-menu="chat"]');
  if (!chatMenu) return;

  let badge = chatMenu.querySelector(".chat-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "chat-badge";
    // 이모지 대신 깔끔한 점(Dot)으로 표시
    badge.style.display = "inline-block";
    badge.style.width = "6px";
    badge.style.height = "6px";
    badge.style.backgroundColor = "#E74C3C"; // Red Point
    badge.style.borderRadius = "50%";
    badge.style.marginLeft = "8px";
    badge.style.verticalAlign = "middle";
    
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