document.addEventListener("DOMContentLoaded", function () {
    if (typeof initMobileNavigation === "function") initMobileNavigation();
    if (typeof initProfileDropdown === "function") initProfileDropdown();
    loadOpportunities();

    // Trigger filter on button click
    document.getElementById("filterBtn").addEventListener("click", () => loadOpportunities());

    // Trigger filter on sort change
    document.getElementById("sortSelect").addEventListener("change", () => loadOpportunities());
});

async function loadOpportunities() {
    const search   = document.getElementById("searchInput").value.trim();
    const type     = document.getElementById("typeFilter").value;
    const province = document.getElementById("provinceFilter").value;
    const sort     = document.getElementById("sortSelect").value;

    const params = new URLSearchParams();
    if (search)   params.append("search",   search);
    if (type)     params.append("type",     type);
    if (province) params.append("province", province);
    if (sort)     params.append("sort",     sort);

    const grid = document.getElementById("opportunitiesGrid");
    grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:3rem;color:#6b7280;">
            <p>Loading opportunities...</p>
        </div>`;

    try {
        const res  = await fetch(`/api/opportunities?${params.toString()}`);
        const data = await res.json();

        document.getElementById("resultsCount").textContent = data.count ?? 0;

        if (!data.success || data.opportunities.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:3rem;color:#6b7280;">
                    <p style="font-size:2rem;margin-bottom:1rem;">🔍</p>
                    <p style="font-weight:600;font-size:1rem;margin-bottom:.5rem;">No opportunities found</p>
                    <p style="font-size:.875rem;">Try adjusting your filters or search term.</p>
                </div>`;
            return;
        }

        grid.innerHTML = data.opportunities.map(opp => renderCard(opp)).join("");

        // Save button toggles
        grid.querySelectorAll(".opp-card__save").forEach(btn => {
            btn.addEventListener("click", function () {
                this.classList.toggle("opp-card__save--active");
            });
        });

    } catch (err) {
        console.error(err);
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:3rem;color:#dc2626;">
                <p>Failed to load opportunities. Please try again.</p>
            </div>`;
    }
}

function formatDate(dateStr) {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-ZA", {
        day: "numeric", month: "short", year: "numeric"
    });
}

function getBadgeClass(type) {
    const map = {
        scholarship: "scholarship",
        internship:  "internship",
        workshop:    "workshop",
        bursary:     "bursary",
        learnership: "learnership",
        programme:   "program",
        program:     "program"
    };
    return map[type?.toLowerCase()] ?? "scholarship";
}

function renderCard(opp) {
    const badge     = getBadgeClass(opp.OppType);
    const deadline  = formatDate(opp.ApplicationDeadline);

    return `
        <article class="opp-card opp-card--with-image">
            <div class="opp-card__image" style="background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;min-height:140px;">
                <span style="font-size:3rem;"></span>
                <span class="opp-card__badge opp-card__badge--${badge}">${opp.OppType}</span>
            </div>
            <div class="opp-card__content">
                <div class="opp-card__org-row">
                    <span class="opp-card__org">${opp.OrgName}</span>
                    <button class="opp-card__save" aria-label="Save opportunity">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </button>
                </div>
                <h3 class="opp-card__title">${opp.Title}</h3>
                <p class="opp-card__description">${opp.Description}</p>
                <div class="opp-card__meta">
                    <span class="opp-card__location">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        ${opp.Province}
                    </span>
                    <span class="opp-card__deadline">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Closes: ${deadline}
                    </span>
                </div>
                <a href="/opportunities/${opp.OppID}" class="btn btn--gradient btn--full">View Details</a>
            </div>
        </article>`;
}