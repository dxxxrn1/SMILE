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
/* ================================================================
   TABS
   ================================================================ */
function switchTab(tabId, clickedBtn) {
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

  // Lazy-init analytics charts when that tab opens
  if (tabId === "analytics" && !window._chartsBuilt) {
    buildTimelineChart(7);
    buildEduChart();
    window._chartsBuilt = true;
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ================================================================
   CHARTS
   ================================================================ */
function initCharts() {
  buildMiniChart();
}

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: {
      ticks: { color: "#6b7280", font: { size: 11 } },
      grid: { color: "rgba(0,0,0,0.05)" },
    },
    y: {
      ticks: { color: "#6b7280", font: { size: 11 } },
      grid: { color: "rgba(0,0,0,0.05)" },
      beginAtZero: true,
    },
  },
};

/* Mini chart (Overview tab) */
function buildMiniChart() {
  const ctx = document.getElementById("miniChart");
  if (!ctx) return;

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const views = [52, 78, 61, 90, 84, 43, 55];
  const applies = [8, 14, 9, 18, 16, 7, 13];

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Views",
          data: views,
          backgroundColor: "rgba(249,115,22,0.25)",
          borderColor: "#f97316",
          borderWidth: 1.5,
          borderRadius: 3,
        },
        {
          label: "Applications",
          data: applies,
          backgroundColor: "rgba(236,72,153,0.25)",
          borderColor: "#ec4899",
          borderWidth: 1.5,
          borderRadius: 3,
        },
      ],
    },
    options: { ...chartDefaults },
  });
}

/* Timeline chart (Analytics tab) */
let timelineChartInst = null;

function buildTimelineChart(days) {
  const ctx = document.getElementById("timelineChart");
  if (!ctx) return;

  if (timelineChartInst) timelineChartInst.destroy();

  const labels = [];
  const views = [];
  const apps = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(
      d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }),
    );
    views.push(Math.round(35 + Math.random() * 90));
    apps.push(Math.round(4 + Math.random() * 22));
  }

  timelineChartInst = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Views",
          data: views,
          backgroundColor: "rgba(249,115,22,0.3)",
          borderColor: "#f97316",
          borderWidth: 1.5,
          borderRadius: 3,
        },
        {
          label: "Applications",
          data: apps,
          backgroundColor: "rgba(236,72,153,0.3)",
          borderColor: "#ec4899",
          borderWidth: 1.5,
          borderRadius: 3,
        },
      ],
    },
    options: {
      ...chartDefaults,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: "#6b7280",
            font: { size: 11 },
            boxWidth: 10,
            boxHeight: 10,
          },
        },
      },
      scales: {
        ...chartDefaults.scales,
        x: {
          ...chartDefaults.scales.x,
          ticks: {
            ...chartDefaults.scales.x.ticks,
            maxTicksLimit: days > 30 ? 10 : days,
          },
        },
      },
    },
  });
}

/* Education doughnut (Analytics tab) */
function buildEduChart() {
  const ctx = document.getElementById("eduChart");
  if (!ctx) return;

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Grade 12", "Diploma", "Undergraduate", "Certificate", "Other"],
      datasets: [
        {
          data: [38, 25, 20, 10, 7],
          backgroundColor: [
            "#f97316",
            "#ec4899",
            "#9333ea",
            "#2563eb",
            "#9ca3af",
          ],
          borderWidth: 0,
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#6b7280",
            font: { size: 11 },
            boxWidth: 10,
            boxHeight: 10,
            padding: 12,
          },
        },
      },
    },
  });
}

/* Range selector */
function setRange(days, btn) {
  document
    .querySelectorAll(".range-tab")
    .forEach((b) => b.classList.remove("range-tab--active"));
  btn.classList.add("range-tab--active");

  const label =
    days === 7 ? "last 7 days" : days === 30 ? "last 30 days" : "last 90 days";
  document.getElementById("analyticsMeta").textContent = "Showing " + label;

  // Update metrics with plausible scaled numbers
  const scale = days === 7 ? 1 : days === 30 ? 4.2 : 13;
  document.getElementById("mViews").textContent = Math.round(
    438 * scale,
  ).toLocaleString();
  document.getElementById("mApps").textContent = Math.round(
    68 * scale,
  ).toLocaleString();
  document.getElementById("mSaves").textContent = Math.round(
    151 * scale,
  ).toLocaleString();
  document.getElementById("mConv").textContent =
    Math.round(14 + Math.random() * 4) + "%";

  buildTimelineChart(days);
}

/* ================================================================
   FUNNEL
   ================================================================ */
const FUNNEL_DATA = {
  all: [
    { label: "Viewed", n: 1842 },
    { label: "Saved", n: 634 },
    { label: "Started", n: 412 },
    { label: "Submitted", n: 285 },
    { label: "Shortlisted", n: 94 },
  ],
  bootcamp: [
    { label: "Viewed", n: 520 },
    { label: "Saved", n: 180 },
    { label: "Started", n: 120 },
    { label: "Submitted", n: 83 },
    { label: "Shortlisted", n: 28 },
  ],
  digital: [
    { label: "Viewed", n: 430 },
    { label: "Saved", n: 160 },
    { label: "Started", n: 100 },
    { label: "Submitted", n: 71 },
    { label: "Shortlisted", n: 22 },
  ],
  leadership: [
    { label: "Viewed", n: 310 },
    { label: "Saved", n: 95 },
    { label: "Started", n: 65 },
    { label: "Submitted", n: 47 },
    { label: "Shortlisted", n: 15 },
  ],
};

function renderFunnel(key) {
  const data = FUNNEL_DATA[key] || FUNNEL_DATA.all;
  const max = data[0].n;
  const el = document.getElementById("funnelList");
  if (!el) return;

  el.innerHTML = data
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
const PROVINCE_DATA = [
  { name: "Gauteng", n: 124, pct: 44 },
  { name: "Western Cape", n: 58, pct: 20 },
  { name: "KZN", n: 42, pct: 15 },
  { name: "Eastern Cape", n: 28, pct: 10 },
  { name: "Limpopo", n: 19, pct: 7 },
  { name: "Other", n: 14, pct: 5 },
];

function renderProvinces() {
  const el = document.getElementById("provList");
  if (!el) return;

  el.innerHTML = PROVINCE_DATA.map(function (p) {
    return `
      <div class="prov-row">
        <span class="prov-name">${p.name}</span>
        <div class="prov-bar-outer">
          <div class="prov-bar-inner" style="width:${p.pct}%"></div>
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
   APPLICANTS TABLE FILTER
   ================================================================ */
function filterApplicants() {
  const opp = document.getElementById("applicantOppFilter")?.value || "";
  const status = document.getElementById("applicantStatusFilter")?.value || "";
  const rows = document.querySelectorAll("#applicantTableBody tr");

  rows.forEach(function (row) {
    const rowOpp = row.dataset.opp || "";
    const rowStatus = row.dataset.status || "";

    const matchOpp = !opp || rowOpp === opp;
    const matchStatus = !status || rowStatus === status;

    row.classList.toggle("hidden", !(matchOpp && matchStatus));
  });
}

/* ================================================================
   APPLICANT MODAL
   ================================================================ */
function showApplicantModal(name, opp, province, edu, email) {
  const initials = name
    .split(" ")
    .map(function (w) {
      return w[0];
    })
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const colors = ["#f97316", "#7c3aed", "#059669", "#2563eb", "#ec4899"];
  const bg = colors[name.charCodeAt(0) % colors.length];

  document.getElementById("applicantModalContent").innerHTML = `
    <div class="applicant-modal-header">
      <div class="applicant-modal-avatar" style="background:${bg}">${initials}</div>
      <div>
        <div class="applicant-modal-name">${name}</div>
        <div class="applicant-modal-email">${email}</div>
      </div>
    </div>
    <div class="applicant-modal-body">
      <div class="applicant-modal-row">
        <span class="applicant-modal-row__label">Opportunity</span>
        <span class="applicant-modal-row__value">${opp}</span>
      </div>
      <div class="applicant-modal-row">
        <span class="applicant-modal-row__label">Province</span>
        <span class="applicant-modal-row__value">${province}</span>
      </div>
      <div class="applicant-modal-row">
        <span class="applicant-modal-row__label">Education level</span>
        <span class="applicant-modal-row__value">${edu}</span>
      </div>
      <div class="applicant-modal-row">
        <span class="applicant-modal-row__label">Application date</span>
        <span class="applicant-modal-row__value">20 March 2026</span>
      </div>
      <div class="applicant-modal-row">
        <span class="applicant-modal-row__label">Status</span>
        <span class="applicant-modal-row__value"><span class="app-status app-status--pending">Pending review</span></span>
      </div>
      <div class="applicant-modal-actions">
        <button class="btn btn--gradient btn--sm" onclick="showToast('Shortlisting ${name}...','success');closeApplicantModal()">Shortlist</button>
        <button class="btn btn--outline btn--sm" onclick="showToast('Email sent to ${name}','success');closeApplicantModal()">Send Email</button>
        <button class="btn btn--sm" style="color:#dc2626;border-color:#fecaca;background:#fff" onclick="showToast('${name} moved to rejected','');closeApplicantModal()">Reject</button>
      </div>
    </div>`;

  document
    .getElementById("applicantModal")
    .classList.add("modal-overlay--active");
}

function closeApplicantModal() {
  document
    .getElementById("applicantModal")
    .classList.remove("modal-overlay--active");
}

/* ================================================================
   DELETE CONFIRM MODAL
   ================================================================ */
let _rowToDelete = null;

function confirmDelete(btn) {
  _rowToDelete = btn.closest("tr");
  document.getElementById("deleteModal").classList.add("modal-overlay--active");
}

function closeDeleteModal() {
  document
    .getElementById("deleteModal")
    .classList.remove("modal-overlay--active");
  _rowToDelete = null;
}

function executeDelete() {
  if (_rowToDelete) {
    _rowToDelete.style.transition = "opacity 0.3s ease, transform 0.3s ease";
    _rowToDelete.style.opacity = "0";
    _rowToDelete.style.transform = "translateX(-12px)";
    setTimeout(function () {
      if (_rowToDelete) _rowToDelete.remove();
    }, 300);
  }
  closeDeleteModal();
  showToast("Opportunity deleted", "");
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

/* Quick "Post Opportunity" button in page header */
// function bindQuickCreate() {
//   document
//     .getElementById("createOppQuickBtn")
//     ?.addEventListener("click", function () {
//       switchTab("create", document.querySelector('[data-tab="create"]'));
//     });
// }

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
      switchTab("create", null); // Safely switch to the create tab without needing an active sidebar link
    });
}
