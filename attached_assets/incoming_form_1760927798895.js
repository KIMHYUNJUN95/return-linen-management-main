// incoming_form.js — 린넨명 통일 + 레거시 스키마 저장
import { db, auth, storage } from "./storage.js";
import {
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

function $(sel) { return document.querySelector(sel); }

const form = $("#incomingForm");
const buildingEl = $("#building");
const dateEl = $("#date");
const staffEl = $("#staff");
const descEl = $("#desc");
const photoEl = $("#photo");
const linenPayloadEl = $("#linenPayload");

// ✅ 공식 린넨 목록
const OFFICIAL_LINENS = [
  "싱글 이불 커버",
  "싱글 매트 커버",
  "더블 이불 커버",
  "더블 매트 커버",
  "더블 매트 커버(고무)",
  "배게 커버",
  "수건타월",
  "발매트"
];

// ✅ 이름 정규화
function normalizeLinenName(name) {
  if (!name) return "";
  const clean = name.replace(/\s+/g, "").trim();
  for (const official of OFFICIAL_LINENS) {
    if (clean.includes(official.replace(/\s+/g, ""))) return official;
  }
  return name;
}

// ✅ 날짜 기본값 오늘
if (!dateEl.value) {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  dateEl.value = `${yyyy}-${mm}-${dd}`;
}

// ✅ 사진 업로드
async function uploadAllImages(docId, files) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const path = `incoming/${docId}/${Date.now()}_${i}_${f.name}`;
    const sref = ref(storage, path);
    await uploadBytes(sref, f);
    const url = await getDownloadURL(sref);
    urls.push(url);
  }
  return urls;
}

// ✅ 폼 제출
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const buildingId = buildingEl.value.trim();
  const date = dateEl.value.trim();
  const staffName = staffEl.value.trim();
  const desc = descEl.value.trim();

  let items = [];
  try {
    if (linenPayloadEl && linenPayloadEl.value) {
      const parsed = JSON.parse(linenPayloadEl.value);
      items = parsed.map(x => ({
        linenType: normalizeLinenName(String(x.type)),
        receivedCount: Number(x.qty)
      }));
    }
  } catch (err) {
    console.warn("린넨 JSON 파싱 실패:", err);
  }

  if (!buildingId) return alert("건물을 선택하세요.");
  if (!date) return alert("날짜를 입력하세요.");
  if (!staffName) return alert("담당자 이름을 입력하세요.");
  if (!items.length) return alert("린넨을 최소 1개 이상 추가하세요.");

  const userEmail = auth?.currentUser?.email || null;

  const payload = {
    buildingId,
    staffName,
    date,
    status: "received",
    desc,
    items,
    imageUrls: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    userEmail
  };

  try {
    const docRef = await addDoc(collection(db, "incoming"), payload);

    const files = photoEl.files || [];
    if (files.length > 0) {
      const urls = await uploadAllImages(docRef.id, files);
      await updateDoc(doc(db, "incoming", docRef.id), {
        imageUrls: urls,
        updatedAt: serverTimestamp()
      });
    }

    alert("✅ 입고가 등록되었습니다.");
    location.href = "history_dashboard.html";
  } catch (err) {
    console.error(err);
    alert("등록 중 오류가 발생했습니다: " + (err.message || err));
  }
});