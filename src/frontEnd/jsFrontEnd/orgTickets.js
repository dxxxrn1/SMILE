/**
 * SMILE Org Tickets JS
 * Handles ticket submission and history for organisation users
 */

document.addEventListener("DOMContentLoaded", () => {
    loadOrgTickets();
});

async function loadOrgTickets() {
    const tbody = document.getElementById("otkt-table-body");
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="otkt-empty">Loading...</td></tr>`;

    try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/tickets/my", {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data.success || data.tickets.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="otkt-empty">No tickets submitted yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.tickets.map(t => {
            const date = new Date(t.DateCreated).toLocaleDateString("en-ZA", {
                day: "2-digit", month: "short", year: "numeric"
            });
            const badge = t.Status === "Resolved"
                ? `<span class="otkt-badge otkt-badge--resolved">✓ Resolved</span>`
                : `<span class="otkt-badge otkt-badge--open">● Open</span>`;
            const feedback = t.AdminFeedback
                ? `<p class="otkt-feedback">💬 ${t.AdminFeedback}</p>`
                : `<span style="color:#cbd5e1;font-size:12px;">—</span>`;

            return `
                <tr>
                    <td style="font-weight:600;color:#f97316;">#${t.TicketID}</td>
                    <td>${t.TicketType}</td>
                    <td style="max-width:200px;">${t.Subject}</td>
                    <td>${badge}</td>
                    <td>${feedback}</td>
                    <td style="white-space:nowrap;color:#94a3b8;">${date}</td>
                </tr>`;
        }).join("");

    } catch (err) {
        console.error("Error loading org tickets:", err);
        document.getElementById("otkt-table-body").innerHTML =
            `<tr><td colspan="6" class="otkt-empty" style="color:#dc2626;">Could not load tickets.</td></tr>`;
    }
}

async function submitOrgTicket() {
    const ticketType  = document.getElementById("otktType").value.trim();
    const subject     = document.getElementById("otktSubject").value.trim();
    const description = document.getElementById("otktDesc").value.trim();

    if (!ticketType || !subject || !description) {
        showOtktToast("Please fill in all fields before submitting.", "error");
        return;
    }

    const btn = document.getElementById("otktSubmitBtn");
    btn.disabled = true;
    btn.innerHTML = `<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"></path></svg> Submitting...`;

    try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/tickets", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ ticketType, subject, description })
        });
        const data = await res.json();

        if (data.success) {
            showOtktToast(`Ticket #${data.ticketId} submitted! We'll review it shortly.`, "success");
            document.getElementById("otktType").value    = "";
            document.getElementById("otktSubject").value = "";
            document.getElementById("otktDesc").value    = "";
            await loadOrgTickets();
        } else {
            showOtktToast(data.message || "Failed to submit ticket.", "error");
        }
    } catch (err) {
        console.error("Org ticket submit error:", err);
        showOtktToast("Server error. Please try again.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Submit Ticket`;
    }
}

function showOtktToast(message, type = "success") {
    const toast = document.getElementById("otktToast");
    if (!toast) return;
    toast.className = `otkt-toast otkt-toast--${type}`;
    toast.textContent = message;
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 4000);
}

// Expose for HTML onclick
window.loadOrgTickets   = loadOrgTickets;
window.submitOrgTicket  = submitOrgTicket;
