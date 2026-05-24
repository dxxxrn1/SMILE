/**
 * SMILE - Organization Dashboard JavaScript
 * orgdashboardJS.js
 * Handles tabs, charts, tables, modals, form validation, and toasts.
 */

document.addEventListener("DOMContentLoaded", function () {
  initNavigation();
  initProfileDropdown();
  initCharts();
  renderFunnel("all");
  renderProvinces();
  initCreateForm();
  bindQuickCreate();
  loadOrgDashboard();
  loadApplicants();
  checkUrlParams();
  bindTabInterceptors();

  const logoutTag = document.getElementById("logout");
  logoutTag.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accountType");
    localStorage.removeItem("userName");
    localStorage.removeItem("initials");
  })
});

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
  const token = localStorage.getItem("token");
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
  const token = localStorage.getItem("token");
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
        loadOrgDashboard(); // Refresh metrics on stats cards
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
  const token = localStorage.getItem("token");
  if (!token) return;

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
  const token = localStorage.getItem("token");
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
  const token = localStorage.getItem("token");
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

    if (!res.ok) throw new Error("Failed to update status");

    showToast(`✅ Status updated to ${newStatus}`, "success");

    // ── Instant local DOM update so UI reflects change immediately ──
    const classMap = {
      Pending: "app-status--pending",
      Reviewed: "app-status--reviewed",
      Shortlisted: "app-status--shortlisted",
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
          if (newStatus === "Shortlisted" || newStatus === "Rejected") {
            actionsCell.innerHTML = `
              <button class="tbl-btn tbl-btn--view" onclick="showApplicantModal(${appId})">Details</button>
              <button class="tbl-btn" onclick="showToast('Notification sent!', 'success')">Notify</button>
            `;
          } else {
            actionsCell.innerHTML = `
              <button class="tbl-btn tbl-btn--view" onclick="showApplicantModal(${appId})">Details</button>
              <button class="tbl-btn" onclick="updateAppStatus(${appId}, 'Shortlisted', this)">Shortlist</button>
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
  const token = localStorage.getItem("token");

  // Let's also check and populate sidebar initials/name
  const orgName = localStorage.getItem("orgName") || localStorage.getItem("userName") || "SMILE Africa NGO";
  const initials = localStorage.getItem("orgInitials") || localStorage.getItem("initials") || orgName.slice(0, 2).toUpperCase();
  const avatarEl = document.getElementById("sidebarInitials");
  const nameEl = document.getElementById("sidebarOrgName");
  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl) nameEl.textContent = orgName;

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

    // Determine badge class
    const classMap = {
      Pending: "app-status--pending",
      Reviewed: "app-status--reviewed",
      Shortlisted: "app-status--shortlisted",
      Rejected: "app-status--rejected"
    };
    const badgeClass = classMap[a.ApplicationStatus] || "app-status--pending";

    // Determine actions cell contents
    let actionButtons = "";
    if (a.ApplicationStatus === "Pending" || a.ApplicationStatus === "Reviewed") {
      actionButtons = `
        <button class="tbl-btn" onclick="updateAppStatus(${a.AppID}, 'Shortlisted', this)">Shortlist</button>
        <button class="tbl-btn tbl-btn--danger" onclick="updateAppStatus(${a.AppID}, 'Rejected', this)">Reject</button>
      `;
    } else {
      actionButtons = `
        <button class="tbl-btn" onclick="showToast('Notification sent!', 'success')">Notify</button>
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

  content.innerHTML = `
    <h2 style="margin-bottom:6px;font-size:22px;font-weight:700;color:#111827;">${fullName}</h2>
    <p style="margin-bottom:20px;color:#4b5563;font-size:14px;">Applied to <strong>${a.OpportunityTitle}</strong></p>
    
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
      <div>
        <label style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;margin-bottom:4px;">Email</label>
        <div style="font-size:14px;color:#1f2937;">${a.StuEmail}</div>
      </div>
      <div>
        <label style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;margin-bottom:4px;">Phone</label>
        <div style="font-size:14px;color:#1f2937;">${a.StuPhone || "N/A"}</div>
      </div>
      <div>
        <label style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;margin-bottom:4px;">Province</label>
        <div style="font-size:14px;color:#1f2937;">${a.StuProvince || "Gauteng"}</div>
      </div>
      <div>
        <label style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;margin-bottom:4px;">Education</label>
        <div style="font-size:14px;color:#1f2937;">${a.StuEducationLevel || "Matric"}</div>
      </div>
    </div>

    <div style="margin-bottom:24px;">
      <label style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;margin-bottom:4px;">Student Bio / Motivation</label>
      <div style="font-size:14px;color:#374151;background:#f3f4f6;padding:12px;border-radius:6px;line-height:1.5;max-height:150px;overflow-y:auto;">
        ${a.StuBio || "No motivation provided."}
      </div>
    </div>

    <div style="display:flex;justify-content:flex-end;gap:10px;">
      <button class="btn btn--outline" onclick="closeApplicantModal()">Close</button>
      ${a.ApplicationStatus === 'Pending' || a.ApplicationStatus === 'Reviewed' ? `
        <button class="btn" style="background:#dc2626;border-color:#dc2626;color:#fff;" onclick="updateAppStatus(${a.AppID}, 'Rejected', this); closeApplicantModal();">Reject</button>
        <button class="btn" style="background:#059669;border-color:#059669;color:#fff;" onclick="updateAppStatus(${a.AppID}, 'Shortlisted', this); closeApplicantModal();">Shortlist</button>
      ` : ''}
    </div>
  `;

  modal.classList.add("modal-overlay--active");
}

function closeApplicantModal() {
  const modal = document.getElementById("applicantModal");
  if (modal) modal.classList.remove("modal-overlay--active");
}
