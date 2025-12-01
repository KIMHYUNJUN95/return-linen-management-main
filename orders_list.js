// ========================================
// 🛒 HARU Orders List Controller
// Design System: Tokyo Day Bright (No Emoji, Sharp Edges)
// ========================================

import { db, auth } from "./storage.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// DOM Elements
const ordersList = document.getElementById("ordersList");
const emptyState = document.getElementById("emptyState");
const filterStatus = document.getElementById("filterStatus");
const filterUrgency = document.getElementById("filterUrgency");

const startDateEl = document.getElementById("startDate");
const endDateEl = document.getElementById("endDate");
const btnDateSearch = document.getElementById("btnDateSearch");
const orderCountEl = document.getElementById("orderCount");

let allOrders = [];

// ========================================
// 🛠 Helpers
// ========================================

// 날짜 포맷 (YYYY. MM. DD. HH:MM)
function formatDate(ts) {
  if (!ts) return "-";
  try {
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  } catch {
    return "-";
  }
}

// 상태 배지
function getStatusBadge(status) {
  const styles = {
    pending:  "color: #F1C40F; border: 1px solid #F1C40F;",
    approved: "color: #2980b9; border: 1px solid #2980b9;",
    completed:"color: #27ae60; border: 1px solid #27ae60;",
    rejected: "color: #E74C3C; border: 1px solid #E74C3C;"
  };
  
  const label = {
    pending: "PENDING",
    approved: "APPROVED",
    completed:"COMPLETED",
    rejected: "REJECTED"
  };

  const style = styles[status] || "color: #64748B; border: 1px solid #64748B;";
  const text = label[status] || "UNKNOWN";

  return `<span style="${style} padding: 4px 8px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.05em;">${text}</span>`;
}

// 긴급도 배지
function getUrgencyBadge(urgency) {
  if (urgency === "일반") return `<span style="color: #64748B; font-size: 0.8rem; font-weight: 600;">NORMAL</span>`;
  
  let color = "#2C3E50";
  let label = "URGENT";
  
  if (urgency === "긴급") color = "#E67E22";
  if (urgency === "매우긴급") {
    color = "#E74C3C";
    label = "CRITICAL";
  }

  return `<span style="color: ${color}; font-weight: 800; font-size: 0.8rem; letter-spacing: 0.05em; text-transform:uppercase;">${label}</span>`;
}

// ========================================
// 🎨 Rendering
// ========================================

function renderOrders(orders) {
  if (orders.length === 0) {
    ordersList.style.display = "none";
    if(emptyState) emptyState.style.display = "block";
    if(orderCountEl) orderCountEl.textContent = "";
    return;
  }

  ordersList.style.display = "grid";
  if(emptyState) emptyState.style.display = "none";

  if(orderCountEl) {
    orderCountEl.innerHTML = `<span style="font-weight:400; color:var(--color-text-secondary);">TOTAL:</span> ${orders.length}`;
  }

  ordersList.innerHTML = orders.map((order) => {
    const items = (order.items || []).map(item => {
      const linkHtml = item.link
        ? `<a href="${item.link}" target="_blank" style="color:var(--color-accent); font-weight:700; font-size:0.75rem; text-decoration:none; margin-left:8px;">[LINK]</a>`
        : '';
      
      return `
        <div class="item" style="border-bottom: 1px solid #f1f5f9;">
          <span style="font-weight:600;">${item.name} <span style="font-weight:400; color:#94a3b8; font-size:0.8rem;">/ ${item.category}</span>${linkHtml}</span>
          <span style="font-weight:700;">${item.quantity}</span>
        </div>
      `;
    }).join('');

    const buildingInfo = order.building 
      ? `<span style="color:#94a3b8; margin-right:4px;">BLDG:</span> ${order.building}` 
      : "";
    
    const requesterName = order.requesterName || order.createdBy || "Anonymous";
    const requesterInfo = `<span style="color:#94a3b8; margin-right:4px;">REQ:</span> ${requesterName}`;

    let actionButtons = '';
    
    if (order.status === 'pending') {
      actionButtons = `
        <button class="btn btn-sm" style="border:1px solid #2980b9; color:#2980b9; background:white;" onclick="approveOrder('${order.id}')">APPROVE</button>
        <button class="btn btn-sm" style="border:1px solid #E74C3C; color:#E74C3C; background:white;" onclick="rejectOrder('${order.id}')">REJECT</button>
        <button class="btn btn-sm" style="border:1px solid #64748B; color:#64748B; background:white;" onclick="editOrder('${order.id}')">EDIT</button>
      `;
    } else if (order.status === 'approved') {
      actionButtons = `
        <button class="btn btn-sm" style="background:#27ae60; color:white; border:none;" onclick="completeOrder('${order.id}')">COMPLETE</button>
      `;
    }
    
    const deleteBtn = `<button class="btn btn-sm" style="color:#94a3b8; font-size:0.8rem; border:none; background:transparent; text-decoration:underline;" onclick="deleteOrder('${order.id}')">DELETE</button>`;

    return `
      <div class="order-card">
        <div class="order-header">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="font-family:'Inter'; font-weight:800; font-size:0.9rem; color:#cbd5e1;">#${order.id.substring(0, 8).toUpperCase()}</div>
            <div class="order-meta" style="margin-top:4px;">
              ${formatDate(order.createdAt)}<br>
              ${requesterInfo}<br>
              ${buildingInfo}
            </div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
            ${getStatusBadge(order.status)}
            ${getUrgencyBadge(order.urgency)}
          </div>
        </div>

        <div class="order-items" style="background:#f8fafc; padding:12px; margin-bottom:12px;">
          ${items}
        </div>

        ${order.notes ? `<p style="font-size:0.85rem; color:#64748B; background:#fffbe6; padding:8px; border:1px solid #ffe58f; margin-bottom:12px;"><span style="font-weight:700;">NOTE:</span> ${order.notes}</p>` : ''}

        <div class="order-actions" style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; gap:8px;">
            ${actionButtons}
          </div>
          ${deleteBtn}
        </div>
      </div>
    `;
  }).join('');
}

// ========================================
// 🔍 Filtering Logic
// ========================================

function filterByDate(list) {
  const start = startDateEl.value ? new Date(startDateEl.value) : null;
  const end = endDateEl.value ? new Date(endDateEl.value + " 23:59:59") : null;

  if (!start && !end) return list;

  return list.filter(order => {
    if (!order.createdAt) return false;
    const created = order.createdAt.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    if (start && created < start) return false;
    if (end && created > end) return false;
    return true;
  });
}

function applyFilters() {
  const status = filterStatus.value;
  const urgency = filterUrgency.value;

  let filtered = [...allOrders];

  filtered = filterByDate(filtered);

  if (status) filtered = filtered.filter(o => o.status === status);
  if (urgency) filtered = filtered.filter(o => o.urgency === urgency);

  renderOrders(filtered);
}

// ========================================
// 📡 Data Loading
// ========================================

async function loadOrders() {
  try {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    allOrders = snapshot.docs.map(doc => {
      return { 
        id: doc.id, 
        uid: doc.data().uid || null,  // 🔥 uid 필드 누락 시 null로 안전하게 처리
        ...doc.data() 
      };
    });

    applyFilters();
  } catch (err) {
    console.error("❌ 주문 로드 오류:", err);
    console.log("Error loading orders data");
  }
}

// ========================================
// 🖱 Event Listeners
// ========================================

if(filterStatus) filterStatus.addEventListener("change", applyFilters);
if(filterUrgency) filterUrgency.addEventListener("change", applyFilters);
if(btnDateSearch) btnDateSearch.addEventListener("click", applyFilters);

// ========================================
// 🌐 Window Actions (User Action Handlers)
// ========================================

// 공통 에러 핸들러
function handleActionError(error, actionName) {
    console.error(`${actionName} 오류:`, error);
    if (error.code === 'permission-denied') {
        alert("권한이 없습니다.\n(본인이 작성한 주문만 처리하거나, 관리자 권한이 필요합니다.)");
    } else {
        alert(`${actionName} 중 오류가 발생했습니다: ${error.message}`);
    }
}

window.approveOrder = async (id) => {
  if (!auth.currentUser) return alert("로그인이 필요합니다.");
  if (!confirm("Approve this order?")) return;
  
  try {
    await updateDoc(doc(db, "orders", id), { status: "approved", updatedAt: serverTimestamp() });
    await loadOrders();
  } catch(e) { handleActionError(e, "승인"); }
};

window.rejectOrder = async (id) => {
  if (!auth.currentUser) return alert("로그인이 필요합니다.");
  if (!confirm("Reject this order?")) return;
  
  try {
    await updateDoc(doc(db, "orders", id), { status: "rejected", updatedAt: serverTimestamp() });
    await loadOrders();
  } catch(e) { handleActionError(e, "반려"); }
};

window.completeOrder = async (id) => {
  if (!auth.currentUser) return alert("로그인이 필요합니다.");
  if (!confirm("Mark as completed?")) return;
  
  try {
    await updateDoc(doc(db, "orders", id), { status: "completed", updatedAt: serverTimestamp() });
    await loadOrders();
  } catch(e) { handleActionError(e, "완료 처리"); }
};

window.deleteOrder = async (id) => {
  if (!auth.currentUser) return alert("로그인이 필요합니다.");
  if (!confirm("Permanently delete this order?")) return;
  
  try {
    await deleteDoc(doc(db, "orders", id));
    await loadOrders();
    alert("삭제되었습니다.");
  } catch(e) { handleActionError(e, "삭제"); }
};

window.editOrder = (id) => {
  location.href = `orders.html?id=${id}`;
};

loadOrders();