/**
 * SMILE – Premium Analytics Page JS
 * analyticsJS.js
 * Fetches live applicant and system analytics from the database and builds all interactive Chart.js graphs.
 */

let _applicantsCache = [];
let _timelineChartInst = null;
let _funnelChartInst = null;
let _geoChartInst = null;
let _eduChartInst = null;
let _currentRange = 7;
let _lastOverviewStats = null;

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
  const token = getToken();
  const nameEl = document.getElementById("sidebarOrgName");
  const initEl = document.getElementById("sidebarInitials");
  if (!nameEl && !initEl) return;
  if (!token) return;

  try {
    const res = await fetch("/api/org/profile", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json();
    if (!data.success || !data.profile) return;

    const orgName = data.profile.OrgName || "My Organisation";
    const initials = orgName.slice(0, 2).toUpperCase();

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
async function loadAnalyticsData(days = _currentRange) {
  const token = getToken();
  if (!token) { window.location.href = "/login-page"; return; }

  // Set initial loading placeholders
  setEl("totalTalentCount", "...");
  setEl("kpiShortlisted", "...");
  setEl("kpiConv", "...");
  setEl("kpiReviewSpeed", "...");

  try {
    // 1. Fetch backend database metrics filtered by days
    const analyticsRes = await fetch(`/api/org/analytics-overview?days=${days}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (analyticsRes.status === 401 || analyticsRes.status === 403) {
      window.location.href = "/login-page";
      return;
    }
    const analyticsData = await analyticsRes.json();
    _lastOverviewStats = analyticsData;

    // 2. Fetch standard applicants (for Bucketed Timeline & dynamic KPI filtering)
    const applicantsRes = await fetch(`/api/org/applicants?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const applicantsData = await applicantsRes.json();
    _applicantsCache = Array.isArray(applicantsData.applicants) ? applicantsData.applicants : [];

    if (analyticsData.success) {
      // Set pipeline metrics (total registered students in the last X days)
      setEl("totalTalentCount", (analyticsData.totalTalent || 0).toLocaleString());

      // Filter local applicants by date range cutoff to dynamically calculate shortlisted & conversion rate
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const parseSafeDate = (dateVal) => {
        if (!dateVal) return null;
        try {
          const dStr = typeof dateVal === "string" ? dateVal.replace(/\//g, "-") : dateVal;
          const d = new Date(dStr);
          return isNaN(d.getTime()) ? null : d;
        } catch (e) { return null; }
      };

      const filteredApplicants = _applicantsCache.filter(a => {
        const d = parseSafeDate(a.DateApplied);
        return d && d >= cutoffDate;
      });

      // Set shortlisted & conversion rates
      const totalApps = filteredApplicants.length;
      const shortlisted = filteredApplicants.filter(a => a.ApplicationStatus === "Shortlisted").length;
      const convRate = totalApps > 0 ? Math.round((shortlisted / totalApps) * 100) : 0;
      setEl("kpiShortlisted", shortlisted);
      setEl("kpiConv", convRate + "%");

      // Set review speed dynamically calculated from DB
      const avgReviewDays = analyticsData.avgReviewDays;
      const reviewSpeedStr = avgReviewDays !== null && avgReviewDays !== undefined
        ? (Number(avgReviewDays).toFixed(1) + " Days")
        : "N/A";
      setEl("kpiReviewSpeed", reviewSpeedStr);

      // 3. Render premium Chart.js canvasses
      renderPremiumFunnelChart(analyticsData.recruitmentFunnel);
      renderPremiumGeoChart(analyticsData.geoDensity);
      renderPremiumEduChart(analyticsData.topInstitutions);

      // 4. Render timeline chart using filtered applicants
      buildTimelineChart(days, filteredApplicants);
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
  setEl("kpiReviewSpeed", "—");
  showToast(msg, "danger");
}

/* ================================================================
   CHART.JS RENDER PIPELINES
   ================================================================ */
const STATUS_COLORS = {
  "Pending": "#f97316",       // Orange
  "Reviewed": "#3b82f6",      // Blue
  "Shortlisted": "#10b981",   // Emerald Green
  "Interview": "#8b5cf6",     // Purple
  "Approved": "#06b6d4",      // Cyan
  "Rejected": "#ef4444"       // Red
};
const DEFAULT_COLOR = "#cbd5e1"; // Slate

function renderPremiumFunnelChart(funnelData) {
  const ctx = document.getElementById("funnelChartCanvas");
  if (!ctx) return;

  if (_funnelChartInst) _funnelChartInst.destroy();

  const labels = funnelData.map(item => item.Status);
  const counts = funnelData.map(item => item.count);
  const backgroundColors = labels.map(status => STATUS_COLORS[status] || DEFAULT_COLOR);

  _funnelChartInst = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: backgroundColors,
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: { color: "#6b7280", font: { size: 11 }, padding: 8 }
        }
      }
    }
  });
}

function renderPremiumGeoChart(geoData) {
  const ctx = document.getElementById("geoChartCanvas");
  if (!ctx) return;

  if (_geoChartInst) _geoChartInst.destroy();

  const labels = geoData.map(item => item.province);
  const counts = geoData.map(item => item.studentCount);

  _geoChartInst = new Chart(ctx, {
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

  if (_eduChartInst) _eduChartInst.destroy();

  const labels = eduData.map(item => item.school);
  const counts = eduData.map(item => item.topScholarCount);

  _eduChartInst = new Chart(ctx, {
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
          position: "right",
          labels: { color: "#6b7280", font: { size: 11 }, padding: 8 }
        }
      }
    }
  });
}

function buildTimelineChart(days, filteredApplicants) {
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
  filteredApplicants.forEach(a => {
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
  loadAnalyticsData(days);
}

/* ================================================================
   DATA DOWNLOAD & SPREADSHEET REPORT EXPORTS
   ================================================================ */
function downloadRawData() {
  if (!_lastOverviewStats) {
    showToast("No overview stats data available to download.", "warning");
    return;
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
    analyticsRange: _currentRange,
    overviewStats: _lastOverviewStats,
    applicants: _applicantsCache
  }, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `smile_analytics_raw_last_${_currentRange}_days.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast("Raw JSON data downloaded successfully!", "success");
}

function exportToExcel() {
  if (!_applicantsCache || !_applicantsCache.length) {
    showToast("No applicant data available to export.", "warning");
    return;
  }
  
  // Header row
  let csvContent = "Application ID,Opportunity Name,Student Name,Email,Province,Education Level,Status,Date Applied\n";
  
  // Data rows
  _applicantsCache.forEach(a => {
    const row = [
      a.AppID || "",
      `"${(a.OpportunityTitle || "N/A").replace(/"/g, '""')}"`,
      `"${((a.StuName || "") + " " + (a.StuLastName || "")).trim().replace(/"/g, '""')}"`,
      `"${(a.StuEmail || "").replace(/"/g, '""')}"`,
      `"${(a.StuProvince || "Not Specified").replace(/"/g, '""')}"`,
      `"${(a.StuEducationLevel || "Not Specified").replace(/"/g, '""')}"`,
      `"${(a.ApplicationStatus || "Pending").replace(/"/g, '""')}"`,
      `"${a.DateApplied ? new Date(a.DateApplied).toLocaleString() : ""}"`
    ].join(",");
    csvContent += row + "\n";
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `smile_recruitment_report_${_currentRange}_days.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Excel-compatible CSV report generated successfully!", "success");
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
if (logoutTag) {
  logoutTag.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
  });
}

function isTokenExpired(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
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
  const token = localStorage.getItem('token');
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
  
  fetch('/logout', { 
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .catch(() => {})
    .finally(() => {
      window.location.href = '/login-page';
    });
}

// Expose helpers globally
window.isTokenExpired = isTokenExpired;
window.getToken = getToken;
window.logout = logout;
window.setRange = setRange;
window.downloadRawData = downloadRawData;
window.exportToExcel = exportToExcel;
