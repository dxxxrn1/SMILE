document.addEventListener("DOMContentLoaded", function () {
    if (typeof initMobileNavigation === "function") initMobileNavigation();
    if (typeof initProfileDropdown === "function") initProfileDropdown();
    loadOpportunities();

    // Trigger filter on button click
    document.getElementById("filterBtn").addEventListener("click", () => loadOpportunities());

    // Trigger filter on sort change
    document.getElementById("sortSelect").addEventListener("change", () => loadOpportunities());

    const logoutTag = document.getElementById("logout");
      logoutTag.addEventListener("click" , ()=>{
          localStorage.removeItem("token");
          localStorage.removeItem("accountType");
          localStorage.removeItem("userName");
          localStorage.removeItem("initials");
    })
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

        console.log("🔍 First opp:", data.opportunities[0]); // ← ADD THIS LINE

        document.getElementById("resultsCount").textContent = data.count ?? 0;

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
    const badge    = getBadgeClass(opp.OppType);
    const deadline = formatDate(opp.ApplicationDeadline);

    // ✅ Use opp image, fallback to org profile pic, fallback to gradient
    const imageHtml = (opp.OppImageUrl || opp.OrgProfilePic)
        ? `<img src="${opp.OppImageUrl || opp.OrgProfilePic}" alt="${opp.Title}" 
               style="width:100%;height:100%;object-fit:cover;" 
               onerror="this.parentElement.style.background='var(--gradient-primary)';this.remove();">`
        : `<span style="font-size:3rem;">${getOppEmoji(opp.OppType)}</span>`;

    return `
        <article class="opp-card opp-card--with-image">
            <div class="opp-card__image" style="position:relative;overflow:hidden;min-height:160px;display:flex;align-items:center;justify-content:center;background:var(--gradient-primary);">
                ${imageHtml}
                <span class="opp-card__badge opp-card__badge--${badge}" 
                      style="position:absolute;top:12px;left:12px;z-index:2;">
                    ${opp.OppType}
                </span>
                <button class="opp-card__save" aria-label="Save opportunity"
                        style="position:absolute;top:10px;right:10px;z-index:2;background:rgba(255,255,255,0.9);border:none;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.15);">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                </button>
            </div>

            <div class="opp-card__content" style="padding:1.25rem;display:flex;flex-direction:column;gap:0.6rem;flex:1;">
                <div class="opp-card__org-row" style="display:flex;align-items:center;gap:0.5rem;">
                    ${opp.OrgProfilePic
                        ? `<img src="${opp.OrgProfilePic}" alt="${opp.OrgName}" 
                               style="width:24px;height:24px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
                        : `<div style="width:24px;height:24px;border-radius:50%;background:var(--gradient-primary);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0;">
                               ${opp.OrgName?.slice(0,2).toUpperCase()}
                           </div>`
                    }
                    <span class="opp-card__org" style="font-size:0.8rem;color:#6b7280;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${opp.OrgName}
                    </span>
                </div>

                <h3 class="opp-card__title" style="font-size:1rem;font-weight:700;color:#111827;margin:0;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                    ${opp.Title}
                </h3>

                <p class="opp-card__description" style="font-size:0.85rem;color:#6b7280;margin:0;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
                    ${opp.Description}
                </p>

                <div class="opp-card__meta" style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-top:auto;">
                    <span class="opp-card__location" style="display:flex;align-items:center;gap:4px;font-size:0.78rem;color:#6b7280;background:#f3f4f6;padding:3px 8px;border-radius:999px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                        </svg>
                        ${opp.Province}
                    </span>
                    <span class="opp-card__deadline" style="display:flex;align-items:center;gap:4px;font-size:0.78rem;color:#dc2626;background:#fef2f2;padding:3px 8px;border-radius:999px;">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Closes ${deadline}
                    </span>
                </div>

                <a href="/opportunities/${opp.OppID}" 
                   class="btn btn--gradient btn--full" 
                   style="margin-top:0.5rem;text-align:center;padding:0.6rem;border-radius:8px;font-weight:600;font-size:0.875rem;text-decoration:none;">
                    View Details
                </a>
            </div>
        </article>`;
}

// ✅ Add this helper for emoji fallback when no image exists
function getOppEmoji(type) {
    const map = {
        scholarship: "🎓",
        internship:  "💼",
        workshop:    "🛠️",
        bursary:     "📚",
        learnership: "🌱",
        programme:   "🚀",
        program:     "🚀"
    };
    return map[type?.toLowerCase()] ?? "✨";
}