import { auth } from "./auth.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* ✅ 로그인 유지: 이미 로그인된 사용자는 자동 이동 */
onAuthStateChanged(auth, (u)=>{
  if(u) location.href = "return_form.html";
});

/* 🔐 로그인 */
document.getElementById("loginForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const pw = document.getElementById("password").value;
  try{
    await signInWithEmailAndPassword(auth, email, pw);
    location.href = "return_form.html";
  }catch(err){
    alert("로그인 실패: " + (err.message || err));
  }
});

/* 📝 회원가입 */
document.getElementById("signupForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const name = document.getElementById("displayName").value.trim();
  const email = document.getElementById("email2").value.trim();
  const pw = document.getElementById("password2").value;
  
  if(!name){
    alert("이름을 입력하세요.");
    return;
  }

  try{
    const cred = await createUserWithEmailAndPassword(auth, email, pw);
    await updateProfile(cred.user, { displayName: name });
    alert("회원가입 완료! 로그인 화면으로 이동합니다.");
    location.href = "return_form.html";
  }catch(err){
    alert("회원가입 실패: " + (err.message || err));
  }
});