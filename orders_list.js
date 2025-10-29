// ========================================
// 🛒 HARU Orders List (수정 기능 추가)
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

const ordersList = document.getElementById("ordersList");
const emptyState = document.getElementById("emptyState");
const filterStatus = document.getElementById("filterStatus");
const filterUrgency = document.getElementById("filterUrgency");

let allOrders = [];

// 날짜 포맷
function formatDate(ts) {
  if (!ts) return "-";
  try {
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "-";
  }
}

// 상태 배지
function getStatusBadge(status) {
  const badges = {
    pending: '<span class="badge badge-warning">대기중</span>',
    approved: '<span class="badge badge-primary">승인됨</span>',
    completed: '<span class="badge badge-success">완료</span>',
    rejected: '<span class="badge badge-error">거부됨</span>',
  };
  return badges[status] || '<span class="badge badge-glass">알수없음</span>';
}

// 긴급도 배지
function getUrgencyBadge(urgency) {
  const badges = {
    일반: '<span class="badge badge-glass">일반</span>',
    긴급: '<span class="badge badge-warning">긴급</span>',
    매우긴급: '<span class="badge badge-error">매우긴급</span>',
  };
  return badges[urgency] || '';
}

// 주문 렌더링
function renderOrders(orders) {
  if (orders.length === 0) {
    ordersList.style.display = "none";
    emptyState.style.display = "block";
    return;
  }

  ordersList.style.display = "block";
  emptyState.style.display = "none";

  ordersList.innerHTML = orders.map((order) => {
    const items = (order.items || []).map(item => {
      const linkHtml = item.link
        ? `<a href="${item.link}" target="_blank" style="color:hsl(var(--color-primary));font-size:var(--font-size-xs);margin-left:var(--space-2);">🔗 링크</a>`
        : '';
      return `
        <div class="item">
          <span>${item.name} (${item.category})${linkHtml}</span>
          <span>${item.quantity}개</span>
        </div>
      `;
    }).join('');

    return `
      <div class="order-card" data-testid="order-card-${order.id}">
        <div class="order-header">
          <div>
            <h3 style="margin-bottom: var(--space-2);">주문 #${order.id.substring(0, 8)}</h3>
            <div class="order-meta">
              ${formatDate(order.createdAt)} · ${order.createdBy || "익명"}
            </div>
          </div>
          <div style="display:flex;gap:var(--space-2);align-items:center;">
            ${getUrgencyBadge(order.urgency)}
            ${getStatusBadge(order.status)}
          </div>
        </div>

        <div class="order-items">
          ${items}
        </div>

        ${order.notes ? `<p style="font-size:var(--font-size-sm);color:hsl(var(--color-text-secondary));margin-top:var(--space-2);">비고: ${order.notes}</p>` : ''}

        <div class="order-actions">
          ${order.status === 'pending' ? `
            <button class="btn btn-sm btn-primary" onclick="approveOrder('${order.id}')">승인</button>
            <button class="btn btn-sm btn-danger" onclick="rejectOrder('${order.id}')">거부</button>
            <button class="btn btn-sm btn-secondary" onclick="editOrder('${order.id}')">수정</button>
          ` : ''}
          ${order.status === 'approved' ? `
            <button class="btn btn-sm btn-success" onclick="completeOrder('${order.id}')">완료</button>
          ` : ''}
          <button class="btn btn-sm btn-ghost" onclick="deleteOrder('${order.id}')">삭제</button>
        </div>
      </div>
    `;
  }).join('');
}

// 주문 로드
async function loadOrders() {
  try {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    applyFilters();
  } catch (err) {
    console.error("❌ 주문 로드 오류:", err);
    alert("주문을 불러오는데 실패했습니다.");
  }
}

// 필터 적용
function applyFilters() {
  const status = filterStatus.value;
  const urgency = filterUrgency.value;

  let filtered = allOrders;

  if (status) filtered = filtered.filter(o => o.status === status);
  if (urgency) filtered = filtered.filter(o => o.urgency === urgency);

  renderOrders(filtered);
}

// 상태 변경
window.approveOrder = async (id) => {
  await updateDoc(doc(db, "orders", id), { status: "approved", updatedAt: serverTimestamp() });
  await loadOrders();
};

window.rejectOrder = async (id) => {
  await updateDoc(doc(db, "orders", id), { status: "rejected", updatedAt: serverTimestamp() });
  await loadOrders();
};

window.completeOrder = async (id) => {
  await updateDoc(doc(db, "orders", id), { status: "completed", updatedAt: serverTimestamp() });
  await loadOrders();
};

window.deleteOrder = async (id) => {
  if (!confirm("정말 삭제하시겠습니까?")) return;
  await deleteDoc(doc(db, "orders", id));
  await loadOrders();
};

// ✨ 주문 수정 기능
window.editOrder = (id) => {
  const order = allOrders.find(o => o.id === id);
  if (!order) return alert("주문 데이터를 찾을 수 없습니다.");

  // 로컬 스토리지에 주문 데이터 저장
  localStorage.setItem("editOrderData", JSON.stringify(order));

  // 수정 페이지로 이동 (orders.html)
  location.href = "orders.html?edit=" + id;
};

// 필터 이벤트
filterStatus.addEventListener("change", applyFilters);
filterUrgency.addEventListener("change", applyFilters);

// 초기 로드
loadOrders();
