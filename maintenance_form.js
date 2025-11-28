// ========================================
// 🛠️ HARU Maintenance Form Controller
// Design System: Tokyo Day Bright
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔴 1. Firebase Initialization
let firebaseConfig = {};
if (window.__firebase_config) {
  try { firebaseConfig = JSON.parse(window.__firebase_config); } catch (e) { console.error(e); }
}

let app, auth, db, storage;
if (firebaseConfig.apiKey) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
} else {
    auth = { onAuthStateChanged: () => {} };
}

/* ========== DOM Elements ========== */
const form = document.getElementById("maintenanceForm");
const photoInput = document.getElementById("photo");
const preview = document.getElementById("photoPreview");
const buildingEl = document.getElementById("building");
const roomEl = document.getElementById("room");
const statusEl = document.getElementById("status");
const descEl = document.getElementById("description");
const repairEl = document.getElementById("repairMethod"); // 🔧 보수방법 필드
const submitBtn = document.getElementById("submitBtn");
const titleEl = document.getElementById("formTitle");

/* ========== Edit Mode Check ========== */
const urlParams = new URLSearchParams(location.search);
const editId = urlParams.get("edit");
let existingPhotos = [];

/* ========== Load Data for Edit ========== */
if (editId && db) {
    (async function loadForEdit() {
        if (titleEl) titleEl.textContent = "EDIT MAINTENANCE (유지보수 수정)";
        if (submitBtn) submitBtn.textContent = "UPDATE (수정 저장)";

        try {
            const snap = await getDoc(doc(db, "maintenance", editId));
            if (!snap.exists()) {
                alert("Data not found.");
                location.href = "maintenance_list.html";
                return;
            }

            const d = snap.data();
            if (buildingEl) buildingEl.value = d.building || "";
            if (roomEl) roomEl.value = d.room || "";
            if (statusEl) statusEl.value = d.status || "접수됨";
            
            // DB field compatibility
            if (descEl) descEl.value = d.issue || d.description || d.desc || "";
            
            // 🔧 Load Repair Method
            if (repairEl) repairEl.value = d.repairMethod || ""; 

            // Image handling
            existingPhotos = Array.isArray(d.imageUrls) && d.imageUrls.length
                ? d.imageUrls
                : d.photoURL ? [d.photoURL] : d.photos || [];

            // Preview existing photos
            preview.innerHTML = existingPhotos.map(url => 
                `<img src="${url}" style="width:80px;height:80px;object-fit:cover;border:1px solid #E2E8F0;margin-right:8px;">`
            ).join("");

        } catch (e) {
            console.error("Load error:", e);
        }
    })();
}

/* ========== Upload Helper ========== */
async function uploadPhotos(files) {
  const urls = [];
  for (const file of files) {
    const storageRef = ref(storage, `maintenance/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    urls.push(await getDownloadURL(storageRef));
  }
  return urls;
}

/* ========== Submit Handler ========== */
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (!db) {
        alert("Database not connected.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "PROCESSING...";

    const building = buildingEl.value.trim();
    const room = roomEl.value.trim();
    const status = statusEl.value.trim();
    const desc = descEl.value.trim();
    const repairMethod = repairEl ? repairEl.value.trim() : ""; // 🔧 Save Repair Method

    if (!building || !room || !desc) {
      alert("Please fill in all required fields.");
      submitBtn.disabled = false;
      submitBtn.textContent = editId ? "UPDATE" : "SUBMIT REQUEST";
      return;
    }

    try {
      const user = auth.currentUser;
      const staff = user ? user.displayName || user.email : "Admin";
      const createdByEmail = user ? user.email : "Admin";

      // New Photo Upload
      const newFiles = Array.from(photoInput.files || []);
      const newUrls = newFiles.length ? await uploadPhotos(newFiles) : [];

      // Merge photos
      const imageUrls = [...existingPhotos, ...newUrls];
      const photoURL = imageUrls[0] || ""; 

      const data = {
        building,
        room,
        issue: desc,
        staff,
        createdByEmail,
        status,
        repairMethod, // 🔧 Save to DB
        imageUrls,
        photoURL,
        updatedAt: serverTimestamp(),
      };

      if (editId) {
        // Update
        await updateDoc(doc(db, "maintenance", editId), data);
        alert("Updated successfully.");
      } else {
        // Create
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, "maintenance"), data);
        alert("Registered successfully.");
      }

      location.href = "maintenance_list.html";

    } catch (err) {
      console.error("Save Error:", err);
      alert("Error saving data.");
      submitBtn.disabled = false;
      submitBtn.textContent = editId ? "UPDATE" : "SUBMIT REQUEST";
    }
  });
}

/* ========== Photo Preview ========== */
if (photoInput) {
  photoInput.addEventListener("change", () => {
    // Re-render existing
    let html = existingPhotos.map(url => `<img src="${url}" style="width:80px;height:80px;object-fit:cover;border:1px solid #E2E8F0;margin-right:8px;">`).join("");
    
    [...photoInput.files].forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const src = URL.createObjectURL(file);
      html += `<img src="${src}" style="width:80px;height:80px;object-fit:cover;border:1px solid #E2E8F0;margin-right:8px;">`;
    });
    
    preview.innerHTML = html;
  });
}

// Auth Check
if (auth) {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
             alert("Please login.");
             location.href = "index.html";
        }
    });
}