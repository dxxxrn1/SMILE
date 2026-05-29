/**
 * SMILE – Premium Analytics Page JS
 * analyticsJS.js
 * Fetches live applicant and system analytics from the database and builds all interactive Chart.js graphs.
 */

let _applicantsCache = [];
let _timelineChartInst = null;
let _currentRange = 7;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    loadOrgSidebarProfile();
    loadAnalyticsData();
  });
} else {
  loadOrgSidebarProfile();
  loadAnalyticsData();
}

async function loadOrgSidebarProfile() {
  const token = localStorage.getItem("token");
  const nameEl = document.getElementById("sidebarOrgName");
  const initEl = document.getElementById("sidebarInitials");
  if (!nameEl && !initEl) return;

  const cachedName = localStorage.getItem("orgName") || localStorage.getItem("userName") || "My Organisation";
  const cachedInitials = localStorage.getItem("orgInitials") || localStorage.getItem("initials") || cachedName.slice(0, 2).toUpperCase();
  if (nameEl) nameEl.textContent = cachedName;
  if (initEl) initEl.textContent = cachedInitials;
  if (!token) return;

  try {
    const res = await fetch("/api/org/profile", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json();
    if (!data.success || !data.profile) return;

    const orgName = data.profile.OrgName || cachedName;
    const initials = orgName.slice(0, 2).toUpperCase();
    localStorage.setItem("orgName", orgName);
    localStorage.setItem("orgInitials", initials);
    if (data.profile.OrgProfilePic) localStorage.setItem("orgProfilePic", data.profile.OrgProfilePic);

    if (nameEl) nameEl.textContent = orgName;
    if (initEl) {
      if (data.profile.OrgProfilePic) {
        initEl.innerHTML = `<img src="${data.profile.OrgProfilePic}" alt="${orgName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        initEl.textContent = initials;
      }
    }
  } catch (err) {
    console.error("[SMILE Analytics] Could not load organisation sidebar profile:", err);
  }
}

/* ================================================================
   FETCH LIVE DATA FROM ANALYTICS ENDPOINT
   ================================================================ */
async function loadAnalyticsData() {
  const token = localStorage.getItem("token");
  if (!token) { window.location.href = "/login-page"; return; }

  // Set initial loading placeholders
  setEl("totalTalentCount", "...");
  setEl("kpiShortlisted", "...");
  setEl("kpiConv", "...");

  try {
    // 1. Fetch backend database metrics
    const analyticsRes = await fetch("/api/org/analytics-overview", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (analyticsRes.status === 401 || analyticsRes.status === 403) {
      window.location.href = "/login-page";
      return;
    }
    const analyticsData = await analyticsRes.json();

    // 2. Fetch standard applicants (for Bucketed Timeline over time)
    const applicantsRes = await fetch(`/api/org/applicants?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const applicantsData = await applicantsRes.json();
    _applicantsCache = Array.isArray(applicantsData.applicants) ? applicantsData.applicants : [];

    if (analyticsData.success) {
      // Set pipeline metrics
      setEl("totalTalentCount", (analyticsData.totalTalent || 0).toLocaleString());

      // Set shortlisted & conversion rates
      const totalApps = _applicantsCache.length;
      const shortlisted = _applicantsCache.filter(a => a.ApplicationStatus === "Shortlisted").length;
      const convRate = totalApps > 0 ? Math.round((shortlisted / totalApps) * 100) : 0;
      setEl("kpiShortlisted", shortlisted);
      setEl("kpiConv", convRate + "%");

      // 3. Render premium Chart.js canvasses
      renderPremiumFunnelChart(analyticsData.recruitmentFunnel);
      renderPremiumGeoChart(analyticsData.geoDensity);
      renderPremiumEduChart(analyticsData.topInstitutions);

      // 4. Render timeline chart
      buildTimelineChart(_currentRange);
    } else {
      throw new Error(analyticsData.error || "Analytics extraction failed.");
    }

  } catch (err) {
    console.error("[SMILE Analytics] Failed to load from API:", err);
    showError("Could not load talent intelligence dashboard. Please try again later.");
  }
}

/* ================================================================
   ERROR STATE
   ================================================================ */
function showError(msg) {
  setEl("totalTalentCount", "—");
  setEl("kpiShortlisted", "—");
  setEl("kpiConv", "—");
  showToast(msg, "danger");
}

/* ================================================================
   CHART.JS RENDER PIPELINES
   ================================================================ */
function renderPremiumFunnelChart(funnelData) {
  const ctx = document.getElementById("funnelChartCanvas");
  if (!ctx) return;

  const labels = funnelData.map(item => item.Status);
  const counts = funnelData.map(item => item.count);

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#cbd5e1"],
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
          labels: { color: "#6b7280", font: { size: 11 }, padding: 8 }
        }
      }
    }
  });
}

function renderPremiumGeoChart(geoData) {
  const ctx = document.getElementById("geoChartCanvas");
  if (!ctx) return;

  const labels = geoData.map(item => item.province);
  const counts = geoData.map(item => item.studentCount);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Registered Talent",
        data: counts,
        backgroundColor: "#1e40af",
        borderRadius: 6,
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: { color: "#9ca3af", font: { size: 10 } },
          grid: { display: false }
        },
        y: {
          ticks: { color: "#9ca3af", font: { size: 10 } },
          grid: { color: "rgba(0,0,0,0.04)" },
          beginAtZero: true
        }
      }
    }
  });
}

function renderPremiumEduChart(eduData) {
  const ctx = document.getElementById("eduChart");
  if (!ctx) return;

  const labels = eduData.map(item => item.school);
  const counts = eduData.map(item => item.topScholarCount);

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f97316"],
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
          labels: { color: "#6b7280", font: { size: 11 }, padding: 8 }
        }
      }
    }
  });
}

function buildTimelineChart(days) {
  const ctx = document.getElementById("timelineChart");
  if (!ctx) return;

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

  const buckets = {};
  _applicantsCache.forEach(a => {
    const d = parseSafeDate(a.DateApplied);
    if (!d) return;
    try {
      const utcKey   = d.toISOString().substring(0, 10);
      const localKey = getLocalDateString(d);
      buckets[utcKey]   = (buckets[utcKey]   || 0) + 1;
      buckets[localKey] = (buckets[localKey] || 0) + 1;
    } catch (e) { }
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
          grid: { display: false }
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
});
