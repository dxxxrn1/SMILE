/**
 * SMILE – Analytics Page JS
 * analyticsJS.js
 * Fetches live applicant data from the database and builds all charts + KPI cards.
 * No mock data — only real data from the API.
 */

let _applicantsCache = [];
let _timelineChartInst = null;
let _eduChartInst = null;
let _currentRange = 7;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    loadAnalyticsData();
  });
} else {
  loadAnalyticsData();
}

/* ================================================================
   FETCH LIVE DATA
   ================================================================ */
async function loadAnalyticsData() {
  const token = localStorage.getItem("token");
  if (!token) { window.location.href = "/login-page"; return; }

  // Show loading states on all sections
  setEl("kpiApps", "...");
  setEl("kpiYouth", "...");
  setEl("kpiShortlisted", "...");
  setEl("kpiConv", "...");

  try {
    const res = await fetch(`/api/org/applicants?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
      window.location.href = "/login-page";
      return;
    }

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    let data = {};
    try {
      data = await res.json();
    } catch (parseErr) {
      throw new Error("Could not parse server response.");
    }

    _applicantsCache = Array.isArray(data.applicants) ? data.applicants : [];

    // Org name in sidebar - Defensive parse
    let orgName = localStorage.getItem("orgName") || localStorage.getItem("userName") || "My Organisation";
    if (!orgName || orgName === "undefined" || orgName === "null") {
      orgName = "My Organisation";
    }
    const initials = ((orgName || "").slice(0, 2) || "SA").toUpperCase();
    const nameEl = document.getElementById("sidebarOrgName");
    const initEl = document.getElementById("sidebarInitials");
    if (nameEl) nameEl.textContent = orgName;
    if (initEl) initEl.textContent = initials;

    try { renderKPIs(_applicantsCache); }       catch (e) { console.error("[SMILE Analytics] renderKPIs failed:", e); }
    try { renderProvinces(_applicantsCache); }   catch (e) { console.error("[SMILE Analytics] renderProvinces failed:", e); }
    try { renderFunnel(_applicantsCache); }       catch (e) { console.error("[SMILE Analytics] renderFunnel failed:", e); }
    try { buildEduChart(_applicantsCache); }      catch (e) { console.error("[SMILE Analytics] buildEduChart failed:", e); }
    try { buildTimelineChart(_currentRange); }    catch (e) { console.error("[SMILE Analytics] buildTimelineChart failed:", e); }

  } catch (err) {
    console.error("[SMILE Analytics] Failed to load from API:", err);
    showError(`Could not load analytics data. ${err.message || "Please check your connection and try again."}`);
  }
}

/* ================================================================
   ERROR STATE
   ================================================================ */
function showError(msg) {
  setEl("kpiApps", "—");
  setEl("kpiYouth", "—");
  setEl("kpiShortlisted", "—");
  setEl("kpiConv", "—");

  const errorHTML = `<div class="loading-state" style="color:#dc2626;">${msg}</div>`;
  const provEl = document.getElementById("provList");
  const funnelEl = document.getElementById("funnelList");
  if (provEl) provEl.innerHTML = errorHTML;
  if (funnelEl) funnelEl.innerHTML = errorHTML;

  showToast("Failed to load analytics — check server connection", "danger");
}

/* ================================================================
   KPI CARDS
   ================================================================ */
function renderKPIs(applicants) {
  const total = applicants.length;
  const shortlisted = applicants.filter(a => a.ApplicationStatus === "Shortlisted").length;
  const unique = new Set(applicants.map(a => a.StuID)).size;
  const convRate = total > 0 ? Math.round((shortlisted / total) * 100) : 0;

  setEl("kpiApps", total);
  setEl("kpiYouth", unique);
  setEl("kpiShortlisted", shortlisted);
  setEl("kpiConv", convRate + "%");
}

/* ================================================================
   PROVINCE BARS
   ================================================================ */
function renderProvinces(applicants) {
  const el = document.getElementById("provList");
  if (!el) return;

  if (!applicants || applicants.length === 0) {
    el.innerHTML = `<div class="loading-state">No applicant data yet.</div>`;
    return;
  }

  const counts = {};
  applicants.forEach(a => {
    const prov = a.StuProvince || "Unknown";
    counts[prov] = (counts[prov] || 0) + 1;
  });

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const max = sorted[0]?.[1] || 1;

  el.innerHTML = sorted.map(([name, n]) => {
    const pct = Math.round((n / max) * 100);
    const capitalized = name
      ? name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
      : "Unknown";
    return `
      <div class="prov-row">
        <span class="prov-name">${capitalized}</span>
        <div class="prov-bar-outer">
          <div class="prov-bar-inner" style="width:${pct}%"></div>
        </div>
        <span class="prov-num">${n}</span>
      </div>`;
  }).join("");
}

/* ================================================================
   FUNNEL
   ================================================================ */
function renderFunnel(applicants) {
  const el = document.getElementById("funnelList");
  if (!el) return;

  if (!applicants || applicants.length === 0) {
    el.innerHTML = `<div class="loading-state">No applicant data yet.</div>`;
    return;
  }

  const total = applicants.length;
  const reviewed = applicants.filter(a =>
    ["Reviewed", "Shortlisted", "Rejected"].includes(a.ApplicationStatus)
  ).length;
  const shortlisted = applicants.filter(a => a.ApplicationStatus === "Shortlisted").length;

  const stages = [
    { label: "Applied",    n: total },
    { label: "Reviewed",   n: reviewed },
    { label: "Shortlisted", n: shortlisted },
  ];

  const max = stages[0].n || 1;

  el.innerHTML = stages.map(row => {
    const pct = max > 0 ? Math.round((row.n / max) * 100) : 0;
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
  }).join("");
}

/* ================================================================
   EDUCATION DOUGHNUT CHART
   ================================================================ */
function buildEduChart(applicants) {
  const ctx = document.getElementById("eduChart");
  if (!ctx) return;

  if (typeof Chart === "undefined") {
    console.warn("[SMILE Analytics] Chart.js not loaded — cannot render Education Chart.");
    return;
  }

  if (_eduChartInst) _eduChartInst.destroy();

  if (!applicants || applicants.length === 0) {
    const wrap = ctx.closest(".chart-canvas-wrap");
    if (wrap) wrap.innerHTML = `<div class="loading-state">No education data yet.</div>`;
    return;
  }

  const counts = {};
  applicants.forEach(a => {
    const edu = a.StuEducationLevel || "Other";
    counts[edu] = (counts[edu] || 0) + 1;
  });

  const labels = Object.keys(counts);
  const values = Object.values(counts);
  const palette = ["#f97316", "#ec4899", "#9333ea", "#2563eb", "#059669", "#0284c7", "#9ca3af"];

  _eduChartInst = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: palette.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#6b7280", font: { size: 11 }, boxWidth: 10, boxHeight: 10, padding: 10 }
        }
      }
    }
  });
}

/* ================================================================
   TIMELINE CHART — real application dates from DB
   ================================================================ */
function buildTimelineChart(days) {
  const ctx = document.getElementById("timelineChart");
  if (!ctx) return;

  if (typeof Chart === "undefined") {
    console.warn("[SMILE Analytics] Chart.js not loaded — cannot render Timeline Chart.");
    return;
  }

  if (_timelineChartInst) _timelineChartInst.destroy();

  const labels = [];
  const appCounts = [];

  const getLocalDateString = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const parseSafeDate = (dateVal) => {
    if (!dateVal) return null;
    try {
      const dStr = typeof dateVal === "string" ? dateVal.replace(/\//g, "-") : dateVal;
      const d = new Date(dStr);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) { return null; }
  };

  // Bucket real applications by date
  const buckets = {};
  _applicantsCache.forEach(a => {
    const d = parseSafeDate(a.DateApplied);
    if (!d) return;
    try {
      const utcKey   = d.toISOString().substring(0, 10);
      const localKey = getLocalDateString(d);
      buckets[utcKey]   = (buckets[utcKey]   || 0) + 1;
      buckets[localKey] = (buckets[localKey] || 0) + 1;
      if (typeof a.DateApplied === "string") {
        const rawKey = a.DateApplied.substring(0, 10).replace(/\//g, "-");
        buckets[rawKey] = (buckets[rawKey] || 0) + 1;
      }
    } catch (e) { /* ignore */ }
  });

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const localKey = getLocalDateString(d);
    const utcKey   = d.toISOString().substring(0, 10);
    labels.push(d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }));
    appCounts.push(buckets[localKey] || buckets[utcKey] || 0);
  }

  _timelineChartInst = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Applications",
          data: appCounts,
          backgroundColor: "rgba(236,72,153,0.35)",
          borderColor: "#ec4899",
          borderWidth: 1.5,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: { color: "#6b7280", font: { size: 11 }, boxWidth: 10, boxHeight: 10 }
        }
      },
      scales: {
        x: {
          ticks: { color: "#9ca3af", font: { size: 10 }, maxTicksLimit: days > 30 ? 10 : days },
          grid: { color: "rgba(0,0,0,0.04)" }
        },
        y: {
          ticks: { color: "#9ca3af", font: { size: 10 } },
          grid: { color: "rgba(0,0,0,0.04)" },
          beginAtZero: true
        }
      }
    }
  });

  const meta = document.getElementById("chartMeta");
  if (meta) meta.textContent = `Last ${days} days`;
}

/* ================================================================
   RANGE SELECTOR
   ================================================================ */
function setRange(days, btn) {
  document.querySelectorAll(".range-tab").forEach(b => b.classList.remove("range-tab--active"));
  btn.classList.add("range-tab--active");
  _currentRange = days;
  buildTimelineChart(days);
}

/* ================================================================
   UTILITIES
   ================================================================ */
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function showToast(msg, type) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = msg;
  toast.className = "toast toast--show" + (type ? " toast--" + type : "");
  setTimeout(() => toast.classList.remove("toast--show"), 3200);
}


const logoutTag = document.getElementById("logout");
logoutTag.addEventListener("click" , ()=>{
    localStorage.removeItem("token");
    localStorage.removeItem("accountType");
    localStorage.removeItem("userName");
    localStorage.removeItem("initials");
})
