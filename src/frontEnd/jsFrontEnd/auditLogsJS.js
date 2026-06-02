// ─────────────────────────────────────────────────────────
// auditLogsJS.js  —  powers the admin audit logs view
// ─────────────────────────────────────────────────────────

let allAuditLogs = []; // Cache for filtering and exporting

document.addEventListener("DOMContentLoaded", () => {
    loadAuditLogs();

    // Wire filters
    const searchInput = document.getElementById("audit-search");
    const roleFilter = document.getElementById("filter-role");
    const actionFilter = document.getElementById("filter-action");
    const csvExportBtn = document.getElementById("btn-export-csv");

    if (searchInput) searchInput.addEventListener("input", filterAuditLogs);
    if (roleFilter) roleFilter.addEventListener("change", filterAuditLogs);
    if (actionFilter) actionFilter.addEventListener("change", filterAuditLogs);
    if (csvExportBtn) csvExportBtn.addEventListener("click", exportAuditLogsToCSV);

    // Scroll Back to Top for Table Section
    const tableSection = document.querySelector(".table-section");
    const backToTopTableBtn = document.getElementById("backToTopTableBtn");
    if (tableSection && backToTopTableBtn) {
        tableSection.addEventListener("scroll", () => {
            if (tableSection.scrollTop > 50) {
                backToTopTableBtn.style.display = "inline-flex";
            } else {
                backToTopTableBtn.style.display = "none";
            }
        });
    }

    // Bind logout link
    const logoutTag = document.getElementById("logout");
    if (logoutTag) {
        logoutTag.addEventListener("click", (e) => {
            e.preventDefault();
            logout();
        });
    }
});

// ─────────────────────────────────────────────
// FETCH all audit logs
// ─────────────────────────────────────────────
async function loadAuditLogs() {
    const tbody = document.getElementById("audit-table-body");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8;">Loading audit logs...</td></tr>`;

    try {
        const token = getToken();
        if (!token) return;

        const res = await fetch("/admin/api/audit-logs", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (res.status === 401 || res.status === 403) {
            window.location.href = "/login-page";
            return;
        }

        const data = await res.json();
        allAuditLogs = data.logs || [];

        // Update stats
        document.getElementById("total-logs-count").textContent = allAuditLogs.length;
        document.getElementById("newsletter-logs-count").textContent = 
            allAuditLogs.filter(log => log.Action === "BROADCAST_NEWSLETTER").length;

        renderAuditTable(allAuditLogs);

    } catch (err) {
        console.error("loadAuditLogs error:", err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#ef4444;">Failed to load audit logs.</td></tr>`;
    }
}

// ─────────────────────────────────────────────
// RENDER audit table
// ─────────────────────────────────────────────
function renderAuditTable(logs) {
    const tbody = document.getElementById("audit-table-body");
    if (!tbody) return;

    if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8;">No audit logs found.</td></tr>`;
        return;
    }

    tbody.innerHTML = logs.map(log => {
        const actionBadge = getActionBadgeStyle(log.Action);
        return `
            <tr>
                <td style="font-weight:600; font-family: monospace; font-size:12.5px; color:#475569;">${formatDateTime(log.Timestamp)}</td>
                <td style="font-weight:500;">${escapeHtml(log.UserEmail || 'System / Task')}</td>
                <td><span style="font-size:11.5px; text-transform:capitalize; font-weight:600; color:#64748b;">${escapeHtml(log.UserType || 'system')}</span></td>
                <td>${actionBadge}</td>
                <td style="max-width:350px; font-size:13px; color:#334155; line-height:1.4;">${escapeHtml(log.Details || '')}</td>
                <td style="font-family: monospace; font-size:12px; color:#64748b;">${escapeHtml(log.IpAddress || '—')}</td>
            </tr>`;
    }).join("");
}

// ─────────────────────────────────────────────
// FILTER audit logs
// ─────────────────────────────────────────────
function filterAuditLogs() {
    const searchVal = document.getElementById("audit-search").value.toLowerCase();
    const roleVal = document.getElementById("filter-role").value;
    const actionVal = document.getElementById("filter-action").value;

    const filtered = allAuditLogs.filter(log => {
        const matchesSearch = 
            (log.Action && log.Action.toLowerCase().includes(searchVal)) ||
            (log.UserEmail && log.UserEmail.toLowerCase().includes(searchVal)) ||
            (log.Details && log.Details.toLowerCase().includes(searchVal)) ||
            (log.IpAddress && log.IpAddress.toLowerCase().includes(searchVal));

        const matchesRole = roleVal === "all" || (log.UserType && log.UserType.toLowerCase() === roleVal);
        const matchesAction = actionVal === "all" || log.Action === actionVal;

        return matchesSearch && matchesRole && matchesAction;
    });

    renderAuditTable(filtered);
}

// ─────────────────────────────────────────────
// EXPORT logs to CSV
// ─────────────────────────────────────────────
function exportAuditLogsToCSV() {
    const searchVal = document.getElementById("audit-search").value.toLowerCase();
    const roleVal = document.getElementById("filter-role").value;
    const actionVal = document.getElementById("filter-action").value;

    const filtered = allAuditLogs.filter(log => {
        const matchesSearch = 
            (log.Action && log.Action.toLowerCase().includes(searchVal)) ||
            (log.UserEmail && log.UserEmail.toLowerCase().includes(searchVal)) ||
            (log.Details && log.Details.toLowerCase().includes(searchVal)) ||
            (log.IpAddress && log.IpAddress.toLowerCase().includes(searchVal));

        const matchesRole = roleVal === "all" || (log.UserType && log.UserType.toLowerCase() === roleVal);
        const matchesAction = actionVal === "all" || log.Action === actionVal;

        return matchesSearch && matchesRole && matchesAction;
    });

    if (filtered.length === 0) {
        showToast("No data to export", "error");
        return;
    }

    const headers = ["Timestamp", "Operator Email", "Operator Role", "Action Triggered", "Activity Details", "IP Address"];
    const rows = filtered.map(log => [
        formatDateTime(log.Timestamp),
        log.UserEmail || 'System / Task',
        log.UserType || 'system',
        log.Action,
        log.Details || '',
        log.IpAddress || '—'
    ]);

    // Build CSV content
    const csvContent = [
        headers.map(h => `"${h.replace(/"/g, '""')}"`).join(","),
        ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const timestampStr = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "_");

    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `smile_audit_report_${timestampStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Audit logs exported successfully!");
}

// ─────────────────────────────────────────────
// HELPERS & UTILITIES
// ─────────────────────────────────────────────
function getActionBadgeStyle(action) {
    let style = "";
    let label = action.replace(/_/g, " ");

    if (action === "APPROVE_ORGANISATION" || action === "UNSUSPEND_USER") {
        style = "background:#e6f4ea; color:#137333; border:1px solid #ceead6; padding:4px 10px; border-radius:12px; font-size:11.5px; font-weight:600; white-space:nowrap;";
    } else if (action === "REJECT_ORGANISATION" || action === "SUSPEND_USER") {
        style = "background:#fef7e0; color:#b06000; border:1px solid #fde293; padding:4px 10px; border-radius:12px; font-size:11.5px; font-weight:600; white-space:nowrap;";
    } else if (action.startsWith("DELETE")) {
        style = "background:#fce8e6; color:#c5221f; border:1px solid #fad2cf; padding:4px 10px; border-radius:12px; font-size:11.5px; font-weight:600; white-space:nowrap;";
    } else if (action === "RESOLVE_TICKET") {
        style = "background:#e8f0fe; color:#1a73e8; border:1px solid #d2e3fc; padding:4px 10px; border-radius:12px; font-size:11.5px; font-weight:600; white-space:nowrap;";
    } else if (action === "BROADCAST_NEWSLETTER") {
        style = "background:#f3e8ff; color:#6b21a8; border:1px solid #e9d5ff; padding:4px 10px; border-radius:12px; font-size:11.5px; font-weight:600; white-space:nowrap;";
    } else {
        style = "background:#f1f3f4; color:#3c4043; border:1px solid #dadce0; padding:4px 10px; border-radius:12px; font-size:11.5px; font-weight:600; white-space:nowrap;";
    }

    return `<span style="${style}">${label}</span>`;
}

function formatDateTime(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.getFullYear() + "-" + 
           String(d.getMonth() + 1).padStart(2, '0') + "-" + 
           String(d.getDate()).padStart(2, '0') + " " + 
           String(d.getHours()).padStart(2, '0') + ":" + 
           String(d.getMinutes()).padStart(2, '0') + ":" + 
           String(d.getSeconds()).padStart(2, '0');
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
    
    fetch('/logout', { method: 'POST' })
        .catch(() => {})
        .finally(() => {
            window.location.href = '/login-page';
        });
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.style.background = type === "error" ? "#EF4444" : "#10B981";
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(100px)";
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
