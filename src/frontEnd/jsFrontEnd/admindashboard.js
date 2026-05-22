// ─────────────────────────────────────────────────────────
// admindashboard.js  —  powers the admin dashboard HTML
// ─────────────────────────────────────────────────────────

let allOrganisations = []; // cache for filtering

document.addEventListener("DOMContentLoaded", () => {
    loadOrganisations();

    // Search filter
    document.getElementById("search-input").addEventListener("input", filterTable);

    // Status filter
    document.getElementById("status-filter").addEventListener("change", filterTable);
});

// ─────────────────────────────────────────────
// FETCH all organisations from the backend
// ─────────────────────────────────────────────
async function loadOrganisations() {
    try {
        const token = localStorage.getItem("token");

        const res = await fetch("/admin/organisations", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (res.status === 401 || res.status === 403) {
            window.location.href = "/login-page";
            return;
        }

        const data = await res.json();
        allOrganisations = data.organisations;

        // Update stat cards
        document.getElementById("pending-count").textContent  = data.stats.pending;
        document.getElementById("active-count").textContent   = data.stats.active;
        document.getElementById("rejected-count").textContent = data.stats.rejected;

        renderTable(allOrganisations);

    } catch (err) {
        console.error("❌ Failed to load organisations:", err);
    }
}

// ─────────────────────────────────────────────
// RENDER table rows
// ─────────────────────────────────────────────
function renderTable(orgs) {
    const tbody = document.getElementById("org-table-body");
    tbody.innerHTML = "";

    if (orgs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding: 2rem; color: var(--color-text-muted)">
                    No organisations found.
                </td>
            </tr>`;
        return;
    }

    orgs.forEach(org => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${org.OrgName}</td>
            <td>${org.OrgId}</td>
            <td>${org.OrgEmail}</td>
            <td>${formatDate(org.DateCreated)}</td>
            <td><span class="status-badge status-${org.Status.toLowerCase()}">${org.Status}</span></td>
            <td class="action-buttons">
                <button class="btn-view"    onclick="openDetailsModal(${org.OrgId})">View</button>
                ${org.Status === "Pending" ? `
                    <button class="btn-approve" onclick="handleApprove(${org.OrgId})">Approve</button>
                    <button class="btn-reject"  onclick="handleReject(${org.OrgId})">Reject</button>
                ` : ""}
                <button class="btn-delete" onclick="handleDelete(${org.OrgId})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ─────────────────────────────────────────────
// FILTER table by search + status
// ─────────────────────────────────────────────
function filterTable() {
    const search = document.getElementById("search-input").value.toLowerCase();
    const status = document.getElementById("status-filter").value;

    const filtered = allOrganisations.filter(org => {
        const matchesSearch = org.OrgName.toLowerCase().includes(search);
        const matchesStatus = status === "all" || org.Status === status;
        return matchesSearch && matchesStatus;
    });

    renderTable(filtered);
}

// ─────────────────────────────────────────────
// APPROVE
// ─────────────────────────────────────────────
async function handleApprove(orgId) {
    if (!confirm("Approve this organisation?")) return;

    try {
        const token = localStorage.getItem("token");

        const res = await fetch(`/admin/organisations/${orgId}/approve`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            showToast("✅ Organisation approved!");
            loadOrganisations(); // refresh table
        } else {
            showToast("❌ Failed to approve.", "error");
        }
    } catch (err) {
        console.error("❌ Approve error:", err);
        showToast("❌ Network error.", "error");
    }
}

// ─────────────────────────────────────────────
// REJECT
// ─────────────────────────────────────────────
async function handleReject(orgId) {
    if (!confirm("Reject this organisation?")) return;

    try {
        const token = localStorage.getItem("token");

        const res = await fetch(`/admin/organisations/${orgId}/reject`, {
            method: "PATCH",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            showToast("✅ Organisation rejected.");
            loadOrganisations();
        } else {
            showToast("❌ Failed to reject.", "error");
        }
    } catch (err) {
        console.error("❌ Reject error:", err);
        showToast("❌ Network error.", "error");
    }
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────
async function handleDelete(orgId) {
    if (!confirm("Permanently delete this organisation? This cannot be undone.")) return;

    try {
        const token = localStorage.getItem("token");

        const res = await fetch(`/admin/organisations/${orgId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            showToast("✅ Organisation deleted.");
            loadOrganisations();
        } else {
            showToast("❌ Failed to delete.", "error");
        }
    } catch (err) {
        console.error("❌ Delete error:", err);
        showToast("❌ Network error.", "error");
    }
}

// ─────────────────────────────────────────────
// OPEN details modal
// ─────────────────────────────────────────────
async function openDetailsModal(orgId) {
    try {
        const token = localStorage.getItem("token");

        const res = await fetch(`/admin/organisations/${orgId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const data = await res.json();
        const org  = data.organisation;

        document.getElementById("modal-org-name").textContent = org.OrgName;
        document.getElementById("detail-name").textContent    = org.OrgName;
        document.getElementById("detail-reg").textContent     = org.OrgId;
        document.getElementById("detail-email").textContent   = org.OrgEmail;
        document.getElementById("detail-date").textContent    = formatDate(org.DateCreated);

        // Action buttons inside modal
        const modalActions = document.getElementById("modal-actions");
        modalActions.innerHTML = "";

        if (org.Status === "Pending") {
            modalActions.innerHTML = `
                <button class="btn-approve" onclick="handleApprove(${org.OrgId}); closeDetailsModal()">Approve</button>
                <button class="btn-reject"  onclick="handleReject(${org.OrgId});  closeDetailsModal()">Reject</button>
            `;
        } else {
            modalActions.innerHTML = `<span class="status-badge status-${org.Status.toLowerCase()}">${org.Status}</span>`;
        }

        document.getElementById("details-modal").classList.remove("hidden");

    } catch (err) {
        console.error("❌ openDetailsModal error:", err);
    }
}

// ─────────────────────────────────────────────
// CLOSE details modal
// ─────────────────────────────────────────────
function closeDetailsModal() {
    document.getElementById("details-modal").classList.add("hidden");
}

// ─────────────────────────────────────────────
// SWITCH tabs (dashboard / tickets)
// ─────────────────────────────────────────────
function switchTab(tab) {
    console.log("Switching to tab:", tab);
    // Extend this when you add the tickets section
}

// ─────────────────────────────────────────────
// TOAST notification
// ─────────────────────────────────────────────
function showToast(message, type = "success") {
    const existing = document.getElementById("toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "toast";
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: ${type === "error" ? "#EF4444" : "#10B981"};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ─────────────────────────────────────────────
// FORMAT date helper
// ─────────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-ZA", {
        year:  "numeric",
        month: "short",
        day:   "numeric"
    });
}

const logoutTag = document.getElementById("logout");
logoutTag.addEventListener("click" , ()=>{
    localStorage.removeItem("token");
    localStorage.removeItem("accountType");
    localStorage.removeItem("userName");
    localStorage.removeItem("initials");
})