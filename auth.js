// ========================================
// 🔐 HARU Authentication Logic (Login & Signup)
// ========================================

// ✅ [중요] storage.js가 같은 폴더에 있어야 합니다.
import { db, auth } from "./storage.js"; 
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("✅ auth.js loaded - HARU System");

// DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

/* ⚠️ 에러 메시지 표시 함수 */
const errorBox = document.createElement("div");
Object.assign(errorBox.style, {
    color: "#E74C3C", fontWeight: "600", marginTop: "15px",
    fontSize: "13px", textAlign: "center", display: "none"
});

function showError(msg, targetForm) {
  errorBox.textContent = msg;
  errorBox.style.display = "block";
  if (targetForm) {
    targetForm.appendChild(errorBox);
  }
}

function clearError() {
  errorBox.style.display = "none";
}

/* ========================================
   ✅ 로그인 상태 확인 (자동 이동)
======================================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) return; // 비로그인 상태면 대기

  const isAuthPage = !!document.getElementById("loginForm"); 
  
  try {
      // DB에 유저 정보가 없으면 자동 생성 (데이터 복구)
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            name: user.displayName || "User",
            role: "user",
            createdAt: serverTimestamp(),
        }, { merge: true });
      }

      // 로그인 페이지라면 메인(worklog.html)으로 이동
      if (isAuthPage) {
          console.log("Login success! Redirecting...");
          // 업무 일지 페이지로 이동
          window.location.href = "worklog.html";
      }
  } catch (err) {
      console.error("Auth State Error:", err);
      // 에러가 나더라도 로그인은 성공했으므로 이동
      if (isAuthPage) window.location.href = "worklog.html";
  }
});

/* ========================================
   🚀 로그인 버튼 클릭 이벤트
======================================== */
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    console.log("🚀 Login button clicked");

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = loginForm.querySelector('button');

    if (!email || !password) return showError("이메일과 비밀번호를 입력해주세요.", loginForm);

    try {
      btn.disabled = true;
      btn.textContent = "LOGGING IN...";
      
      await signInWithEmailAndPassword(auth, email, password);
      // 성공하면 위쪽 onAuthStateChanged에서 자동으로 페이지 이동됨
      
    } catch (error) {
      console.error("Login Error:", error);
      let msg = "로그인에 실패했습니다.";
      if(error.code === 'auth/invalid-credential') msg = "이메일 또는 비밀번호가 잘못되었습니다.";
      if(error.code === 'auth/user-not-found') msg = "등록되지 않은 사용자입니다.";
      if(error.code === 'auth/wrong-password') msg = "비밀번호가 틀렸습니다.";
      
      showError(msg, loginForm);
      btn.disabled = false;
      btn.textContent = "Sign In";
    }
  });
}

/* ========================================
   📝 회원가입 버튼 클릭 이벤트
======================================== */
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPw').value;
    const btn = signupForm.querySelector('button');

    if (!name || !email || !password) return showError("모든 필드를 입력해주세요.", signupForm);

    try {
      btn.disabled = true;
      btn.textContent = "CREATING...";

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      // Firestore에 사용자 정보 저장 (uid 필수)
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        email: email,
        role: "user",
        createdAt: serverTimestamp()
      });

      alert("회원가입 완료! 로그인합니다.");
      // 자동 로그인됨 -> onAuthStateChanged가 처리

    } catch (error) {
      console.error("Signup Error:", error);
      let msg = "가입 오류: " + error.code;
      if (error.code === 'auth/email-already-in-use') msg = "이미 사용 중인 이메일입니다.";
      if (error.code === 'auth/weak-password') msg = "비밀번호는 6자 이상이어야 합니다.";
      
      showError(msg, signupForm);
      btn.disabled = false;
      btn.textContent = "Register";
    }
  });
}