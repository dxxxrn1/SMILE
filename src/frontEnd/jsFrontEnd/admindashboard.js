// ─────────────────────────────────────────────────────────
// admindashboard.js  —  powers the admin dashboard HTML
// ─────────────────────────────────────────────────────────

let allOrganisations = []; // cache for filtering

document.addEventListener("DOMContentLoaded", () => {
    // Only load organisations if we are on the verification dashboard page
    if (document.getElementById("org-table-body")) {
        loadOrganisations();
    }

    // Search filter
    const searchInput = document.getElementById("search-input");
    if (searchInput) searchInput.addEventListener("input", filterTable);

    // Status filter
    const statusFilter = document.getElementById("status-filter");
    if (statusFilter) statusFilter.addEventListener("change", filterTable);

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
});

// ─────────────────────────────────────────────
// FETCH all organisations from the backend
// ─────────────────────────────────────────────
async function loadOrganisations() {
    try {
        const token = getToken();

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
        document.getElementById("pending-count").textContent = data.stats.pending;
        document.getElementById("active-count").textContent = data.stats.active;
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
        const token = getToken();

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
        const token = getToken();

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
        const token = getToken();

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
        const token = getToken();

        const res = await fetch(`/admin/organisations/${orgId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        const data = await res.json();
        const org = data.organisation;

        document.getElementById("modal-org-name").textContent = org.OrgName;
        document.getElementById("detail-name").textContent = org.OrgName;
        document.getElementById("detail-reg").textContent = org.OrgId;
        document.getElementById("detail-email").textContent = org.OrgEmail;
        document.getElementById("detail-date").textContent = formatDate(org.DateCreated);

        // Document section handling
        const docSection = document.getElementById("detail-document-section");
        const docLink = document.getElementById("detail-document-link");
        if (docSection && docLink) {
            if (org.OrgDocument) {
                docSection.style.display = "block";
                docLink.onclick = () => {
                    window.open(org.OrgDocument, "_blank");
                };
                const ext = org.OrgDocument.split('.').pop().toUpperCase();
                docLink.innerHTML = `📄 View Uploaded Document (${ext})`;
            } else {
                docSection.style.display = "none";
            }
        }

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
        year: "numeric",
        month: "short",
        day: "numeric"
    });
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
        .catch(() => {})
        .finally(() => {
            window.location.href = '/login-page';
        });
}

// Expose helpers globally
window.isTokenExpired = isTokenExpired;
window.getToken = getToken;
window.logout = logout;

// ─────────────────────────────────────────────────────────────────
// ADMIN SUPPORT TICKETS  —  powers userTicket.html
// ─────────────────────────────────────────────────────────────────

let allAdminTickets = [];

/**
 * Called on DOMContentLoaded when on the userTicket page
 */
function initTicketsPage() {
    const ticketBody = document.getElementById("tickets-table-body");
    if (!ticketBody) return; // not on the tickets page

    loadAdminTickets();

    // Wire search + filters
    const searchEl = document.querySelector(".search-input");
    const typeEl = document.querySelectorAll(".status-select")[0];
    const statusEl = document.querySelectorAll(".status-select")[1];

    if (searchEl) searchEl.addEventListener("input", filterAdminTickets);
    if (typeEl) typeEl.addEventListener("change", filterAdminTickets);
    if (statusEl) statusEl.addEventListener("change", filterAdminTickets);
}

document.addEventListener("DOMContentLoaded", initTicketsPage);

// ─────────────────────────────────────────────
// FETCH all tickets
// ─────────────────────────────────────────────
async function loadAdminTickets() {
    const tbody = document.getElementById("tickets-table-body");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8;">Loading tickets...</td></tr>`;

    try {
        const token = getToken();
        const res = await fetch("/admin/api/tickets", {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.status === 401 || res.status === 403) {
            window.location.href = "/login-page";
            return;
        }

        const data = await res.json();
        allAdminTickets = data.tickets || [];

        // Update stat counts
        const openEl = document.getElementById("open-tickets-count");
        const resolvedEl = document.getElementById("resolved-tickets-count");
        if (openEl) openEl.textContent = data.openCount ?? 0;
        if (resolvedEl) resolvedEl.textContent = data.resolvedCount ?? 0;

        renderAdminTickets(allAdminTickets);

    } catch (err) {
        console.error("loadAdminTickets error:", err);
        document.getElementById("tickets-table-body").innerHTML =
            `<tr><td colspan="6" style="text-align:center;padding:2rem;color:#ef4444;">Failed to load tickets.</td></tr>`;
    }
}

// ─────────────────────────────────────────────
// RENDER tickets table
// ─────────────────────────────────────────────
function renderAdminTickets(tickets) {
    const tbody = document.getElementById("tickets-table-body");
    if (!tbody) return;

    if (tickets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;">No tickets found.</td></tr>`;
        return;
    }

    tbody.innerHTML = tickets.map(t => {
        const statusBadge = t.Status === "Resolved"
            ? `<span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">✓ Resolved</span>`
            : `<span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">● Open</span>`;

        const actionBtn = t.Status === "Open"
            ? `<button class="btn-approve" onclick="openResolveModal(${t.TicketID}, decodeURIComponent('${encodeURIComponent(t.Subject).replace(/'/g, "%27")}'))">Review &amp; Resolve</button>`
            : `<span style="font-size:12px;color:#94a3b8;">Resolved</span>`;

        return `
            <tr>
                <td style="font-weight:600;">#${t.TicketID}</td>
                <td>${t.TicketType}</td>
                <td style="max-width:240px;"><strong>${escapeHtml(t.Subject)}</strong><br><span style="font-size:12px;color:#64748b;">${escapeHtml(t.SubmitterName || '—')} (${t.SubmitterType})</span></td>
                <td>${escapeHtml(t.SubmitterName || '—')}<br><span style="font-size:11px;color:#94a3b8;">${escapeHtml(t.SubmitterEmail || '')}</span></td>
                <td>${statusBadge}</td>
                <td>${actionBtn}</td>
            </tr>`;
    }).join("");
}

// ─────────────────────────────────────────────
// FILTER by search + type + status
// ─────────────────────────────────────────────
function filterAdminTickets() {
    const searchEl = document.querySelector(".search-input");
    const typeEls = document.querySelectorAll(".status-select");
    const search = searchEl ? searchEl.value.toLowerCase() : "";
    const typeVal = typeEls[0] ? typeEls[0].value : "all";
    const statusVal = typeEls[1] ? typeEls[1].value : "all";

    const filtered = allAdminTickets.filter(t => {
        const matchSearch = String(t.TicketID).includes(search) || t.Subject.toLowerCase().includes(search);
        const matchType = typeVal === "all"
            || (typeVal === "report" && t.TicketType === "Report")
            || (typeVal === "bug" && t.TicketType === "Bug / Issue");
        const matchStatus = statusVal === "all"
            || (statusVal === "open" && t.Status === "Open")
            || (statusVal === "resolved" && t.Status === "Resolved");
        return matchSearch && matchType && matchStatus;
    });

    renderAdminTickets(filtered);
}

// ─────────────────────────────────────────────
// RESOLVE MODAL
// ─────────────────────────────────────────────
function openResolveModal(ticketId, subject) {
    // Remove any existing modal
    const existing = document.getElementById("resolve-modal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "resolve-modal";
    modal.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;
        display:flex;align-items:center;justify-content:center;padding:20px;
    `;
    modal.innerHTML = `
        <div style="background:#fff;border-radius:14px;max-width:500px;width:100%;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.2);position:relative;">
            <button onclick="closeResolveModal()" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;">✕</button>
            <h3 style="margin-bottom:6px;font-size:17px;font-weight:700;color:#0f172a;">Resolve Ticket #${ticketId}</h3>
            <p style="font-size:13px;color:#64748b;margin-bottom:20px;">${escapeHtml(subject)}</p>
            <label style="display:block;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;">
                Admin Feedback <span style="color:#ef4444;">*</span>
            </label>
            <textarea id="admin-feedback-text" rows="4" placeholder="Explain how the issue was handled or what action was taken..."
                style="width:100%;padding:12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;resize:vertical;box-sizing:border-box;"></textarea>
            <div style="margin-top:16px;display:flex;gap:12px;justify-content:flex-end;">
                <button onclick="closeResolveModal()"
                    style="padding:10px 18px;border:1px solid #e2e8f0;border-radius:8px;background:#fff;color:#64748b;cursor:pointer;font-size:14px;font-weight:500;">
                    Cancel
                </button>
                <button onclick="resolveTicket(${ticketId})"
                    style="padding:10px 20px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">
                     Mark as Resolved
                </button>
            </div>
        </div>`;

    document.body.appendChild(modal);
    setTimeout(() => modal.querySelector("textarea").focus(), 50);
}

function closeResolveModal() {
    const modal = document.getElementById("resolve-modal");
    if (modal) modal.remove();
}

async function resolveTicket(ticketId) {
    const feedback = document.getElementById("admin-feedback-text").value.trim();
    if (!feedback) {
        alert("Please enter admin feedback before resolving.");
        return;
    }

    try {
        const token = getToken();
        const res = await fetch(`/admin/api/tickets/${ticketId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ adminFeedback: feedback })
        });
        const data = await res.json();

        if (data.success) {
            closeResolveModal();
            showToast("Ticket resolved and feedback sent!");
            await loadAdminTickets();
        } else {
            showToast("" + (data.message || "Failed to resolve ticket."), "error");
        }
    } catch (err) {
        console.error("resolveTicket error:", err);
        showToast("Network error.", "error");
    }
}

// ─────────────────────────────────────────────
// UTILITY: escape HTML to prevent XSS
// ─────────────────────────────────────────────
function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
