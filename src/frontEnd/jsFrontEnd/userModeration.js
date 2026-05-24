/**
 * admindashboard.js
 * SMILE Admin — User Moderation Page
 * Routes aligned to: /admin/users/*
 */

// ─── State ────────────────────────────────────────────────────────────────────

const state = {
  users:        [],
  filtered:     [],
  searchQuery:  "",
  roleFilter:   "all",
  statusFilter: "all",
};

// ─── DOM References ───────────────────────────────────────────────────────────

const tableBody    = document.getElementById("users-table-body");
const totalUsersEl = document.getElementById("total-users-count");
const suspendedEl  = document.querySelector(".stat-card:nth-child(2) .stat-value");
const searchInput  = document.querySelector(".search-input");
const [roleSelect, statusSelect] = document.querySelectorAll(".status-select");

// ─── API Helper ───────────────────────────────────────────────────────────────
// credentials: "include" sends the session cookie so verifyToken works on the server.

async function apiFetch(path, options = {}) {
  const res = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include",
    ...options,
  });

  if (res.status === 401) {
    window.location.href = "/login";
    return;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchUsers() {
  showLoadingRow();
  try {
    const [usersRes, statsRes] = await Promise.all([
      apiFetch("/admin/users"),
      apiFetch("/admin/users/stats"),
    ]);

    // Controller returns { success: true, users: [...] }
    state.users = Array.isArray(usersRes.users) ? usersRes.users : [];
    applyFilters();

    // Controller returns { success: true, stats: { total, suspended, students, orgs } }
    renderStats(statsRes.stats ?? statsRes);
  } catch (err) {
    showErrorRow(err.message);
  }
}

// ─── Filtering & Search ───────────────────────────────────────────────────────

function applyFilters() {
  const q      = state.searchQuery.toLowerCase();
  const role   = state.roleFilter;
  const status = state.statusFilter;

  state.filtered = state.users.filter((u) => {
    const matchSearch = !q ||
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q);
    const matchRole   = role   === "all" || u.role?.toLowerCase()   === role;
    const matchStatus = status === "all" || u.status?.toLowerCase() === status;
    return matchSearch && matchRole && matchStatus;
  });

  renderTable();
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderTable() {
  if (!state.filtered.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center;padding:2rem;color:var(--color-text-muted,#888)">
          No users match the current filters.
        </td>
      </tr>`;
    return;
  }

  tableBody.innerHTML = state.filtered.map(buildRow).join("");
  tableBody.querySelectorAll("[data-action]").forEach((btn) =>
    btn.addEventListener("click", handleAction)
  );
}

function buildRow(user) {
  const isSuspended = user.status === "suspended";
  const statusClass = isSuspended ? "badge-danger"  : "badge-success";
  const statusLabel = isSuspended ? "Suspended"     : "Active";
  const joined      = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "—";

  // _id comes from the SQL alias  id AS _id  in the controller
  const id = user._id;

  const toggleBtn = isSuspended
    ? `<button class="btn btn-sm btn-success" data-action="unsuspend" data-id="${id}">Unsuspend</button>`
    : `<button class="btn btn-sm btn-warning" data-action="suspend"   data-id="${id}">Suspend</button>`;

  return `
    <tr data-user-id="${id}">
      <td>
        <div class="user-cell">
          <span class="user-name">${escapeHTML(user.name  ?? "Unknown")}</span>
          <span class="user-email">${escapeHTML(user.email ?? "")}</span>
        </div>
      </td>
      <td><span class="role-badge">${capitalise(user.role ?? "—")}</span></td>
      <td>${joined}</td>
      <td><span class="badge ${statusClass}">${statusLabel}</span></td>
      <td class="actions-cell">
        ${toggleBtn}
        <button class="btn btn-sm btn-danger"  data-action="delete" data-id="${id}">Delete</button>
        <button class="btn btn-sm btn-outline" data-action="view"   data-id="${id}">View</button>
      </td>
    </tr>`;
}

function renderStats(stats) {
  if (!stats) return;
  if (totalUsersEl && stats.total     != null) totalUsersEl.textContent = stats.total;
  if (suspendedEl  && stats.suspended != null) suspendedEl.textContent  = stats.suspended;
}

// ─── Row Actions ──────────────────────────────────────────────────────────────

async function handleAction(e) {
  const { action, id } = e.currentTarget.dataset;
  if (action === "suspend")   await handleSuspend(id);
  if (action === "unsuspend") await handleUnsuspend(id);
  if (action === "delete")    await handleDelete(id);
  if (action === "view")      handleView(id);
}

async function handleSuspend(userId) {
  if (!confirm("Suspend this user? They will lose access to the platform.")) return;
  try {
    await apiFetch(`/admin/users/${userId}/suspend`, { method: "PATCH" });
    setUserStatus(userId, "suspended");
    showToast("User suspended.", "warning");
  } catch (err) {
    showToast(`Error: ${err.message}`, "danger");
  }
}

async function handleUnsuspend(userId) {
  if (!confirm("Reactivate this user's account?")) return;
  try {
    await apiFetch(`/admin/users/${userId}/unsuspend`, { method: "PATCH" });
    setUserStatus(userId, "active");
    showToast("User reactivated.", "success");
  } catch (err) {
    showToast(`Error: ${err.message}`, "danger");
  }
}

async function handleDelete(userId) {
  if (!confirm("Permanently delete this account? This cannot be undone.")) return;
  try {
    await apiFetch(`/admin/users/${userId}`, { method: "DELETE" });

    // Remove from local state immediately
    state.users    = state.users.filter((u) => u._id != userId);
    state.filtered = state.filtered.filter((u) => u._id != userId);
    renderTable();

    // Re-fetch stats from server after deletion
    const statsRes = await apiFetch("/admin/users/stats");
    renderStats(statsRes.stats ?? statsRes);

    showToast("User deleted.", "success");
  } catch (err) {
    showToast(`Error: ${err.message}`, "danger");
  }
}

function handleView(userId) {
  window.location.href = `/admin/users/${userId}`;
}

// ─── Optimistic Status Update ─────────────────────────────────────────────────

function setUserStatus(userId, newStatus) {
  // == instead of === because SQL id is a number, dataset value is a string
  const user = state.users.find((u) => u._id == userId);
  if (user) user.status = newStatus;
  applyFilters();

  if (suspendedEl) {
    suspendedEl.textContent = state.users.filter((u) => u.status === "suspended").length;
  }
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function showLoadingRow() {
  tableBody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align:center;padding:2rem">Loading users…</td>
    </tr>`;
}

function showErrorRow(message) {
  tableBody.innerHTML = `
    <tr>
      <td colspan="5" style="text-align:center;padding:2rem;color:var(--color-danger)">
        ⚠ ${escapeHTML(message)}
      </td>
    </tr>`;
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className   = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast-show"));
  setTimeout(() => {
    toast.classList.remove("toast-show");
    toast.addEventListener("transitionend", () => toast.remove(), { once: true });
  }, 3000);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/"/g,  "&quot;");
}

function capitalise(str) {
  if (!str) return "—";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function debounce(fn, delay = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

// ─── Event Listeners ─────────────────────────────────────────────────────────

searchInput?.addEventListener("input", debounce((e) => {
  state.searchQuery = e.target.value;
  applyFilters();
}));

roleSelect?.addEventListener("change", (e) => {
  state.roleFilter = e.target.value;
  applyFilters();
});

statusSelect?.addEventListener("change", (e) => {
  state.statusFilter = e.target.value;
  applyFilters();
});

document.getElementById("logout")?.addEventListener("click", async (e) => {
  e.preventDefault();
  if (!confirm("Log out of the admin panel?")) return;
  try {
    await apiFetch("/logout", { method: "POST" });
  } finally {
    window.location.href = "/login";
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", fetchUsers);