// State
let organisations = [];
let filteredOrganisations = [];

// DOM Elements
const tableBody = document.getElementById("org-table-body");
const searchInput = document.getElementById("search-input");
const statusFilter = document.getElementById("status-filter");
const detailsModal = document.getElementById("details-modal");

document.addEventListener("DOMContentLoaded", () => {
  fetchOrganisations();

  // Listeners for filters
  searchInput.addEventListener("input", filterOrganisations);
  statusFilter.addEventListener("change", filterOrganisations);
});

// Fetch Data from Backend
async function fetchOrganisations() {
  try {
    const response = await fetch("/api/admin/organizations");
    if (!response.ok) throw new Error("API not ready");

    organisations = await response.json();
  } catch (error) {
    console.warn("Backend not connected yet. Loading Demo Data...");
    loadMockData(); // Fallback so you can see it working
  }

  filteredOrganisations = [...organisations];
  updateStats();
  renderTable();
}

function filterOrganisations() {
  const term = searchInput.value.toLowerCase();
  const status = statusFilter.value;

  filteredOrganisations = organisations.filter((org) => {
    const matchesSearch = org.OrgName.toLowerCase().includes(term);
    const matchesStatus = status === "all" || org.Status === status;
    return matchesSearch && matchesStatus;
  });

  renderTable();
}

function renderTable() {
  tableBody.innerHTML = filteredOrganisations
    .map((org) => {
      const isPending = org.Status === "Pending";
      return `
            <tr>
                <td><strong>${org.OrgName}</strong></td>
                <td>${org.RegNumber}</td>
                <td>${org.EmailDomain}</td>
                <td>${formatDate(org.DateJoined)}</td>
                <td><span class="status-badge ${org.Status.toLowerCase()}">${org.Status}</span></td>
                <td>
                    <button class="btn btn-secondary" onclick="viewDetails(${org.OrgId})">View Details</button>
                    ${
                      isPending
                        ? `
                        <button class="btn btn--gradient" style="margin-left:8px;" onclick="updateStatus(${org.OrgId}, 'Active')">Approve</button>
                        <button class="btn btn-danger" style="margin-left:8px;" onclick="updateStatus(${org.OrgId}, 'Rejected')">Reject</button>
                    `
                        : ""
                    }
                </td>
            </tr>
        `;
    })
    .join("");
}

function viewDetails(orgId) {
  const org = organisations.find((o) => o.OrgId === orgId);
  if (!org) return;

  document.getElementById("modal-org-name").textContent = org.OrgName;
  document.getElementById("detail-name").textContent = org.OrgName;
  document.getElementById("detail-reg").textContent = org.RegNumber;
  document.getElementById("detail-email").textContent = org.EmailDomain;
  document.getElementById("detail-date").textContent = formatDate(
    org.DateJoined,
  );

  const actions = document.getElementById("modal-actions");
  if (org.Status === "Pending") {
    // Uses your specific SMILE Gradient button!
    actions.innerHTML = `
            <button class="btn btn-secondary" onclick="closeDetailsModal()">Close</button>
            <button class="btn btn-danger" onclick="updateStatus(${orgId}, 'Rejected')">Reject</button>
            <button class="btn btn--gradient" onclick="updateStatus(${orgId}, 'Active')">Approve Organisation</button>
        `;
  } else {
    actions.innerHTML = `<button class="btn btn-secondary" onclick="closeDetailsModal()">Close</button>`;
  }

  detailsModal.classList.remove("hidden");
}

function closeDetailsModal() {
  detailsModal.classList.add("hidden");
}

// API Call to Approve/Reject
async function updateStatus(orgId, newStatus) {
  if (!confirm(`Are you sure you want to change this status to ${newStatus}?`))
    return;

  try {
    const response = await fetch(`/api/admin/organizations/${orgId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    //( we are using mock data), update UI for testing
    const orgIndex = organisations.findIndex((o) => o.OrgId === orgId);
    if (orgIndex !== -1) {
      organisations[orgIndex].Status = newStatus;
      filterOrganisations();
      updateStats();
      closeDetailsModal();
      alert(
        `Organisation successfully ${newStatus === "Active" ? "Approved" : "Rejected"}!`,
      );
    }
  } catch (err) {
    console.error("Error updating:", err);
  }
}

function updateStats() {
  const counts = { Pending: 0, Active: 0, Rejected: 0 };
  organisations.forEach((org) => {
    if (counts[org.Status] !== undefined) counts[org.Status]++;
  });

  document.getElementById("pending-count").textContent = counts.Pending;
  document.getElementById("active-count").textContent = counts.Active;
  document.getElementById("rejected-count").textContent = counts.Rejected;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Dummy Data Generator
function loadMockData() {
  organisations = [
    {
      OrgId: 1,
      OrgName: "Tech Solutions SA",
      RegNumber: "2020/123456/07",
      EmailDomain: "techsolutions.co.za",
      DateJoined: "2026-05-01",
      Status: "Pending",
    },
    {
      OrgId: 2,
      OrgName: "Youth Empowerment Foundation",
      RegNumber: "2019/789012/08",
      EmailDomain: "youthempower.org.za",
      DateJoined: "2026-04-15",
      Status: "Active",
    },
    {
      OrgId: 3,
      OrgName: "Digital Learning Hub",
      RegNumber: "2018/901234/08",
      EmailDomain: "digitallearn.edu.za",
      DateJoined: "2026-05-05",
      Status: "Rejected",
    },
    {
      OrgId: 4,
      OrgName: "Cape Town Innovators",
      RegNumber: "2022/567890/07",
      EmailDomain: "ctinnovate.co.za",
      DateJoined: "2026-05-08",
      Status: "Pending",
    },
  ];
}
