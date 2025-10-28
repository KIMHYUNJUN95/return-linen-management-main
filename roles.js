// ========================================
// 🔐 HARU Roles Utility (roles.js)
// ========================================

import { db } from "./storage.js";  // ✅ 상대 경로로 수정
import {
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * ✅ 사용자 이메일 기반으로 권한(role) 조회
 * @param {string} email 사용자 이메일
 * @returns {"admin" | "user"} 권한 문자열 반환
 */
export async function getUserRoleByEmail(email) {
  if (!email) return "user";

  try {
    const q = query(collection(db, "users"), where("email", "==", email));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.warn(`⚠️ 사용자 정보 없음: ${email}`);
      return "user";
    }

    const userDoc = snap.docs[0].data();
    const role = userDoc.role || "user";
    return role;
  } catch (err) {
    console.error("❌ 권한 확인 실패:", err);
    return "user";
  }
}

/**
 * ✅ 관리자 전용 기능 보호용 (선택적 사용)
 * 특정 DOM 버튼/영역을 admin만 보이게 처리할 때 사용
 * @param {string} selector CSS 선택자
 */
export function hideIfNotAdmin(selector) {
  const element = document.querySelector(selector);
  if (!element) return;

  getUserRoleByEmail(auth?.currentUser?.email).then((role) => {
    if (role !== "admin") element.style.display = "none";
  });
}

/**
 * ✅ 관리자 여부 Boolean으로 반환
 * (Promise<boolean>)
 */
export async function isAdmin(email) {
  const role = await getUserRoleByEmail(email);
  return role === "admin";
}
