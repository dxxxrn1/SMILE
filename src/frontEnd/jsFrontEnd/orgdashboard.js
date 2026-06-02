/**
 * SMILE - Organization Dashboard JavaScript
 * orgdashboardJS.js
 * Handles tabs, charts, tables, modals, form validation, and toasts.
 */

document.addEventListener("DOMContentLoaded", function () {
  initNavigation();
  initProfileDropdown();
  loadOrgSidebarProfile();
  initCharts();
  renderFunnel("all");
  renderProvinces();
  initCreateForm();
  bindQuickCreate();
  loadOrgDashboard();
  loadApplicants();
  if (document.getElementById("oppTableBody")) {
    loadOrgOpportunities();
  }
  checkUrlParams();
  bindTabInterceptors();
  loadOrgEvents();

  const logoutTag = document.getElementById("logout");
  if (logoutTag) {
    logoutTag.addEventListener("click", (e) => {
      e.preventDefault();
      logout();
    });
  }
});

async function loadOrgSidebarProfile() {
  const avatarEl = document.getElementById("sidebarInitials");
  const nameEl = document.getElementById("sidebarOrgName");
  if (!avatarEl && !nameEl) return;

  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch("/api/org/profile", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;

    const data = await res.json();
    if (!data.success || !data.profile) return;

    const org = data.profile;

    // Store in memory, NOT in localStorage!
    window.__currentUser = org;

    const orgName = org.OrgName || "My Organisation";
    const initials = orgName.slice(0, 2).toUpperCase();

    if (nameEl) nameEl.textContent = orgName;
    if (avatarEl) {
      if (org.OrgProfilePic) {
        avatarEl.innerHTML = `<img src="${org.OrgProfilePic}" alt="${orgName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        avatarEl.textContent = initials;
      }
    }
  } catch (err) {
    console.error("[SMILE] Could not load organisation sidebar profile:", err);
  }
}

/* ================================================================
   NAVIGATION
   ================================================================ */
function initNavigation() {
  const toggle = document.getElementById("mobileToggle");
  const menu = document.getElementById("navMenu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", function () {
    const open = menu.classList.toggle("nav__menu--active");
    toggle.setAttribute("aria-expanded", open);
    toggle.innerHTML = open ? "&#10005;" : "&#9776;";
  });

  document.addEventListener("click", function (e) {
    if (!toggle.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove("nav__menu--active");
      toggle.innerHTML = "&#9776;";
    }
  });
}

/* ================================================================
   PROFILE DROPDOWN
   ================================================================ */
function initProfileDropdown() {
  const btn = document.getElementById("profileBtn");
  const menu = document.getElementById("profileMenu");
  if (!btn || !menu) return;

  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    menu.classList.toggle("nav__profile-menu--active");
  });

  document.addEventListener("click", function (e) {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.remove("nav__profile-menu--active");
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") menu.classList.remove("nav__profile-menu--active");
  });
}

/* ================================================================
   TABS
   ================================================================ */
function switchTab(tabId, clickedBtn) {
  if (tabId === "applicants") {
    window.location.href = "/org/dashboard/applicants";
    return;
  }
  if (tabId === "analytics") {
    window.location.href = "/org/analytics";
    return;
  }

  // Hide all panels
  document.querySelectorAll(".tab-panel").forEach((p) => {
    p.style.display = "none";
  });

  // Deactivate all tab buttons
  document.querySelectorAll(".org-tab").forEach((b) => {
    b.classList.remove("org-tab--active");
  });

  // Show selected panel
  const panel = document.getElementById("tab-" + tabId);
  if (panel) panel.style.display = "block";

  // Activate clicked tab button (ONLY if a button was actually clicked)
  if (clickedBtn && clickedBtn.classList) {
    clickedBtn.classList.add("org-tab--active");
  }

  if (tabId === "myopps") {
    loadOrgOpportunities();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab") || "overview";
  if (tab === "analytics" || tab === "applicants") return;
  const btn = document.querySelector(`.org-tab[data-tab="${tab}"]`);
  switchTab(tab, btn);
}

function bindTabInterceptors() {
  document.querySelectorAll(".org-tab").forEach((tabLink) => {
    tabLink.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (href && href.includes("?tab=")) {
        e.preventDefault();
        const tabName = this.getAttribute("data-tab");
        switchTab(tabName, this);
        history.pushState(null, "", href);
      }
    });
  });
}

window.addEventListener("popstate", function () {
  checkUrlParams();
});

/* ================================================================
   CHARTS
   ================================================================ */
let miniChartInst = null;

function initCharts() {
  // Lazily initialized in loadOrgDashboard with actual DB timeline data
}

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      ticks: { color: "#6b7280", font: { size: 10 } },
      grid: { display: false },
    },
    y: {
      ticks: { color: "#6b7280", font: { size: 10 } },
      grid: { color: "rgba(0,0,0,0.05)" },
      beginAtZero: true,
    },
  },
};

function buildMiniChart(timeline) {
  const ctx = document.getElementById("miniChart");
  if (!ctx) return;

  if (miniChartInst) {
    miniChartInst.destroy();
  }

  const labels = [];
  const applies = [];

  const getLocalDateString = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const timelineMap = {};
  if (Array.isArray(timeline)) {
    timeline.forEach(t => {
      if (t.DateApplied) {
        let dateStr = "";
        if (typeof t.DateApplied === "string") {
          dateStr = t.DateApplied.substring(0, 10);
        } else {
          const d = new Date(t.DateApplied);
          dateStr = getLocalDateString(d);
        }
        timelineMap[dateStr] = t.Count || 0;

        try {
          const parsedD = new Date(t.DateApplied);
          const utcStr = parsedD.toISOString().substring(0, 10);
          const localStr = getLocalDateString(parsedD);
          timelineMap[utcStr] = t.Count || 0;
          timelineMap[localStr] = t.Count || 0;
        } catch (e) { }
      }
    });
  }

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const localKey = getLocalDateString(d);

    labels.push(daysOfWeek[d.getDay()]);
    applies.push(timelineMap[localKey] || 0);
  }

  miniChartInst = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Applications",
          data: applies,
          backgroundColor: "rgba(236,72,153,0.25)",
          borderColor: "#ec4899",
          borderWidth: 1.5,
          borderRadius: 4,
        },
      ],
    },
    options: {
      ...chartDefaults,
    },
  });
}

/* buildTimelineChart is handled by analyticsJS.js on /org/analytics page */

/* buildEduChart is handled by analyticsJS.js on /org/analytics page */




function renderFunnel(funnelData) {
  const el = document.getElementById("funnelList");
  if (!el) return;

  let list = [];
  if (Array.isArray(funnelData)) {
    list = funnelData.map(item => ({
      label: item.Label || item.label,
      n: item.Value !== undefined ? item.Value : (item.n || 0)
    }));
  } else if (window._dashboardData && Array.isArray(window._dashboardData.funnel)) {
    list = window._dashboardData.funnel.map(item => ({
      label: item.Label,
      n: item.Value
    }));
  }

  if (list.length === 0) {
    el.innerHTML = `<div class="loading-state">No application data yet.</div>`;
    return;
  }

  const max = Math.max(...list.map(item => item.n), 1);

  el.innerHTML = list
    .map(function (row) {
      const pct = Math.round((row.n / max) * 100);
      return `
      <div class="funnel-row">
        <span class="funnel-label">${row.label}</span>
        <div class="funnel-bar-outer">
          <div class="funnel-bar-inner" style="width:${pct}%">
            <span class="funnel-bar-pct">${pct}%</span>
          </div>
        </div>
        <span class="funnel-num">${row.n.toLocaleString()}</span>
      </div>`;
    })
    .join("");
}

function updateFunnel(val) {
  renderFunnel(val);
}

/* ================================================================
   PROVINCE BARS
   ================================================================ */


function renderProvinces(provinceData) {
  const el = document.getElementById("provList");
  if (!el) return;

  let list = [];
  if (Array.isArray(provinceData)) {
    list = provinceData.map(p => ({
      name: p.Label || p.name,
      n: p.Value !== undefined ? p.Value : (p.n || 0)
    }));
  } else if (window._dashboardData && Array.isArray(window._dashboardData.provinces)) {
    list = window._dashboardData.provinces.map(p => ({
      name: p.Label,
      n: p.Value
    }));
  }

  if (list.length === 0) {
    el.innerHTML = `<div class="loading-state">No applicant province data yet.</div>`;
    return;
  }

  const total = list.reduce((sum, item) => sum + item.n, 0) || 1;

  el.innerHTML = list.map(function (p) {
    const pct = Math.round((p.n / total) * 100);
    return `
      <div class="prov-row">
        <span class="prov-name">${p.name}</span>
        <div class="prov-bar-outer">
          <div class="prov-bar-inner" style="width:${pct}%"></div>
        </div>
        <span class="prov-num">${p.n}</span>
      </div>`;
  }).join("");
}

/* ================================================================
   OPPORTUNITIES TABLE FILTER
   ================================================================ */
function filterOppTable() {
  const query = (
    document.getElementById("oppSearch")?.value || ""
  ).toLowerCase();
  const status = document.getElementById("statusFilter")?.value || "";
  const type = document.getElementById("typeFilter")?.value || "";
  const rows = document.querySelectorAll("#oppTableBody tr");

  rows.forEach(function (row) {
    const rowText = row.textContent.toLowerCase();
    const rowStatus = row.dataset.status || "";
    const rowType = row.dataset.type || "";

    const matchQ = !query || rowText.includes(query);
    const matchStatus = !status || rowStatus === status;
    const matchType = !type || rowType === type;

    row.classList.toggle("hidden", !(matchQ && matchStatus && matchType));
  });
}



/* ================================================================
   APPLICANT MODAL
   ================================================================ */
// Redundant functions removed. Dynamic showApplicantModal(appId) and closeApplicantModal() are declared at the end of this file.


/* ================================================================
   DELETE & EDIT REAL OPPORTUNITIES FROM SQL DATABASE
   ================================================================ */
let _rowToDelete = null;
let _oppIdToDelete = null;
let _opportunitiesCache = [];

async function loadOrgOpportunities() {
  const token = getToken();
  if (!token) return;

  const tbody = document.getElementById("oppTableBody");
  if (!tbody) return;

  try {
    const res = await fetch(`/api/org/opportunities?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch opportunities");
    const data = await res.json();

    _opportunitiesCache = data.opportunities || [];

    if (_opportunitiesCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="loading-state">No opportunities posted yet. Click 'Create New' to publish one!</td></tr>`;
      return;
    }

    tbody.innerHTML = _opportunitiesCache.map(opp => {
      const parsedDate = parseSafeDate(opp.ApplicationDeadline);
      const deadline = parsedDate
        ? parsedDate.toLocaleDateString("en-ZA", { year: "numeric", month: "2-digit", day: "2-digit" })
        : "N/A";
      const statusClass = opp.Status?.toLowerCase() || "active";
      const typeClass = opp.OppType?.toLowerCase() || "workshop";

      return `
        <tr data-status="${opp.Status}" data-type="${opp.OppType}">
          <td><strong>${opp.Title}</strong></td>
          <td>
            <span class="opp-type-badge opp-type-badge--${typeClass}">${opp.OppType}</span>
          </td>
          <td>${opp.Province}</td>
          <td><span class="app-count">${opp.ApplicationCount || 0}</span></td>
          <td>${deadline}</td>
          <td>
            <span class="status-badge status-badge--${statusClass}">${opp.Status}</span>
          </td>
          <td class="table-actions">
            <button class="tbl-btn" onclick="showEditModal(${opp.OppID})">
              Edit
            </button>
            <button class="tbl-btn tbl-btn--view" onclick="
                  switchTab(
                    'applicants',
                    document.querySelector('[data-tab=applicants]'),
                  )
                ">
              Applicants
            </button>
            <button class="tbl-btn tbl-btn--danger" onclick="confirmDelete(this, ${opp.OppID})">
              Delete
            </button>
          </td>
        </tr>
      `;
    }).join("");

  } catch (err) {
    console.error("Error loading opportunities:", err);
    tbody.innerHTML = `<tr><td colspan="7" class="loading-state" style="color: #dc2626;">Failed to load opportunities. ${err.message}</td></tr>`;
  }
}

function confirmDelete(btn, oppId) {
  _rowToDelete = btn.closest("tr");
  _oppIdToDelete = oppId;
  document.getElementById("deleteModal").classList.add("modal-overlay--active");
}

function closeDeleteModal() {
  document
    .getElementById("deleteModal")
    .classList.remove("modal-overlay--active");
  _rowToDelete = null;
  _oppIdToDelete = null;
}

async function executeDelete() {
  if (!_oppIdToDelete) return;
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`/api/opportunities/${_oppIdToDelete}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || "Failed to delete opportunity");
    }

    showToast("✅ Opportunity deleted successfully", "success");

    if (_rowToDelete) {
      _rowToDelete.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      _rowToDelete.style.opacity = "0";
      _rowToDelete.style.transform = "translateX(-12px)";
      setTimeout(function () {
        if (_rowToDelete) _rowToDelete.remove();
        loadOrgDashboard();
      }, 300);
    }
  } catch (err) {
    console.error("Delete error:", err);
    showToast(`❌ ${err.message || "Failed to delete."}`, "danger");
  } finally {
    closeDeleteModal();
  }
}

function showEditModal(oppId) {
  const opp = _opportunitiesCache.find(o => o.OppID === oppId);
  if (!opp) return;

  document.getElementById("editOppID").value = opp.OppID;
  document.getElementById("editTitle").value = opp.Title || "";
  document.getElementById("editType").value = opp.OppType || "Workshop";
  document.getElementById("editStatus").value = opp.Status || "Active";
  document.getElementById("editAddress").value = opp.Address || "";
  document.getElementById("editProvince").value = opp.Province || "Gauteng";
  document.getElementById("editMax").value = opp.MaxApplicants || "";
  document.getElementById("editDesc").value = opp.Description || "";
  document.getElementById("editReq").value = opp.Requirements || "";

  if (opp.ApplicationDeadline) {
    document.getElementById("editDeadline").value = opp.ApplicationDeadline.slice(0, 10);
  } else {
    document.getElementById("editDeadline").value = "";
  }

  if (opp.StartDate) {
    document.getElementById("editStart").value = opp.StartDate.slice(0, 10);
  } else {
    document.getElementById("editStart").value = "";
  }

  document.getElementById("editLink").value = opp.ApplicationLink || "";

  document.getElementById("editOppModal").classList.add("modal-overlay--active");
}

function closeEditModal() {
  document.getElementById("editOppModal").classList.remove("modal-overlay--active");
}

async function submitOpportunityEdit(e) {
  e.preventDefault();
  const token = getToken();
  if (!token) return;

  const deadlineVal = document.getElementById("editDeadline").value;
  const todayStr = new Date().toLocaleDateString("en-CA");
  if (deadlineVal < todayStr) {
    showToast("❌ Application closing date cannot be in the past.", "danger");
    return;
  }

  const oppId = document.getElementById("editOppID").value;
  const payload = {
    title: document.getElementById("editTitle").value.trim(),
    type: document.getElementById("editType").value,
    address: document.getElementById("editAddress").value.trim(),
    province: document.getElementById("editProvince").value,
    maxApplicants: document.getElementById("editMax").value || null,
    description: document.getElementById("editDesc").value.trim(),
    requirements: document.getElementById("editReq").value.trim(),
    deadline: document.getElementById("editDeadline").value,
    startDate: document.getElementById("editStart").value || null,
    applicationLink: document.getElementById("editLink").value.trim(),
    status: document.getElementById("editStatus").value
  };

  const btn = document.getElementById("editSaveBtn");
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Saving...";

  try {
    const res = await fetch(`/api/opportunities/${oppId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.message || "Failed to save changes");
    }

    showToast("✅ Opportunity updated successfully!", "success");
    closeEditModal();
    loadOrgOpportunities();
    loadOrgDashboard(); // Refresh metrics on stats cards

  } catch (err) {
    console.error("Edit submit error:", err);
    showToast(`❌ ${err.message || "Failed to save changes."}`, "danger");
  } finally {
    btn.disabled = false;
    btn.textContent = origText;
  }
}

/* Close modals on backdrop click */
document
  .getElementById("applicantModal")
  ?.addEventListener("click", function (e) {
    if (e.target === e.currentTarget) closeApplicantModal();
  });

document.getElementById("deleteModal")?.addEventListener("click", function (e) {
  if (e.target === e.currentTarget) closeDeleteModal();
});

/* ================================================================
   APPLICANT STATUS CHANGE (inline table)
   ================================================================ */
function changeApplicantStatus(btn, newStatus) {
  const row = btn.closest("tr");
  const badge = row.querySelector(".app-status");
  const classMap = {
    Pending: "app-status--pending",
    Reviewed: "app-status--reviewed",
    Shortlisted: "app-status--shortlisted",
    Interview: "app-status--shortlisted",
    Approved: "app-status--shortlisted",
    Rejected: "app-status--rejected",
  };

  if (badge) {
    badge.className =
      "app-status " + (classMap[newStatus] || "app-status--pending");
    badge.textContent = newStatus;
  }

  row.dataset.status = newStatus;
  showToast("Status updated to " + newStatus, "success");
}

/* ================================================================
   PUBLISH DRAFT (table row)
   ================================================================ */
function publishDraft(btn) {
  const row = btn.closest("tr");
  const badge = row.querySelector(".status-badge");

  if (badge) {
    badge.className = "status-badge status-badge--active";
    badge.textContent = "Active";
  }

  row.dataset.status = "Active";
  btn.remove();
  showToast("Opportunity published!", "success");
}

/* ================================================================
   CREATE OPPORTUNITY FORM
   ================================================================ */
function initCreateForm() {
  const form = document.getElementById("createOppForm");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    handlePublish(false);
  });

  document
    .getElementById("saveDraftBtn")
    ?.addEventListener("click", function () {
      handlePublish(true);
    });
}

function handlePublish(asDraft) {
  const title = document.getElementById("newTitle");
  const type = document.getElementById("newType");
  const province = document.getElementById("newProvince");
  const deadline = document.getElementById("newDeadline");
  const desc = document.getElementById("newDesc");
  const msgEl = document.getElementById("createFormMsg");

  // Reset errors
  [title, type, province, deadline, desc].forEach(function (el) {
    el.closest(".form__group").classList.remove("form__group--error");
  });

  let valid = true;

  if (!title.value.trim()) {
    title.closest(".form__group").classList.add("form__group--error");
    valid = false;
  }

  if (!asDraft) {
    if (!type.value) {
      type.closest(".form__group").classList.add("form__group--error");
      valid = false;
    }
    if (!province.value) {
      province.closest(".form__group").classList.add("form__group--error");
      valid = false;
    }
    if (!deadline.value) {
      deadline.closest(".form__group").classList.add("form__group--error");
      valid = false;
    }
    if (!desc.value.trim()) {
      desc.closest(".form__group").classList.add("form__group--error");
      valid = false;
    }
  }

  if (!valid) {
    showFormMsg("Please fill in all required fields.", "error");
    return;
  }

  if (!asDraft) {
    const todayStr = new Date().toLocaleDateString("en-CA");
    if (deadline.value < todayStr) {
      showFormMsg("Application closing date cannot be in the past.", "error");
      showToast("Application closing date cannot be in the past.", "error");
      deadline.closest(".form__group").classList.add("form__group--error");
      return;
    }
  }

  const btn = document.getElementById(asDraft ? "saveDraftBtn" : "publishBtn");
  const orig = btn.textContent;
  btn.disabled = true;
  btn.textContent = asDraft ? "Saving..." : "Publishing...";

  // Simulate API call — replace with real fetch('/api/opportunities', {...})
  setTimeout(function () {
    btn.disabled = false;
    btn.textContent = orig;

    if (asDraft) {
      showFormMsg(
        "Draft saved successfully! You can find it in My Opportunities.",
        "success",
      );
      showToast("Draft saved", "success");
    } else {
      showFormMsg(
        "Opportunity published successfully! Youth can now discover it.",
        "success",
      );
      showToast("Opportunity published! 🎉", "success");
      resetCreateForm();
    }

    // Switch to My Opportunities after publish
    if (!asDraft) {
      setTimeout(function () {
        switchTab("myopps", document.querySelector('[data-tab="myopps"]'));
      }, 1800);
    }
  }, 1100);
}

function showFormMsg(text, type) {
  const el = document.getElementById("createFormMsg");
  if (!el) return;
  el.textContent = text;
  el.className = "create-form-msg create-form-msg--" + type;
  el.style.display = "block";
  setTimeout(function () {
    el.style.display = "none";
  }, 5000);
}

function resetCreateForm() {
  const form = document.getElementById("createOppForm");
  if (form) form.reset();
  document
    .querySelectorAll("#createOppForm .form__group--error")
    .forEach(function (g) {
      g.classList.remove("form__group--error");
    });
  const msg = document.getElementById("createFormMsg");
  if (msg) msg.style.display = "none";
}

/* ================================================================
   TOAST
   ================================================================ */
let _toastTimer;

function showToast(msg, type) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = msg;
  toast.className = "toast toast--show" + (type ? " toast--" + type : "");

  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function () {
    toast.classList.remove("toast--show");
  }, 3200);
}
/* Quick "Post Opportunity" button in page header/sidebar */
function bindQuickCreate() {
  document
    .getElementById("createOppQuickBtn")
    ?.addEventListener("click", function () {
      switchTab("create", null);
    });
}

/* NOTE: Duplicate block removed — all functions are defined above */

/* ================================================================
   LIVE DATA — ORG DASHBOARD STATS + RECENT APPLICANTS
   ================================================================ */
async function loadOrgDashboard() {
  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch(`/api/org/dashboard-stats?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    // Cache the server payload globally
    window._dashboardData = data;

    // Update stat cards
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl("stat-total-opps", data.stats.totalOpps);
    setEl("stat-total-apps", data.stats.totalApplications);
    setEl("stat-active-opps", data.stats.activeOpps);
    setEl("stat-youth-reached", data.stats.youthReached >= 1000
      ? (data.stats.youthReached / 1000).toFixed(1) + "K"
      : data.stats.youthReached);

    // Render recent applicants list
    const ul = document.getElementById("recent-applicants-list");
    if (ul) {
      if (!data.recentApplicants || data.recentApplicants.length === 0) {
        ul.innerHTML = `<li style="padding:12px 0;color:#9ca3af;font-size:13px;">No applicants yet.</li>`;
      } else {
        ul.innerHTML = data.recentApplicants.map((a, idx) => {
          const fullName = `${a.StuName} ${a.StuLastName}`;
          const initials = ((a.StuName || "").slice(0, 1) + (a.StuLastName || "").slice(0, 1)).toUpperCase() || "SA";
          const classMap = {
            Pending: "app-status--pending",
            Reviewed: "app-status--reviewed",
            Shortlisted: "app-status--shortlisted",
            Interview: "app-status--shortlisted",
            Approved: "app-status--shortlisted",
            Rejected: "app-status--rejected"
          };
          const badgeClass = classMap[a.ApplicationStatus] || "app-status--pending";

          const avatarContent = a.ProfilePicUrl
            ? `<img src="${a.ProfilePicUrl}" class="applicant-circular-avatar" style="object-fit:cover;" alt="${fullName}">`
            : `<div class="applicant-circular-avatar avatar-theme-${idx % 5}">${initials}</div>`;

          return `
            <li class="applicant-feed-item">
              <div class="applicant-feed-left">
                ${avatarContent}
                <div class="applicant-meta">
                  <span class="applicant-meta-name">${fullName}</span>
                  <span class="applicant-meta-opp">Applied to: <strong>${a.OpportunityTitle}</strong></span>
                </div>
              </div>
              <span class="app-status ${badgeClass}">${a.ApplicationStatus}</span>
            </li>
          `;
        }).join("");
      }
    }

    // Render Top Performing opportunities list dynamically
    const topList = document.getElementById("top-performing-list");
    if (topList && data.topOpportunities) {
      const maxCount = Math.max(...data.topOpportunities.map(o => o.Count), 1);
      const gradients = [
        "var(--gradient-primary)",
        "linear-gradient(90deg, #7c3aed, #a855f7)",
        "linear-gradient(90deg, #0284c7, #38bdf8)",
        "linear-gradient(90deg, #059669, #34d399)"
      ];
      topList.innerHTML = data.topOpportunities.map((o, idx) => {
        const pct = Math.round((o.Count / maxCount) * 100);
        const gradient = gradients[idx % gradients.length];
        return `
          <div class="top-opp-item">
            <div class="top-opp-item__info">
              <span class="top-opp-item__name">${o.Title}</span>
              <div class="top-opp-item__bar-wrap">
                <div class="top-opp-item__bar" style="width: ${pct}%; background: ${gradient};"></div>
              </div>
            </div>
            <span class="top-opp-item__count">${o.Count}</span>
          </div>
        `;
      }).join("");
    }

    // Render dynamic Views / Applications chart
    if (data.timeline) {
      buildMiniChart(data.timeline);
    }

  } catch (err) {
    console.error("[SMILE] loadOrgDashboard error:", err);
  }
}

/* ================================================================
   DATE PARSING UTILITY — safe, timezone-resilient
   ================================================================ */
function parseSafeDate(dateVal) {
  if (!dateVal) return null;
  try {
    let dStr = dateVal;
    if (typeof dateVal === "string") {
      dStr = dateVal.replace(/\//g, "-");
    }
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch (e) {
    return null;
  }
}

async function updateAppStatus(appId, newStatus, btn) {
  const token = getToken();
  if (!token) return;

  const originalText = btn ? btn.textContent : "";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Saving...";
  }

  try {
    const res = await fetch(`/api/org/applicants/${appId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message || "Failed to update status");
    const statusToastType = data.notificationCreated && !data.emailSent ? "danger" : "success";
    const statusToastText = data.notificationCreated
      ? (data.emailSent
        ? `Status updated to ${newStatus}. Email sent to student.`
        : `Status updated to ${newStatus}. Notification saved, but email was not sent.`)
      : `Status updated to ${newStatus}.`;

    showToast(statusToastText, statusToastType);

    // ── Instant local DOM update so UI reflects change immediately ──
    const classMap = {
      Pending: "app-status--pending",
      Reviewed: "app-status--reviewed",
      Shortlisted: "app-status--shortlisted",
      Interview: "app-status--shortlisted",
      Approved: "app-status--shortlisted",
      Rejected: "app-status--rejected"
    };

    // 1. Update status badge in table row
    const badge = document.getElementById(`status-badge-${appId}`);
    if (badge) {
      badge.className = `app-status ${classMap[newStatus] || "app-status--pending"}`;
      badge.textContent = newStatus;
    }

    // 2. Update action buttons cell
    if (badge) {
      const row = badge.closest("tr");
      if (row) {
        row.setAttribute("data-status", newStatus);
        const actionsCell = row.querySelector(".table-actions");
        if (actionsCell) {
          if (["Interview", "Approved", "Shortlisted", "Rejected"].includes(newStatus)) {
            actionsCell.innerHTML = `
              <button class="tbl-btn tbl-btn--view" onclick="showApplicantModal(${appId})">Details</button>
              <span class="tbl-btn" style="cursor:default;opacity:.75;">Student notified</span>
            `;
          } else {
            actionsCell.innerHTML = `
              <button class="tbl-btn tbl-btn--view" onclick="showApplicantModal(${appId})">Details</button>
              <button class="tbl-btn" onclick="updateAppStatus(${appId}, 'Reviewed', this)">Review</button>
              <button class="tbl-btn" onclick="updateAppStatus(${appId}, 'Interview', this)">Interview</button>
              <button class="tbl-btn" onclick="updateAppStatus(${appId}, 'Approved', this)">Approve</button>
              <button class="tbl-btn tbl-btn--danger" onclick="updateAppStatus(${appId}, 'Rejected', this)">Reject</button>
            `;
          }
        }
      }
    }

    // 3. Update local in-memory cache
    const cached = _allApplicantRows.find(r => r.AppID === appId);
    if (cached) cached.ApplicationStatus = newStatus;

    // 4. Recalculate and update quick stats strip instantly
    const total = _allApplicantRows.length;
    const pending = _allApplicantRows.filter(a => a.ApplicationStatus === "Pending").length;
    const shortlisted = _allApplicantRows.filter(a => a.ApplicationStatus === "Shortlisted").length;
    const rejected = _allApplicantRows.filter(a => a.ApplicationStatus === "Rejected").length;
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setVal("stripTotal", total);
    setVal("stripPending", pending);
    setVal("stripShortlisted", shortlisted);
    setVal("stripRejected", rejected);

    // 5. Background server-sync refresh (cache-busted)
    setTimeout(() => {
      if (document.getElementById("applicantTableBody")) {
        loadApplicants();
      } else {
        loadOrgDashboard();
      }
    }, 800);

  } catch (err) {
    console.error("[SMILE] updateAppStatus error:", err);
    if (btn) {
      btn.disabled = false;
      btn.textContent = originalText;
    }
    showToast("❌ Failed to update status.", "danger");
  }
}

/* ================================================================
   LIVE DATA — APPLICANTS TABLE
   ================================================================ */
let _allApplicantRows = []; // To store rows for client-side filtering

async function loadApplicants() {
  const token = getToken();

  const tbody = document.getElementById("applicantTableBody");
  if (!tbody) return;

  try {
    const res = await fetch(`/api/org/applicants?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch applicants");
    const data = await res.json();
    const list = data.applicants || [];

    // Store in global memory for client-side filtering
    _allApplicantRows = list;

    // Build the filters dropdown for opportunities
    const oppFilter = document.getElementById("applicantOppFilter");
    if (oppFilter) {
      // Find all unique opportunities
      const uniqueOpps = [...new Set(list.map(a => a.OpportunityTitle))];
      oppFilter.innerHTML = '<option value="">All opportunities</option>' +
        uniqueOpps.map(title => `<option value="${title}">${title}</option>`).join("");
    }

    // Update quick stats strip on applicants.html
    const total = list.length;
    const pending = list.filter(a => a.ApplicationStatus === "Pending").length;
    const shortlisted = list.filter(a => a.ApplicationStatus === "Shortlisted").length;
    const rejected = list.filter(a => a.ApplicationStatus === "Rejected").length;

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setVal("stripTotal", total);
    setVal("stripPending", pending);
    setVal("stripShortlisted", shortlisted);
    setVal("stripRejected", rejected);

    renderApplicantRows(list);

  } catch (err) {
    console.error("[SMILE] loadApplicants error:", err);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;color:#dc2626;">Failed to load applicants data.</td></tr>`;
  }
}

function renderApplicantRows(list) {
  const tbody = document.getElementById("applicantTableBody");
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;color:#9ca3af;">No applicants match your filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(a => {
    const parsedDate = parseSafeDate(a.DateApplied);
    const dateApplied = parsedDate
      ? parsedDate.toLocaleDateString("en-ZA", { year: "numeric", month: "2-digit", day: "2-digit" })
      : "N/A";
    const fullName = `${a.StuName} ${a.StuLastName}`;
    const initials = ((a.StuName || "").slice(0, 1) + (a.StuLastName || "").slice(0, 1)).toUpperCase() || "SA";


    const classMap = {
      Pending: "app-status--pending",
      Reviewed: "app-status--reviewed",
      Shortlisted: "app-status--shortlisted",
      Interview: "app-status--shortlisted",
      Approved: "app-status--shortlisted",
      Rejected: "app-status--rejected"
    };
    const badgeClass = classMap[a.ApplicationStatus] || "app-status--pending";


    let actionButtons = "";
    if (a.ApplicationStatus === "Pending" || a.ApplicationStatus === "Reviewed") {
      actionButtons = `
        <button class="tbl-btn" onclick="updateAppStatus(${a.AppID}, 'Reviewed', this)">Review</button>
        <button class="tbl-btn" onclick="updateAppStatus(${a.AppID}, 'Interview', this)">Interview</button>
        <button class="tbl-btn" onclick="updateAppStatus(${a.AppID}, 'Approved', this)">Approve</button>
        <button class="tbl-btn tbl-btn--danger" onclick="updateAppStatus(${a.AppID}, 'Rejected', this)">Reject</button>
      `;
    } else {
      actionButtons = `
        <span class="tbl-btn" style="cursor:default;opacity:.75;">Student notified</span>
      `;
    }

    return `
      <tr data-opp="${a.OpportunityTitle}" data-status="${a.ApplicationStatus}">
        <td style="display:flex;align-items:center;gap:12px;border:none;">
          ${a.ProfilePicUrl
        ? `<img src="${a.ProfilePicUrl}" class="applicant-circular-avatar" style="width:36px;height:36px;object-fit:cover;" alt="${fullName}">`
        : `<div class="applicant-circular-avatar avatar-theme-${a.AppID % 5}" style="width:36px;height:36px;font-size:12px;">${initials}</div>`}
          <div>
            <div style="font-weight:600;color:#111827">${fullName}</div>
            <div style="font-size:12px;color:#6b7280">${a.StuEmail}</div>
          </div>
        </td>
        <td><strong>${a.OpportunityTitle}</strong></td>
        <td>${a.StuProvince || "Gauteng"}</td>
        <td><span class="edu-badge">${a.StuEducationLevel || "Matric"}</span></td>
        <td>${dateApplied}</td>
        <td>
          <span class="app-status ${badgeClass}" id="status-badge-${a.AppID}">${a.ApplicationStatus}</span>
        </td>
        <td class="table-actions">
          <button class="tbl-btn tbl-btn--view" onclick="showApplicantModal(${a.AppID})">Details</button>
          ${actionButtons}
        </td>
      </tr>
    `;
  }).join("");
}

function filterApplicants() {
  const oppVal = document.getElementById("applicantOppFilter")?.value || "";
  const statusVal = document.getElementById("applicantStatusFilter")?.value || "";

  let filtered = _allApplicantRows;
  if (oppVal) {
    filtered = filtered.filter(a => a.OpportunityTitle === oppVal);
  }
  if (statusVal) {
    filtered = filtered.filter(a => a.ApplicationStatus === statusVal);
  }

  renderApplicantRows(filtered);
}

function exportCSV() {
  if (!_allApplicantRows.length) {
    showToast("No data to export", "");
    return;
  }
  const headers = ["Applicant Name", "Email", "Opportunity", "Province", "Education", "Date Applied", "Status"];
  const rows = _allApplicantRows.map(a => [
    `"${a.StuName} ${a.StuLastName}"`,
    `"${a.StuEmail}"`,
    `"${a.OpportunityTitle}"`,
    `"${a.StuProvince || 'Gauteng'}"`,
    `"${a.StuEducationLevel || 'Matric'}"`,
    `"${parseSafeDate(a.DateApplied)?.toLocaleDateString() || 'N/A'}"`,
    `"${a.ApplicationStatus}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8,"
    + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `smile_applicants_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function showApplicantModal(appId) {
  const modal = document.getElementById("applicantModal");
  const content = document.getElementById("applicantModalContent");
  if (!modal || !content) return;

  const a = _allApplicantRows.find(item => item.AppID === appId);
  if (!a) return;

  const fullName = `${a.StuName} ${a.StuLastName}`;
  const initials = ((a.StuName || "").slice(0, 1) + (a.StuLastName || "").slice(0, 1)).toUpperCase() || "SA";
  const avatarContent = a.ProfilePicUrl
    ? `<img src="${a.ProfilePicUrl}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid #f1f5f9;box-shadow:0 2px 4px rgba(0,0,0,0.05);" alt="${fullName}">`
    : `<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg, #f97316 0%, #ec4899 100%);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:1.1rem;box-shadow:0 2px 4px rgba(0,0,0,0.05);">${initials}</div>`;

  content.innerHTML = `
    <div style="padding: 24px 28px 24px 28px;">
      <!-- Modal Header -->
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;padding-bottom:18px;border-bottom:1px solid #f1f5f9;padding-right:24px;">
        ${avatarContent}
        <div>
          <h2 style="margin:0 0 4px 0;font-size:1.375rem;font-weight:700;color:#0f172a;line-height:1.2;">${fullName}</h2>
          <p style="margin:0;color:#64748b;font-size:0.875rem;">Applied to <strong style="color:#f97316;">${a.OpportunityTitle}</strong></p>
        </div>
      </div>
      
      <!-- Columns Grid Details -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
        <div style="background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #f1f5f9;box-shadow:inset 0 1px 2px rgba(0,0,0,0.01);">
          <span style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;letter-spacing:0.5px;">Email Address</span>
          <span style="font-size:0.875rem;font-weight:600;color:#334155;word-break:break-all;line-height:1.4;">${a.StuEmail}</span>
        </div>
        
        <div style="background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #f1f5f9;box-shadow:inset 0 1px 2px rgba(0,0,0,0.01);">
          <span style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;letter-spacing:0.5px;">Phone Number</span>
          <span style="font-size:0.875rem;font-weight:600;color:#334155;line-height:1.4;">${a.StuPhone || "N/A"}</span>
        </div>
        
        <div style="background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #f1f5f9;box-shadow:inset 0 1px 2px rgba(0,0,0,0.01);">
          <span style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;letter-spacing:0.5px;">Province</span>
          <span style="font-size:0.875rem;font-weight:600;color:#334155;line-height:1.4;">${a.StuProvince || "Gauteng"}</span>
        </div>
        
        <div style="background:#f8fafc;padding:12px 16px;border-radius:10px;border:1px solid #f1f5f9;box-shadow:inset 0 1px 2px rgba(0,0,0,0.01);">
          <span style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;letter-spacing:0.5px;">Education Level</span>
          <span style="font-size:0.875rem;font-weight:600;color:#334155;line-height:1.4;">
            <span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;display:inline-block;">
              ${a.StuEducationLevel || "Matric"}
            </span>
          </span>
        </div>
      </div>

      <!-- Bio / Motivation Quote Card -->
      <div style="margin-bottom:24px;">
        <span style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;letter-spacing:0.5px;">Student Bio / Motivation</span>
        <div style="font-size:0.9rem;color:#475569;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;line-height:1.6;max-height:150px;overflow-y:auto;font-style:italic;">
          ${a.StuBio || "No motivation provided."}
        </div>
      </div>

      <!-- Action Buttons Footer -->
      <div style="display:flex;justify-content:flex-end;gap:12px;border-top:1px solid #f1f5f9;padding-top:20px;">
        <button class="btn btn--outline" style="border-radius:8px;padding:8px 16px;font-weight:600;font-size:0.875rem;" onclick="closeApplicantModal()">Close</button>
        ${a.ApplicationStatus === 'Pending' || a.ApplicationStatus === 'Reviewed' ? `
          <button class="btn" style="background:#ef4444;border-color:#ef4444;color:#fff;border-radius:8px;padding:8px 20px;font-weight:600;font-size:0.875rem;transition:all 0.2s;" onclick="updateAppStatus(${a.AppID}, 'Rejected', this); closeApplicantModal();">Reject</button>
          <button class="btn" style="background:#0ea5e9;border-color:#0ea5e9;color:#fff;border-radius:8px;padding:8px 20px;font-weight:600;font-size:0.875rem;transition:all 0.2s;" onclick="updateAppStatus(${a.AppID}, 'Interview', this); closeApplicantModal();">Interview</button>
          <button class="btn" style="background:#10b981;border-color:#10b981;color:#fff;border-radius:8px;padding:8px 20px;font-weight:600;font-size:0.875rem;transition:all 0.2s;" onclick="updateAppStatus(${a.AppID}, 'Approved', this); closeApplicantModal();">Approve</button>
        ` : ''}
      </div>
    </div>
  `;

  modal.classList.add("modal-overlay--active");
}

function closeApplicantModal() {
  const modal = document.getElementById("applicantModal");
  if (modal) modal.classList.remove("modal-overlay--active");
}
document.addEventListener("DOMContentLoaded", () => {

  const tabs = document.querySelectorAll(".org-tab");
  const currentPath = window.location.pathname;

  tabs.forEach(tab => {
    const tabHref = tab.getAttribute("href");
    const tabHrefBase = tabHref ? tabHref.split('?')[0] : "";

    tab.classList.remove("org-tab--active");

    if (tabHref && (currentPath === tabHref || currentPath === tabHrefBase)) {
      tab.classList.add("org-tab--active");
    }
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("org-tab--active"));
      tab.classList.add("org-tab--active");
    });
  });

});

function isTokenExpired(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    const payload = JSON.parse(jsonPayload);
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}

function getToken() {
  const token = localStorage.getItem('token');
  if (!token || isTokenExpired(token)) {
    logout();
    return null;
  }
  return token;
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('accountType');
  localStorage.removeItem('userName');
  localStorage.removeItem('initials');
  localStorage.removeItem('profilePicUrl');
  localStorage.removeItem('profileComplete');
  localStorage.removeItem("latestScannedMarks");
  localStorage.removeItem("latestScannedSchool");
  localStorage.removeItem("orgName");
  localStorage.removeItem("orgInitials");
  localStorage.removeItem("orgProfilePic");
  window.__currentUser = null;

  fetch('/logout', { method: 'POST' })
    .catch(() => { })
    .finally(() => {
      window.location.href = '/login-page';
    });
}


window.isTokenExpired = isTokenExpired;
window.getToken = getToken;
window.logout = logout;
window.loadOrgEvents = loadOrgEvents;
window.openCreateEventModal = function () {
  window.location.href = '/org/dashboard/createOpportunity';
};

function escapeHtml(val) {
  return String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadOrgEvents() {
  const container = document.getElementById("dynamicEventsListOrg");
  if (!container) return;

  const token = getToken();
  if (!token) return;

  try {
    const res = await fetch("/api/org/opportunities", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();

    if (data.success && data.opportunities && data.opportunities.length > 0) {

      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;

      const upcomingOpps = data.opportunities.filter(opp => {
        if (!opp.ApplicationDeadline) return false;
        const deadlineStr = opp.ApplicationDeadline.slice(0, 10);
        return deadlineStr >= todayStr;
      });

      upcomingOpps.sort((a, b) => a.ApplicationDeadline.localeCompare(b.ApplicationDeadline));

      if (upcomingOpps.length > 0) {
        container.innerHTML = "";

        upcomingOpps.slice(0, 5).forEach(opp => {
          const eDate = new Date(opp.ApplicationDeadline);
          const day = eDate.getDate();
          const monthStr = eDate.toLocaleString("en-US", { month: "short" });

          const timeLabel = `Deadline: ${eDate.toLocaleDateString("en-ZA")}`;

          let colorThemeClass = "indigo"; // default
          const type = (opp.OppType || "").toLowerCase();
          if (type.includes("deadline") || type.includes("scholarship")) colorThemeClass = "rose";
          else if (type.includes("bursary")) colorThemeClass = "amber";
          else if (type.includes("internship") || type.includes("learnership")) colorThemeClass = "indigo";
          else if (type.includes("workshop") || type.includes("programme")) colorThemeClass = "emerald";

          const startYMD = opp.ApplicationDeadline.slice(0, 10).replace(/-/g, "");
          const cleanDesc = (opp.Description || "").replace(/<[^>]*>/g, "").slice(0, 450);
          const eventText = `${opp.OppType || "Program"} Deadline: ${opp.Title}`;
          const eventDetails = `SMILE Organization Program Opportunity\n\nType: ${opp.OppType}\nProvince: ${opp.Province}\n\nDescription: ${cleanDesc}`;
          const eventLocation = `${opp.Province || "National"}, South Africa`;

          const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
            `&text=${encodeURIComponent(eventText)}` +
            `&dates=${startYMD}T090000/${startYMD}T100000` +
            `&details=${encodeURIComponent(eventDetails)}` +
            `&location=${encodeURIComponent(eventLocation)}`;

          const item = document.createElement("div");
          item.className = "event-item";
          item.style.cursor = "pointer";
          item.onclick = () => window.open(googleCalUrl, "_blank");

          item.innerHTML = `
            <div class="event-date-badge event-date-badge--${colorThemeClass}">
              <span class="event-date-badge__month">${monthStr}</span>
              <span class="event-date-badge__day">${day}</span>
            </div>
            <div class="event-details" style="flex-grow: 1;">
              <span class="event-title">${escapeHtml(opp.Title)}</span>
              <span class="event-time">${timeLabel}</span>
            </div>
            <span style="font-size: 10px; color: #3b82f6; border: 1px solid #bfdbfe; background: #eff6ff; padding: 2px 6px; border-radius: 6px;">Add</span>
          `;
          container.appendChild(item);
        });
      } else {
        container.innerHTML = `<p style="padding: 12px 0; color: #9ca3af; text-align: center; font-size: 13px;">No upcoming opportunities.</p>`;
      }
    } else {
      container.innerHTML = `<p style="padding: 12px 0; color: #9ca3af; text-align: center; font-size: 13px;">No active programs found.</p>`;
    }
  } catch (err) {
    console.error("Error loading dynamically populated org opportunities:", err);
    container.innerHTML = `<p style="padding: 12px 0; color: #dc2626; text-align: center; font-size: 13px;">Failed to load schedule.</p>`;
  }
}

// Global Inactivity Auto-Logout Tracker (5 Minutes)
(function() {
  let timeoutId;
  const INACTIVITY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds

  function resetTimer() {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(logoutDueToInactivity, INACTIVITY_TIME);
  }

  function logoutDueToInactivity() {
    console.log("Logout due to 5 minutes of inactivity.");
    alert("You have been logged out due to 5 minutes of inactivity.");
    if (typeof logout === "function") {
      logout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('accountType');
      localStorage.removeItem('userName');
      localStorage.removeItem('initials');
      window.location.href = '/login-page';
    }
  }

  // Events that indicate user activity
  const activityEvents = ['mousemove', 'mousedown', 'keydown', 'keypress', 'click', 'scroll', 'touchstart'];
  activityEvents.forEach(name => {
    document.addEventListener(name, resetTimer, { passive: true });
  });

  resetTimer(); // Start the timer initially
})();
