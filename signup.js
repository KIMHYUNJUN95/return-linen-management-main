// ========================================
// 🔐 HARU Authentication (Login & Signup)
// Refined for: Tokyo Christmas Edition
// ========================================

// ✅ [수정됨] storage.js에서 통합된 객체 가져오기 (중복 초기화 방지)
import { db, auth } from "./storage.js"; 
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 2. DOM Elements
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

/* ⚠️ 에러 메시지 스타일링 */
const errorBox = document.createElement("div");
errorBox.id = "authErrorBox";
Object.assign(errorBox.style, {
    color: "#E74C3C",
    fontWeight: "600",
    marginTop: "15px",
    fontSize: "13px",
    textAlign: "center",
    letterSpacing: "0.05em",
    fontFamily: "'Noto Sans KR', sans-serif",
    display: "none"
});

function showError(msg, targetForm) {
  errorBox.textContent = msg;
  errorBox.style.display = "block";
  if (targetForm) {
    targetForm.parentNode.insertBefore(errorBox, targetForm.nextElementSibling);
  }
}

function clearError() {
  errorBox.textContent = "";
  errorBox.style.display = "none";
}

/* ========================================
   ✅ 로그인 상태 확인 및 자동 데이터 생성
   (제안해주신 로직 적용)
======================================== */
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  // 현재 페이지가 로그인 페이지라면 메인으로 이동
  const isAuthPage = !!document.getElementById("loginForm"); 
  
  try {
      // 🔥 users 문서를 "uid" 기준으로 조회
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      // 🔥 Firestore에 데이터가 없으면 자동 생성 (Self-healing)
      if (!userSnap.exists()) {
        console.log("User data missing, creating now...");
        await setDoc(
          userRef,
          {
            uid: user.uid,           // 🔥 필수: 보안 규칙 통과용
            email: user.email,
            name: user.displayName || "User",
            role: "user",
            createdAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      if (isAuthPage) {
          console.log("Login success! Redirecting...");
          window.location.href = "worklog.html";
      }
  } catch (err) {
      console.error("Auth State Error:", err);
      // 권한 에러 시에도 로그인은 유지되도록 함
      if (isAuthPage) window.location.href = "worklog.html";
  }
});

// ========================================
// 🚀 Login Logic
// ========================================
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = loginForm.querySelector('button');

    if (!email || !password) return showError("이메일과 비밀번호를 입력해주세요.", loginForm);

    try {
      btn.disabled = true;
      btn.textContent = "LOGGING IN...";
      
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged에서 이동 처리됨
      
    } catch (error) {
      console.error("Login Error:", error);
      let msg = "로그인에 실패했습니다.";
      if(error.code === 'auth/invalid-credential') msg = "이메일 또는 비밀번호가 잘못되었습니다.";
      showError(msg, loginForm);
      
      btn.disabled = false;
      btn.textContent = "LOGIN";
    }
  });
}

// ========================================
// 📝 Signup Logic
// ========================================
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
      btn.textContent = "CREATING ACCOUNT...";

      // 1. 계정 생성
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Auth 프로필 업데이트
      await updateProfile(user, { displayName: name });

      // 3. Firestore 저장 (UID 기준)
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,  // 🔥 필수
        name: name,
        email: email,
        role: "user",
        createdAt: serverTimestamp()
      });

      alert("회원가입이 완료되었습니다!");
      // onAuthStateChanged에서 이동 처리됨

    } catch (error) {
      console.error("Signup Error:", error);
      let msg = "가입 중 오류가 발생했습니다.";
      if (error.code === 'auth/email-already-in-use') msg = "이미 사용 중인 이메일입니다.";
      if (error.code === 'auth/weak-password') msg = "비밀번호는 6자 이상이어야 합니다.";
      
      showError(msg, signupForm);
      btn.disabled = false;
      btn.textContent = "Sign Up";
    }
  });
}